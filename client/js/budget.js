// ExpenseFlow Monthly Budget Controller Logic

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Guard against unauthenticated access
  const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // 2. Initialize User Profile
  initUserProfile();

  // 3. Initialize Period Selectors
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthSelect = document.getElementById('budgetMonthSelect');
  const yearSelect = document.getElementById('budgetYearSelect');
  
  if (monthSelect) monthSelect.value = currentMonth.toString();
  if (yearSelect) yearSelect.value = currentYear.toString();

  // 4. Setup Event Listeners
  setupEventListeners();

  // 5. Initial Data Load
  await loadBudgetData();
});

// Initialize User Profile Badge
function initUserProfile() {
  const userString = localStorage.getItem('user');
  if (userString) {
    try {
      const user = JSON.parse(userString);
      const nameElement = document.getElementById('user-display-name');
      const avatarElement = document.getElementById('user-avatar');

      if (nameElement && user.name) {
        nameElement.textContent = user.name;
      }
      if (avatarElement && user.name) {
        avatarElement.textContent = user.name.charAt(0).toUpperCase();
      }
    } catch (e) {
      console.error('Failed to parse user profile:', e);
    }
  }
}

// Setup Event Listeners
function setupEventListeners() {
  const monthSelect = document.getElementById('budgetMonthSelect');
  const yearSelect = document.getElementById('budgetYearSelect');

  if (monthSelect) monthSelect.addEventListener('change', loadBudgetData);
  if (yearSelect) yearSelect.addEventListener('change', loadBudgetData);

  // Modal Buttons
  const openModalBtn = document.getElementById('openBudgetModalBtn');
  const closeModalBtn = document.getElementById('closeBudgetModalBtn');
  const cancelModalBtn = document.getElementById('cancelBudgetModalBtn');
  const modal = document.getElementById('budgetModal');
  const form = document.getElementById('budgetForm');

  if (openModalBtn) openModalBtn.addEventListener('click', openBudgetModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeBudgetModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeBudgetModal);
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeBudgetModal();
    });
  }

  if (form) form.addEventListener('submit', handleBudgetSubmit);

  // Logout
  const logoutBtn = document.getElementById('logout-btn') || document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }
}

// Load Budget Data for Selected Month/Year
async function loadBudgetData() {
  const monthSelect = document.getElementById('budgetMonthSelect');
  const yearSelect = document.getElementById('budgetYearSelect');

  const month = monthSelect ? parseInt(monthSelect.value, 10) : (new Date().getMonth() + 1);
  const year = yearSelect ? parseInt(yearSelect.value, 10) : new Date().getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const displayHeading = document.getElementById('display-month-year');
  if (displayHeading) {
    displayHeading.textContent = `${monthNames[month - 1]} ${year}`;
  }

  try {
    const res = await apiRequest(`/budget?month=${month}&year=${year}&history=true`);
    if (res && res.success && res.data) {
      renderBudgetDetails(res.data);
      if (res.data.history) {
        renderBudgetHistory(res.data.history);
      }
    }
  } catch (error) {
    console.error('Failed to load budget data:', error);
    showToast('Failed to load budget details', 'error');
  }
}

// Render Budget Details & Progress Bar
function renderBudgetDetails(data) {
  const {
    budget = 0,
    spent = 0,
    remaining = 0,
    percentageUsed = 0,
    status = 'normal',
    isSet = false
  } = data;

  const budgetEl = document.getElementById('budget-amount-display');
  const spentEl = document.getElementById('budget-spent-display');
  const remainingEl = document.getElementById('budget-remaining-display');
  const percentEl = document.getElementById('budget-percentage-display');
  const progressText = document.getElementById('progress-percentage-text');
  const progressBar = document.getElementById('budget-progress-bar');
  const alertBanner = document.getElementById('budget-alert-banner');
  const alertIcon = document.getElementById('budget-alert-icon');
  const alertText = document.getElementById('budget-alert-text');
  const openModalBtn = document.getElementById('openBudgetModalBtn');

  if (openModalBtn) {
    openModalBtn.innerHTML = isSet ? '<i class="fa-solid fa-pen-to-square"></i> Edit Budget' : '<i class="fa-solid fa-plus"></i> Set Budget';
  }

  if (budgetEl) budgetEl.textContent = formatCurrency(budget);
  if (spentEl) spentEl.textContent = formatCurrency(spent);
  
  if (remainingEl) {
    remainingEl.textContent = formatCurrency(remaining);
    remainingEl.className = 'budget-stat-value ' + (remaining < 0 ? 'danger' : 'success');
  }

  if (percentEl) {
    percentEl.textContent = isSet ? `${percentageUsed}%` : 'N/A';
    percentEl.className = 'budget-stat-value ' + (status === 'exceeded' ? 'danger' : status === 'warning' ? 'warning' : 'success');
  }

  // Progress Bar Rendering
  if (progressBar) {
    const cappedPercentage = Math.min(percentageUsed, 100);
    progressBar.style.width = isSet ? `${cappedPercentage}%` : '0%';
    progressBar.className = `progress-bar-fill ${status}`;
  }

  if (progressText) {
    progressText.textContent = isSet ? `${percentageUsed}% Used` : 'No Budget Set';
  }

  // Alert Notification Banner
  if (alertBanner && alertText && alertIcon) {
    alertBanner.className = `budget-alert-banner ${status}`;

    if (!isSet) {
      alertIcon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
      alertText.textContent = 'No budget has been set for this month. Click "Set Budget" above to allocate one.';
    } else if (status === 'exceeded') {
      const exceededBy = Math.abs(remaining);
      alertIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
      alertText.innerHTML = `Budget exceeded by <strong>${formatCurrency(exceededBy)}</strong>.`;
    } else if (status === 'warning') {
      alertIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
      alertText.innerHTML = `⚠️ You have used <strong>${percentageUsed}%</strong> of your monthly budget.`;
    } else {
      alertIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      alertText.innerHTML = `You have used <strong>${percentageUsed}%</strong> of your budget. Spending is well within your monthly limit.`;
    }
  }
}

