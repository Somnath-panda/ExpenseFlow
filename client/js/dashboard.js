// ExpenseFlow Dashboard Controller Logic

let categoryChartInstance = null;
let monthlyTrendChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Guard against unauthenticated access
  const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // 2. Set Current Month Label
  initCurrentMonthLabel();

  // 3. Fetch and render all dashboard components
  await loadDashboardData();

  // 4. Re-render charts when theme changes
  window.addEventListener('themeChanged', () => {
    loadCategoryChart();
    loadMonthlyTrendChart();
  });
});
function initCurrentMonthLabel() {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const now = new Date();
  const currentMonthLabel = document.getElementById('current-month-label');
  if (currentMonthLabel) {
    currentMonthLabel.innerHTML = `<i class="fa-solid fa-calendar-days"></i> ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  }

  const yearBadge = document.getElementById('trend-year-badge');
  if (yearBadge) {
    yearBadge.textContent = now.getFullYear();
  }
}

// Main Data Fetcher
async function loadDashboardData() {
  await Promise.all([
    loadSummaryKPIs(),
    loadCategoryChart(),
    loadMonthlyTrendChart(),
    loadRecentTransactions()
  ]);
}

// 1. Load Summary KPI Cards
async function loadSummaryKPIs() {
  try {
    const res = await apiRequest('/dashboard/summary');
    if (res && res.success && res.data) {
      const {
        totalExpenses = 0,
        monthlyExpenses = 0,
        monthlyBudget = 0,
        remainingBudget = 0,
        transactionCount = 0,
        highestExpense = 0,
        averageExpense = 0
      } = res.data;

      // Update DOM elements
      const totalEl = document.getElementById('total-expenses');
      const monthlyEl = document.getElementById('monthly-expenses');
      const budgetEl = document.getElementById('monthly-budget');
      const remainingEl = document.getElementById('remaining-budget');
      const countEl = document.getElementById('transaction-count');
      const highestEl = document.getElementById('highest-expense');
      const avgEl = document.getElementById('average-expense');
      const budgetStatusEl = document.getElementById('budget-status-text');

      if (totalEl) totalEl.textContent = formatCurrency(totalExpenses);
      if (monthlyEl) monthlyEl.textContent = formatCurrency(monthlyExpenses);
      if (budgetEl) budgetEl.textContent = formatCurrency(monthlyBudget);
      
      if (remainingEl) {
        remainingEl.textContent = formatCurrency(remainingBudget);
        if (remainingBudget < 0) {
          remainingEl.style.color = 'var(--danger)';
          if (budgetStatusEl) {
            budgetStatusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i> <span style="color: var(--danger);">Over budget by ${formatCurrency(Math.abs(remainingBudget))}</span>`;
          }
        } else {
          remainingEl.style.color = 'var(--text-main)';
          if (budgetStatusEl) {
            budgetStatusEl.innerHTML = `<i class="fa-solid fa-shield-halved" style="color: var(--success);"></i> Within monthly limit`;
          }
        }
      }

      if (countEl) countEl.textContent = transactionCount.toString();
      if (highestEl) highestEl.textContent = formatCurrency(highestExpense);
      if (avgEl) avgEl.textContent = formatCurrency(averageExpense);
    }
  } catch (error) {
    console.error('Failed to load dashboard summary KPIs:', error);
  }
}

