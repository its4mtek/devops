const STORAGE_KEY = 'mintwise-data-v1';
const palette = ['#4f8060', '#9ab99a', '#e8bd86', '#a9bdcf', '#dfaa9f', '#b9a6c8', '#8ca9a6'];
const categories = {
  expense: ['Food & dining', 'Housing', 'Transport', 'Bills & utilities', 'Shopping', 'Health', 'Entertainment', 'Personal care', 'Travel', 'Education', 'Other'],
  income: ['Salary', 'Freelance', 'Interest', 'Other income']
};
const icons = {
  'Food & dining': ['☕', '#f8eee3', '#bd8955'], Housing: ['⌂', '#eef1ec', '#65806a'],
  Transport: ['↗', '#eef2f5', '#6e8ca1'], 'Bills & utilities': ['ϟ', '#f7f0e2', '#b08d54'],
  Shopping: ['◇', '#f5edf0', '#a26e82'], Health: ['✚', '#edf5ee', '#62876b'],
  Entertainment: ['♫', '#f0edf5', '#8873a0'], 'Personal care': ['✳', '#f2eff0', '#9d7585'],
  Travel: ['✈', '#edf2f5', '#668ba0'], Education: ['▤', '#f3f0e8', '#95814f'],
  'Salary': ['↓', '#eaf3eb', '#518261'], 'Freelance': ['↗', '#edf2eb', '#6a8966'],
  'Interest': ['✳', '#f2f2e8', '#8d8c57'], 'Other income': ['＋', '#edf3ee', '#65866c'],
  Other: ['◦', '#f0f2ef', '#718077']
};
const seedTransactions = [
  { id: 's1', name: 'Monthly salary', category: 'Salary', account: 'Everyday account', date: dayOfMonth(2), amount: 85000, type: 'income', note: 'Acme Studio' },
  { id: 's2', name: 'Apartment rent', category: 'Housing', account: 'Everyday account', date: dayOfMonth(3), amount: 22000, type: 'expense', note: 'Monthly rent' },
  { id: 's3', name: 'Greenhouse Cafe', category: 'Food & dining', account: 'Everyday account', date: dayOfMonth(5), amount: 680, type: 'expense', note: 'Coffee & brunch' },
  { id: 's4', name: 'Metro card', category: 'Transport', account: 'Cash', date: dayOfMonth(7), amount: 1250, type: 'expense', note: 'Travel pass' },
  { id: 's5', name: 'Electricity bill', category: 'Bills & utilities', account: 'Everyday account', date: dayOfMonth(8), amount: 1840, type: 'expense', note: 'Monthly bill' },
  { id: 's6', name: 'Weekend groceries', category: 'Food & dining', account: 'Everyday account', date: dayOfMonth(10), amount: 2360, type: 'expense', note: 'Fresh Market' },
  { id: 's7', name: 'Running shoes', category: 'Shopping', account: 'Savings account', date: dayOfMonth(12), amount: 3499, type: 'expense', note: 'New balance' },
  { id: 's8', name: 'Dinner with friends', category: 'Entertainment', account: 'Everyday account', date: dayOfMonth(14), amount: 1850, type: 'expense', note: 'Friday evening' }
];
let state = loadState();
let activeType = 'expense';
let toastTimer;
let deletedTransaction = null;