// Render History Table
function renderBudgetHistory(history) {
  const tbody = document.getElementById('budget-history-tbody');
  if (!tbody) return;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (history.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No budget records found. Set a budget for the current month above!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';

  history.forEach(item => {
    const monthName = monthNames[item.month - 1] || item.month;
    const cappedPct = Math.min(item.percentageUsed, 100);
    const statusClass = item.percentageUsed >= 100 ? 'exceeded' : item.percentageUsed >= 80 ? 'warning' : 'normal';

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    tr.innerHTML = `
      <td style="padding: 1rem 1.5rem; font-weight: 600;"><strong>${monthName} ${item.year}</strong></td>
      <td style="padding: 1rem 1.5rem;">${formatCurrency(item.budget)}</td>
      <td style="padding: 1rem 1.5rem;">${formatCurrency(item.spent)}</td>
      <td style="padding: 1rem 1.5rem; font-weight: 700; color: ${item.remaining < 0 ? 'var(--danger)' : 'var(--text-main)'};">
        ${formatCurrency(item.remaining)}
      </td>
      <td style="padding: 1rem 1.5rem;">
        <div class="mini-progress">
          <div class="mini-progress-fill ${statusClass}" style="width: ${cappedPct}%; background: ${statusClass === 'exceeded' ? '#ef4444' : statusClass === 'warning' ? '#f59e0b' : '#10b981'};"></div>
        </div>
        <span style="font-size: 0.85rem; font-weight: 600;">${item.percentageUsed}%</span>
      </td>
      <td class="text-right" style="padding: 1rem 1.5rem;">
        <button type="button" class="btn-action btn-edit" data-month="${item.month}" data-year="${item.year}" data-amount="${item.budget}">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
      </td>
    `;

    const editBtn = tr.querySelector('.btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        openBudgetModalWithValues(item.month, item.year, item.budget);
      });
    }

    tbody.appendChild(tr);
  });
}

// Open Set Budget Modal
function openBudgetModal() {
  const monthSelect = document.getElementById('budgetMonthSelect');
  const yearSelect = document.getElementById('budgetYearSelect');
  const currentMonth = monthSelect ? monthSelect.value : (new Date().getMonth() + 1);
  const currentYear = yearSelect ? yearSelect.value : new Date().getFullYear();

  const currentBudgetEl = document.getElementById('budget-amount-display');
  const currentAmount = currentBudgetEl ? parseFloat(currentBudgetEl.textContent.replace(/[^0-9.-]+/g, '')) || '' : '';

  openBudgetModalWithValues(currentMonth, currentYear, currentAmount);
}

function openBudgetModalWithValues(month, year, amount) {
  const modal = document.getElementById('budgetModal');
  const monthInput = document.getElementById('formBudgetMonth');
  const yearInput = document.getElementById('formBudgetYear');
  const amountInput = document.getElementById('formBudgetAmount');
  const modalTitle = document.getElementById('budgetModalTitle');
  const errorEl = document.getElementById('budgetAmountError');

  if (errorEl) errorEl.textContent = '';
  if (monthInput) monthInput.value = month.toString();
  if (yearInput) yearInput.value = year.toString();
  if (amountInput) amountInput.value = amount || '';
  if (modalTitle) modalTitle.textContent = amount ? 'Edit Monthly Budget' : 'Set Monthly Budget';

  if (modal) {
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('active');
    });
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeBudgetModal() {
  const modal = document.getElementById('budgetModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
  const errorEl = document.getElementById('budgetAmountError');
  if (errorEl) errorEl.textContent = '';
}

// Handle Form Submission (POST / PUT)
async function handleBudgetSubmit(e) {
  e.preventDefault();
  const monthInput = document.getElementById('formBudgetMonth');
  const yearInput = document.getElementById('formBudgetYear');
  const amountInput = document.getElementById('formBudgetAmount');
  const errorEl = document.getElementById('budgetAmountError');
  const saveBtn = document.getElementById('saveBudgetBtn');

  if (errorEl) errorEl.textContent = '';

  const month = parseInt(monthInput.value, 10);
  const year = parseInt(yearInput.value, 10);
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    if (errorEl) errorEl.textContent = 'Please enter a valid budget amount greater than 0.';
    return;
  }

  if (saveBtn) saveBtn.disabled = true;

  try {
    await apiRequest('/budget', {
      method: 'POST',
      body: JSON.stringify({ month, year, amount })
    });

    showToast('Monthly budget saved successfully!', 'success');
    closeBudgetModal();

    // Sync active selector to the updated month/year
    const monthSelect = document.getElementById('budgetMonthSelect');
    const yearSelect = document.getElementById('budgetYearSelect');
    if (monthSelect) monthSelect.value = month.toString();
    if (yearSelect) yearSelect.value = year.toString();

    await loadBudgetData();
  } catch (error) {
    console.error('Failed to save budget:', error);
    if (errorEl) errorEl.textContent = error.message || 'Failed to save budget.';
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// Helpers
function formatCurrency(num) {
  const val = parseFloat(num) || 0;
  return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toastMessage');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast-notification ${type}`;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
    toast.textContent = '';
  }, 3500);
}
