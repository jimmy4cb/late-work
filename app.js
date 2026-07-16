const STORAGE_KEYS = {
  students: 'agoro.students',
  voteheads: 'agoro.voteheads',
  overrides: 'agoro.overrides',
  invoices: 'agoro.invoices',
  payments: 'agoro.payments'
};

const demoStudents = [
  { admNo: 'AS-001', name: 'Akinyi Otieno', className: 'Form 3', stream: 'East', house: 'Raila', currentBalance: 0 },
  { admNo: 'AS-002', name: 'Brian Ouma', className: 'Form 4', stream: 'West', house: 'Kenyatta', currentBalance: 0 }
];

const demoVoteheads = [
  { id: 'tuition', name: 'Tuition', defaultAmount: 14000 },
  { id: 'boarding', name: 'Boarding', defaultAmount: 9000 },
  { id: 'uniform', name: 'Uniform', defaultAmount: 4500 }
];

let state = {
  students: [],
  voteheads: [],
  overrides: [],
  invoices: [],
  payments: []
};

function initializeState() {
  const students = JSON.parse(localStorage.getItem(STORAGE_KEYS.students) || 'null');
  const voteheads = JSON.parse(localStorage.getItem(STORAGE_KEYS.voteheads) || 'null');
  const overrides = JSON.parse(localStorage.getItem(STORAGE_KEYS.overrides) || 'null');
  const invoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.invoices) || 'null');
  const payments = JSON.parse(localStorage.getItem(STORAGE_KEYS.payments) || 'null');

  state = {
    students: students || demoStudents.map(s => ({ ...s })),
    voteheads: voteheads || demoVoteheads.map(v => ({ ...v })),
    overrides: overrides || [],
    invoices: invoices || [],
    payments: payments || []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(state.students));
  localStorage.setItem(STORAGE_KEYS.voteheads, JSON.stringify(state.voteheads));
  localStorage.setItem(STORAGE_KEYS.overrides, JSON.stringify(state.overrides));
  localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(state.invoices));
  localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(state.payments));
}

function formatCurrency(value) {
  return `KES ${Number(value).toLocaleString()}`;
}

function getStudent(admNo) {
  return state.students.find(student => student.admNo === admNo);
}

function calculateInvoiceTotal(student) {
  return state.voteheads.reduce((sum, votehead) => {
    const override = state.overrides.find(override =>
      override.voteheadId === votehead.id &&
      override.className === student.className &&
      override.stream === student.stream
    );

    return sum + (override ? override.amount : votehead.defaultAmount);
  }, 0);
}

function updateStudentBalance(student, delta) {
  const target = getStudent(student.admNo);
  if (!target) return;
  target.currentBalance = Math.max(0, (target.currentBalance || 0) + delta);
}

function renderSummary() {
  const balance = state.students.reduce((sum, student) => sum + (student.currentBalance || 0), 0);
  const collected = state.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  document.getElementById('summary-balance').textContent = formatCurrency(balance);
  document.getElementById('summary-collected').textContent = formatCurrency(collected);
  document.getElementById('summary-students').textContent = state.students.length;
}