function dayOfMonth(day) {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.transactions)) return saved;
  } catch (error) {
    console.warn('Saved finance data could not be read.', error);
  }
  return { transactions: seedTransactions.slice(), budget: 60000, openingBalance: 25000 };
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { showToast('Could not save changes in this browser.'); console.error(error); }
}
function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(value || 0));
}
function selectedMonth() {
  return document.getElementById('month-picker').value || new Date().toISOString().slice(0, 7);
}
function monthTransactions() {
  const month = selectedMonth();
  return state.transactions.filter(item => item.date && item.date.slice(0, 7) === month);
}
function currentTotals(transactions) {
  return transactions.reduce((totals, item) => {
    totals[item.type] = (totals[item.type] || 0) + Number(item.amount || 0);
    return totals;
  }, { income: 0, expense: 0 });
}
function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
}
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function categoryColor(category) {
  const allCategories = [...categories.expense, ...categories.income];
  const index = Math.max(0, allCategories.indexOf(category));
  return palette[index % palette.length];
}
function updateDashboard() {
  const transactions = monthTransactions();
  const totals = currentTotals(transactions);
  const net = totals.income - totals.expense;
  const month = new Date(`${selectedMonth()}-01T12:00:00`);
  document.getElementById('month-name').textContent = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month);
  document.getElementById('total-income').textContent = formatMoney(totals.income);
  document.getElementById('total-spending').textContent = formatMoney(totals.expense);
  document.getElementById('total-savings').textContent = formatMoney(net);
  document.getElementById('total-balance').textContent = formatMoney(state.openingBalance + state.transactions.reduce((sum, item) => sum + (item.type === 'income' ? Number(item.amount) : -Number(item.amount)), 0));
  document.getElementById('savings-status').textContent = net >= 0 ? 'Income − spending' : 'Spending exceeds income';
  document.getElementById('donut-total').textContent = formatMoney(totals.expense);
  renderBudgets(transactions, totals.expense);
  renderBreakdown(transactions, totals.expense);
  renderTransactions();
}
function renderBreakdown(transactions, total) {
  const sums = {};
  transactions.filter(item => item.type === 'expense').forEach(item => { sums[item.category] = (sums[item.category] || 0) + Number(item.amount); });
  const sorted = Object.entries(sums).sort((a, b) => b[1] - a[1]);
  const shown = sorted.slice(0, 5);
  const stops = [];
  let cursor = 0;
  shown.forEach(([category, amount], index) => {
    const portion = total ? amount / total * 100 : 0;
    stops.push(`${palette[index % palette.length]} ${cursor}% ${cursor + portion}%`);
    cursor += portion;
  });
  if (!total) stops.push('#e9eee8 0% 100%');
  else if (cursor < 100) stops.push(`#e8eeea ${cursor}% 100%`);
  document.getElementById('spending-donut').style.background = `conic-gradient(${stops.join(',')})`;
  const legend = document.getElementById('category-legend');
  legend.innerHTML = shown.length ? shown.map(([category, amount], index) =>
    `<div class="legend-item"><span class="legend-swatch" style="background:${palette[index % palette.length]}"></span><span>${escapeHTML(category)}</span><strong>${Math.round(amount / total * 100)}%</strong></div>`
  ).join('') : '<div class="legend-item">No spending yet</div>';
}
function renderBudgets(transactions, spent) {
  const limit = Number(state.budget) || 60000;
  const percent = limit ? spent / limit * 100 : 0;
  const bar = document.getElementById('overall-progress');
  bar.style.width = `${Math.min(percent, 100)}%`;
  bar.className = percent > 100 ? 'over' : percent >= 80 ? 'warning' : '';
  document.getElementById('budget-spent').textContent = formatMoney(spent);
  document.getElementById('budget-limit').textContent = formatMoney(limit);
  document.getElementById('budget-remaining').textContent = `${formatMoney(Math.max(0, limit - spent))} left`;
  document.getElementById('budget-status-text').textContent = percent > 100 ? 'You’re over budget' : percent >= 80 ? 'Getting close to your limit' : 'You’re on track';
  const byCategory = {};
  transactions.filter(item => item.type === 'expense').forEach(item => { byCategory[item.category] = (byCategory[item.category] || 0) + Number(item.amount); });
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);
  document.getElementById('budget-list').innerHTML = rows.map(([category, value], index) => {
    const categoryLimit = Math.round(limit * [0.35, 0.25, 0.2][index]);
    const ratio = value / categoryLimit * 100;
    const status = ratio > 100 ? 'over' : ratio >= 80 ? 'warning' : '';
    return `<div class="budget-row"><div class="budget-category"><span class="legend-swatch" style="background:${palette[index % palette.length]}"></span>${escapeHTML(category)}</div><span class="budget-values">${formatMoney(value)} / ${formatMoney(categoryLimit)}</span><div class="progress-track"><span class="${status}" style="width:${Math.min(ratio, 100)}%"></span></div></div>`;
  }).join('') || '<div class="budget-category">Add an expense to see category budgets.</div>';
}
function renderTransactions() {
  const search = document.getElementById('search-input').value.trim().toLowerCase();
  const category = document.getElementById('category-filter').value;
  const all = monthTransactions().sort((a, b) => b.date.localeCompare(a.date));
  const filtered = all.filter(item => (!category || item.category === category) && (!search || `${item.name} ${item.note || ''} ${item.category} ${item.account}`.toLowerCase().includes(search)));
  document.getElementById('transaction-rows').innerHTML = filtered.slice(0, 8).map(item => {
    const [icon, bg, color] = icons[item.category] || icons.Other;
    return `<tr><td><div class="transaction-name"><span class="transaction-icon" style="background:${bg};color:${color}">${icon}</span><span><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.note || item.type)}</small></span></div></td><td><span class="category-chip">${escapeHTML(item.category)}</span></td><td>${escapeHTML(item.account || 'Everyday account')}</td><td>${formatDate(item.date)}</td><td class="amount ${item.type === 'income' ? 'income' : ''}">${item.type === 'income' ? '+' : '−'}${formatMoney(item.amount)}</td><td><button class="delete-row" type="button" data-delete="${escapeHTML(item.id)}" aria-label="Delete ${escapeHTML(item.name)}">×</button></td></tr>`;
  }).join('');
  document.getElementById('empty-state').hidden = filtered.length !== 0;
  document.querySelector('#transactions table').hidden = filtered.length === 0;
  document.getElementById('transaction-count').textContent = `Showing ${Math.min(filtered.length, 8)} of ${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`;
}
function updateCategories() {
  const categorySelect = document.getElementById('transaction-category');
  const filter = document.getElementById('category-filter');
  const priorFilter = filter.value;
  const available = [...categories.expense, ...categories.income];
  categorySelect.innerHTML = available.map(item => `<option>${escapeHTML(item)}</option>`).join('');
  filter.innerHTML = '<option value="">All categories</option>' + available.map(item => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`).join('');
  filter.value = priorFilter;
}
function openModal() {
  const modal = document.getElementById('transaction-modal');
  modal.hidden = false;
  document.querySelector('#transaction-form [name="date"]').value = new Date().toISOString().slice(0, 10);
  document.getElementById('amount-input').focus();
}
function closeModal() { document.getElementById('transaction-modal').hidden = true; }
function showToast(message, undo = false) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  document.getElementById('undo-delete').hidden = !undo;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function addTransaction(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const amount = Number(data.get('amount'));
  if (!Number.isFinite(amount) || amount <= 0) return;
  const category = String(data.get('category'));
  state.transactions.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: String(data.get('note') || category), category, account: String(data.get('account')),
    date: String(data.get('date')), amount, type: activeType, note: String(data.get('note') || '')
  });
  saveState();
  updateDashboard();
  form.reset();
  closeModal();
  showToast('Transaction added. Nice and easy.');
}
function deleteTransaction(id) {
  const index = state.transactions.findIndex(item => item.id === id);
  if (index < 0) return;
  deletedTransaction = { item: state.transactions[index], index };
  state.transactions.splice(index, 1);
  saveState();
  updateDashboard();
  showToast('Transaction deleted.', true);
}
function exportCSV() {
  const rows = [['date', 'amount', 'type', 'category', 'account', 'note'], ...state.transactions.map(item => [item.date, item.amount, item.type, item.category, item.account, item.note || ''])];
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = 'mintwise-transactions.csv';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Your CSV export is ready.');
}
function parseCSV(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value.trim()); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(value.trim()); if (row.some(cell => cell)) rows.push(row);
      row = []; value = '';
    } else value += char;
  }
  if (value || row.length) { row.push(value.trim()); if (row.some(cell => cell)) rows.push(row); }
  return rows;
}
async function importCSV(file) {
  if (!file) return;
  try {
    const rows = parseCSV(await file.text());
    if (rows.length < 2) throw new Error('The CSV needs a header row and at least one transaction.');
    const headers = rows[0].map(value => value.toLowerCase().replace(/[^a-z]/g, ''));
    const find = (...names) => headers.findIndex(header => names.includes(header));
    const dateIndex = find('date', 'transactiondate');
    const amountIndex = find('amount', 'value');
    if (dateIndex < 0 || amountIndex < 0) throw new Error('CSV needs columns named Date and Amount.');
    const typeIndex = find('type', 'transactiontype');
    const categoryIndex = find('category');
    const accountIndex = find('account');
    const noteIndex = find('note', 'description', 'merchant', 'name');
    let imported = 0, skipped = 0;
    rows.slice(1).forEach(row => {
      const amount = Math.abs(Number((row[amountIndex] || '').replace(/[₹,\s]/g, '')));
      const rawDate = row[dateIndex] || '';
      const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : (() => {
        const parsed = new Date(rawDate);
        return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
      })();
      if (!date || !Number.isFinite(amount) || amount <= 0) { skipped++; return; }
      const note = noteIndex >= 0 ? row[noteIndex] || '' : '';
      const duplicate = state.transactions.some(item => item.date === date && Number(item.amount) === amount && (item.note || '') === note);
      if (duplicate) { skipped++; return; }
      const rawType = typeIndex >= 0 ? (row[typeIndex] || '').toLowerCase() : '';
      const type = rawType.includes('income') || rawType.includes('credit') ? 'income' : 'expense';
      const category = categoryIndex >= 0 && row[categoryIndex] ? row[categoryIndex] : (type === 'income' ? 'Other income' : 'Other');
      const account = accountIndex >= 0 && row[accountIndex] ? row[accountIndex] : 'Everyday account';
      state.transactions.push({ id: `csv-${Date.now()}-${imported}`, name: note || category, category, account, date, amount, type, note });
      imported++;
    });
    saveState(); updateDashboard();
    showToast(`Imported ${imported}; skipped ${skipped} row${skipped === 1 ? '' : 's'}.`);
  } catch (error) {
    showToast(error.message || 'Could not import this CSV.');
  }
}
function init() {
  document.getElementById('month-picker').value = new Date().toISOString().slice(0, 7);
  document.getElementById('today-label').textContent = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase();
  updateCategories();
  updateDashboard();
  document.getElementById('open-add').addEventListener('click', openModal);
  document.getElementById('empty-add').addEventListener('click', openModal);
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);
  document.getElementById('transaction-modal').addEventListener('click', event => { if (event.target === event.currentTarget) closeModal(); });
  document.getElementById('transaction-form').addEventListener('submit', addTransaction);
  document.querySelectorAll('.type-option').forEach(button => button.addEventListener('click', () => {
    activeType = button.dataset.type;
    document.querySelectorAll('.type-option').forEach(option => option.classList.toggle('selected', option === button));
    const select = document.getElementById('transaction-category');
    select.innerHTML = categories[activeType].map(item => `<option>${escapeHTML(item)}</option>`).join('');
  }));
  document.getElementById('month-picker').addEventListener('change', updateDashboard);
  document.getElementById('search-input').addEventListener('input', renderTransactions);
  document.getElementById('category-filter').addEventListener('change', renderTransactions);
  document.getElementById('transaction-rows').addEventListener('click', event => {
    const button = event.target.closest('[data-delete]');
    if (button) deleteTransaction(button.dataset.delete);
  });
  document.getElementById('undo-delete').addEventListener('click', () => {
    if (!deletedTransaction) return;
    state.transactions.splice(deletedTransaction.index, 0, deletedTransaction.item);
    deletedTransaction = null;
    saveState(); updateDashboard();
    document.getElementById('toast').classList.remove('show');
  });
  document.getElementById('export-button').addEventListener('click', exportCSV);
  document.getElementById('view-all').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    renderTransactions();
    document.getElementById('transactions').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('import-button').addEventListener('click', () => document.getElementById('csv-input').click());
  document.getElementById('csv-input').addEventListener('change', event => { importCSV(event.target.files[0]); event.target.value = ''; });
  document.getElementById('edit-budget').addEventListener('click', () => {
    document.getElementById('budget-input').value = state.budget;
    document.getElementById('budget-modal').hidden = false;
    document.getElementById('budget-input').focus();
  });
  const closeBudget = () => { document.getElementById('budget-modal').hidden = true; };
  document.getElementById('close-budget').addEventListener('click', closeBudget);
  document.getElementById('cancel-budget').addEventListener('click', closeBudget);
  document.getElementById('budget-modal').addEventListener('click', event => { if (event.target === event.currentTarget) closeBudget(); });
  document.getElementById('budget-form').addEventListener('submit', event => {
    event.preventDefault();
    const amount = Number(document.getElementById('budget-input').value);
    if (amount > 0) { state.budget = amount; saveState(); updateDashboard(); closeBudget(); showToast('Monthly budget updated.'); }
  });
  document.addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault(); openModal();
    }
    if (event.key === 'Escape') { closeModal(); closeBudget(); }
  });
}
init();