// 2. Load Category Breakdown Doughnut Chart
async function loadCategoryChart() {
  const canvas = document.getElementById('categoryChart');
  const emptyState = document.getElementById('category-empty');
  if (!canvas) return;

  try {
    const res = await apiRequest('/dashboard/category-summary');
    const categories = res?.data?.categories || [];

    if (categories.length === 0) {
      canvas.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      if (categoryChartInstance) {
        categoryChartInstance.destroy();
        categoryChartInstance = null;
      }
      return;
    }

    canvas.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    const labels = categories.map(c => c.name);
    const dataValues = categories.map(c => c.amount);

    const categoryColors = {
      food: '#f59e0b',
      travel: '#3b82f6',
      shopping: '#a855f7',
      bills: '#ef4444',
      education: '#06b6d4',
      entertainment: '#ec4899',
      health: '#10b981',
      other: '#94a3b8'
    };

    const bgColors = labels.map(label => {
      const lower = label.toLowerCase();
      return categoryColors[lower] || '#4f46e5';
    });

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#f8fafc' : '#0f172a';

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: dataValues,
          backgroundColor: bgColors,
          borderColor: isDark ? '#111827' : '#ffffff',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              font: { family: 'Inter', size: 12, weight: '500' },
              padding: 14,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: isDark ? '#0b0f19' : '#ffffff',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            callbacks: {
              label: (context) => {
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Failed to load category chart:', error);
  }
}

// 3. Load Monthly Spending Trend Bar Chart
async function loadMonthlyTrendChart() {
  const canvas = document.getElementById('monthlyTrendChart');
  const emptyState = document.getElementById('trend-empty');
  if (!canvas) return;

  try {
    const res = await apiRequest('/dashboard/monthly-summary');
    const months = res?.data?.months || [];

    const hasAnyData = months.some(m => m.amount > 0);
    if (!hasAnyData) {
      canvas.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      if (monthlyTrendChartInstance) {
        monthlyTrendChartInstance.destroy();
        monthlyTrendChartInstance = null;
      }
      return;
    }

    canvas.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    const labels = months.map(m => m.name);
    const dataValues = months.map(m => m.amount);

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    if (monthlyTrendChartInstance) {
      monthlyTrendChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');

    monthlyTrendChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Monthly Spending',
          data: dataValues,
          backgroundColor: '#4f46e5',
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: isDark ? '#0b0f19' : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#f8fafc' : '#0f172a',
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            callbacks: {
              label: (context) => ` Spending: ₹${(context.raw || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { family: 'Inter', size: 11, weight: '500' }
            }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Inter', size: 11 },
              callback: (value) => '₹' + value
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Failed to load monthly trend chart:', error);
  }
}

// 4. Load Recent Transactions Table
async function loadRecentTransactions() {
  const tbody = document.getElementById('recent-transactions-tbody');
  if (!tbody) return;

  try {
    const res = await apiRequest('/expenses');
    const expenses = res?.data?.expenses || [];

    if (expenses.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-muted);">
            <i class="fa-solid fa-receipt" style="font-size: 1.5rem; margin-bottom: 0.4rem; display: block; color: var(--text-dim);"></i>
            No expenses recorded yet. Click <a href="expenses.html" style="color: var(--primary-400); font-weight: 600;">Add Expense</a> to get started.
          </td>
        </tr>
      `;
      return;
    }

    const recent = expenses.slice(0, 5);
    tbody.innerHTML = '';

    recent.forEach(item => {
      const amount = parseFloat(item.amount) || 0;
      const formattedDate = formatDate(item.expense_date);
      const badgeClass = getBadgeClass(item.category_name);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 0.85rem;">${formattedDate}</td>
        <td style="font-weight: 600;">${escapeHtml(item.title)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(item.category_name || 'General')}</span></td>
        <td style="font-weight: 700; color: var(--text-main);">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Failed to load recent transactions:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="padding: 2rem; text-align: center; color: var(--danger);">
          Error loading recent transactions.
        </td>
      </tr>
    `;
  }
}

// Formatting Helpers
function formatCurrency(num) {
  const val = parseFloat(num) || 0;
  return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const datePart = typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && monthNames[month]) {
      return `${monthNames[month]} ${day}, ${year}`;
    }
  }
  return dateStr;
}

function getBadgeClass(categoryName) {
  if (!categoryName) return 'badge-default';
  const lower = categoryName.toLowerCase();
  switch (lower) {
    case 'food': return 'badge-food';
    case 'travel': return 'badge-travel';
    case 'shopping': return 'badge-shopping';
    case 'bills': return 'badge-bills';
    case 'education': return 'badge-education';
    case 'entertainment': return 'badge-entertainment';
    case 'health': return 'badge-health';
    default: return 'badge-default';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