function renderStudentTable() {
  const tbody = document.getElementById('student-table');
  tbody.innerHTML = '';

  state.students.forEach(student => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${student.admNo}</td>
      <td>${student.name}</td>
      <td>${student.className}</td>
      <td>${student.stream}</td>
      <td>${student.house}</td>
      <td>${formatCurrency(student.currentBalance || 0)}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderVoteheadTable() {
  const tbody = document.getElementById('votehead-table');
  tbody.innerHTML = '';

  state.voteheads.forEach(votehead => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${votehead.name}</td>
      <td>${formatCurrency(votehead.defaultAmount)}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderOverrides() {
  const tbody = document.getElementById('override-table');
  tbody.innerHTML = '';

  state.overrides.forEach(override => {
    const votehead = state.voteheads.find(item => item.id === override.voteheadId);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${votehead ? votehead.name : 'Unknown'}</td>
      <td>${override.className}</td>
      <td>${override.stream}</td>
      <td>${formatCurrency(override.amount)}</td>
    `;
    tbody.appendChild(row);
  });
}

function populateSelects() {
  const studentSelects = [document.getElementById('invoice-student'), document.getElementById('payment-student')];
  const overrideSelect = document.getElementById('override-votehead');

  studentSelects.forEach(select => {
    if (!select) return;
    select.innerHTML = state.students.map(student => `<option value="${student.admNo}">${student.admNo} — ${student.name}</option>`).join('');
  });

  if (overrideSelect) {
    overrideSelect.innerHTML = state.voteheads.map(votehead => `<option value="${votehead.id}">${votehead.name}</option>`).join('');
  }
}

function renderTransactions() {
  const tbody = document.getElementById('transaction-table');
  tbody.innerHTML = '';

  const rows = [...state.invoices, ...state.payments].sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));

  rows.forEach(entry => {
    const student = getStudent(entry.admNo || entry.studentAdmNo);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${student ? `${student.admNo} — ${student.name}` : 'Unknown'}</td>
      <td>${entry.type || 'Payment'}</td>
      <td>${formatCurrency(entry.amount || 0)}</td>
      <td>${entry.mode || entry.paymentMode || 'N/A'}</td>
      <td>${entry.reference || entry.paymentReference || entry.term || '—'}</td>
      <td>${new Date(entry.createdAt || entry.timestamp || Date.now()).toLocaleDateString()}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderDashboard() {
  const termStatus = document.getElementById('term-status');
  const receiptLog = document.getElementById('receipt-log');

  termStatus.innerHTML = ['Term 1', 'Term 2', 'Term 3'].map(term => {
    const total = state.invoices.filter(invoice => invoice.term === term).reduce((sum, invoice) => sum + invoice.total, 0);
    const paid = state.payments.filter(payment => payment.term === term).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return `<li><span class="badge">${term}</span> ${formatCurrency(total)} billed • ${formatCurrency(paid)} collected</li>`;
  }).join('');

  receiptLog.innerHTML = state.payments.slice(0, 5).map(payment => `<li><span class="badge">${payment.mode}</span> ${payment.reference} — ${formatCurrency(payment.amount)}</li>`).join('');
}

function renderParentPortal() {
  const output = document.getElementById('parent-output');
  output.innerHTML = '<p class="muted">Enter an admission number to inspect the statement for that student.</p>';
}

function renderReports() {
  const output = document.getElementById('report-output');
  const totalInvoices = state.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalPayments = state.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const openBalance = Math.max(0, totalInvoices - totalPayments);

  output.innerHTML = `
    <div class="dashboard-grid">
      <div class="card">
        <h3>Fee collections</h3>
        <p>${formatCurrency(totalPayments)}</p>
      </div>
      <div class="card">
        <h3>Outstanding balance</h3>
        <p>${formatCurrency(openBalance)}</p>
      </div>
    </div>
  `;
}

function render() {
  renderSummary();
  renderStudentTable();
  renderVoteheadTable();
  renderOverrides();
  populateSelects();
  renderTransactions();
  renderDashboard();
  renderParentPortal();
  renderReports();
}

function handleStudentSubmit(event) {
  event.preventDefault();
  const student = {
    admNo: document.getElementById('adm-no').value.trim(),
    name: document.getElementById('student-name').value.trim(),
    className: document.getElementById('student-class').value.trim(),
    stream: document.getElementById('student-stream').value.trim(),
    house: document.getElementById('student-house').value.trim(),
    currentBalance: 0
  };

  if (!student.admNo || state.students.some(item => item.admNo === student.admNo)) {
    alert('Please enter a unique admission number.');
    return;
  }

  state.students.push(student);
  saveState();
  render();
  event.target.reset();
}

function handleVoteheadSubmit(event) {
  event.preventDefault();
  const votehead = {
    id: document.getElementById('votehead-name').value.trim().toLowerCase().replace(/\s+/g, '-'),
    name: document.getElementById('votehead-name').value.trim(),
    defaultAmount: Number(document.getElementById('votehead-amount').value)
  };

  state.voteheads.push(votehead);
  saveState();
  render();
  event.target.reset();
}

function handleOverrideSubmit(event) {
  event.preventDefault();
  const override = {
    voteheadId: document.getElementById('override-votehead').value,
    className: document.getElementById('override-class').value.trim(),
    stream: document.getElementById('override-stream').value.trim(),
    amount: Number(document.getElementById('override-amount').value)
  };

  state.overrides.push(override);
  saveState();
  render();
  event.target.reset();
}

function handleInvoiceSubmit(event) {
  event.preventDefault();
  const admNo = document.getElementById('invoice-student').value;
  const term = document.getElementById('invoice-term').value;
  const student = getStudent(admNo);

  if (!student) return;

  const total = calculateInvoiceTotal(student);
  const invoice = {
    admNo,
    term,
    total,
    type: 'Invoice',
    createdAt: new Date().toISOString()
  };

  state.invoices.push(invoice);
  updateStudentBalance(student, total);
  saveState();
  render();
}

function handlePaymentSubmit(event) {
  event.preventDefault();
  const admNo = document.getElementById('payment-student').value;
  const amount = Number(document.getElementById('payment-amount').value);
  const mode = document.getElementById('payment-mode').value;
  const reference = document.getElementById('payment-reference').value.trim();
  const student = getStudent(admNo);

  if (!student || Number.isNaN(amount) || amount <= 0) return;

  const payment = {
    admNo,
    amount,
    mode,
    reference,
    type: 'Payment',
    timestamp: new Date().toISOString()
  };

  state.payments.push(payment);
  updateStudentBalance(student, -amount);
  saveState();
  render();
  event.target.reset();
}

function handleParentSubmit(event) {
  event.preventDefault();
  const admNo = document.getElementById('parent-adm').value.trim();
  const student = getStudent(admNo);
  const output = document.getElementById('parent-output');

  if (!student) {
    output.innerHTML = '<p class="muted">No student record was found for that admission number.</p>';
    return;
  }

  const history = [...state.invoices.filter(entry => entry.admNo === admNo), ...state.payments.filter(entry => entry.admNo === admNo)]
    .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));

  output.innerHTML = `
    <h3>${student.name}</h3>
    <p><strong>Current term balance:</strong> ${formatCurrency(student.currentBalance || 0)}</p>
    <p><strong>Admission number:</strong> ${student.admNo}</p>
    <ul>
      ${history.map(entry => `<li>${entry.type || 'Payment'} — ${formatCurrency(entry.amount || entry.total || 0)} on ${new Date(entry.createdAt || entry.timestamp || Date.now()).toLocaleDateString()}</li>`).join('')}
    </ul>
  `;
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.target).classList.add('active');
    });
  });
}

function bindForms() {
  document.getElementById('student-form').addEventListener('submit', handleStudentSubmit);
  document.getElementById('votehead-form').addEventListener('submit', handleVoteheadSubmit);
  document.getElementById('override-form').addEventListener('submit', handleOverrideSubmit);
  document.getElementById('invoice-form').addEventListener('submit', handleInvoiceSubmit);
  document.getElementById('payment-form').addEventListener('submit', handlePaymentSubmit);
  document.getElementById('parent-form').addEventListener('submit', handleParentSubmit);
}

function init() {
  initializeState();
  bindTabs();
  bindForms();
  render();
}

document.addEventListener('DOMContentLoaded', init);
