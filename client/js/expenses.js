// Expense Management Frontend Logic - Vanilla JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // 1. Guard against unauthenticated access
  const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // DOM Element References
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const monthFilter = document.getElementById('monthFilter');
  const yearFilter = document.getElementById('yearFilter');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  const totalAmountDisplay = document.getElementById('totalAmountDisplay');
  const totalCountDisplay = document.getElementById('totalCountDisplay');

  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const expensesTableContainer = document.getElementById('expensesTableContainer');
  const expensesTbody = document.getElementById('expensesTbody');

  const toastMessage = document.getElementById('toastMessage');
  const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logout-btn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  // Modal Elements
  const expenseModal = document.getElementById('expenseModal');
  const openAddModalBtn = document.getElementById('openAddModalBtn') || document.getElementById('add-expense-btn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const expenseForm = document.getElementById('expenseForm');
  const modalTitle = document.getElementById('modalTitle');
  const saveExpenseBtn = document.getElementById('saveExpenseBtn');

  const expenseIdInput = document.getElementById('expenseId');
  const expenseTitleInput = document.getElementById('expenseTitle');
  const expenseAmountInput = document.getElementById('expenseAmount');
  const expenseCategorySelect = document.getElementById('expenseCategory');
  const expenseDateInput = document.getElementById('expenseDate');
  const expenseDescriptionInput = document.getElementById('expenseDescription');

  // Delete Modal Elements
  const deleteModal = document.getElementById('deleteModal');
  const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const deleteExpenseTitle = document.getElementById('deleteExpenseTitle');

  // Internal State
  let categoryList = [];
  let currentExpensesList = [];
  let currentExpenseToDelete = null;

  // Initial Setup
  initPage();

  async function initPage() {
    setupEventListeners();
    await loadCategoryDropdowns();
    await loadExpenses();
  }

  // Set up event listeners
  function setupEventListeners() {
    // Search & Filter listeners
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadExpenses, 300);
      });
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', loadExpenses);
    }
    
    if (monthFilter) {
      monthFilter.addEventListener('change', loadExpenses);
    }
    
    if (yearFilter) {
      yearFilter.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadExpenses, 300);
      });
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (monthFilter) monthFilter.value = '';
        if (yearFilter) yearFilter.value = '';
        loadExpenses();
      });
    }

    // Add Expense Modal Open
    if (openAddModalBtn) {
      openAddModalBtn.addEventListener('click', () => {
        openModalForAdd();
      });
    }

    // Modal Close
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (expenseModal) {
      expenseModal.addEventListener('click', (e) => {
        if (e.target === expenseModal) closeModal();
      });
    }

    // Form Submit
    if (expenseForm) {
      expenseForm.addEventListener('submit', handleFormSubmit);
    }

    // Delete Modal Close
    if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    if (deleteModal) {
      deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
      });
    }

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    }

    // Keyboard Accessibility (Escape key closes modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (expenseModal && expenseModal.classList.contains('active')) {
          closeModal();
        }
        if (deleteModal && deleteModal.classList.contains('active')) {
          closeDeleteModal();
        }
      }
    });

    // Export to CSV
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', exportExpensesToCSV);
    }

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
      });
    }
  }

  // Load Categories into Filter and Form Select elements
  async function loadCategoryDropdowns() {
    try {
      categoryList = await fetchCategories();
      
      // Ensure 'Other' category is positioned at the very end
      categoryList.sort((a, b) => {
        if (a.name === 'Other') return 1;
        if (b.name === 'Other') return -1;
        return a.name.localeCompare(b.name);
      });

      if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
      }
      if (expenseCategorySelect) {
        expenseCategorySelect.innerHTML = '<option value="">Select Category</option>';
      }

      categoryList.forEach(cat => {
        if (categoryFilter) {
          const optionFilter = document.createElement('option');
          optionFilter.value = cat.id;
          optionFilter.textContent = cat.name;
          categoryFilter.appendChild(optionFilter);
        }

        if (expenseCategorySelect) {
          const optionForm = document.createElement('option');
          optionForm.value = cat.id;
          optionForm.textContent = cat.name;
          expenseCategorySelect.appendChild(optionForm);
        }
      });
    } catch (err) {
      console.error('Failed to load categories:', err);
      showToast('Failed to load category list', 'error');
    }
  }

  // Load Expenses with active filters
  async function loadExpenses() {
    showLoading(true);
    clearToast();

    const queryParams = new URLSearchParams();
    if (searchInput && searchInput.value.trim()) queryParams.append('search', searchInput.value.trim());
    if (categoryFilter && categoryFilter.value) queryParams.append('category', categoryFilter.value);
    if (monthFilter && monthFilter.value) queryParams.append('month', monthFilter.value);
    if (yearFilter && yearFilter.value.trim()) queryParams.append('year', yearFilter.value.trim());

    try {
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await apiRequest(`/expenses${queryString}`);

      if (response && response.success && response.data) {
        const expenses = response.data.expenses || [];
        renderExpenses(expenses);
      } else {
        renderExpenses([]);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
      showToast(error.message || 'Error loading expenses', 'error');
      renderExpenses([]);
    } finally {
      showLoading(false);
    }
  }

  // Render expenses into table
  function renderExpenses(expenses) {
    currentExpensesList = expenses || [];
    if (!expensesTbody) return;
    expensesTbody.innerHTML = '';

    if (expenses.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      if (expensesTableContainer) expensesTableContainer.style.display = 'none';
      if (totalAmountDisplay) totalAmountDisplay.textContent = '₹0.00';
      if (totalCountDisplay) totalCountDisplay.textContent = '0';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (expensesTableContainer) expensesTableContainer.style.display = 'block';

    let totalSum = 0;

    expenses.forEach(item => {
      const amount = parseFloat(item.amount) || 0;
      totalSum += amount;

      const tr = document.createElement('tr');
      
      const badgeClass = getBadgeClass(item.category_name);
      const formattedDate = formatDate(item.expense_date);

      tr.innerHTML = `
        <td>${formattedDate}</td>
        <td><strong>${escapeHtml(item.title)}</strong></td>
        <td><span class="badge ${badgeClass}">${escapeHtml(item.category_name || 'General')}</span></td>
        <td class="expense-amount">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="color: var(--text-muted);">${escapeHtml(item.description || '-')}</td>
        <td class="text-right">
          <div class="action-buttons">
            <button type="button" class="btn-action btn-edit" data-id="${item.id}" aria-label="Edit expense ${escapeHtml(item.title)}">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button type="button" class="btn-action btn-danger" data-id="${item.id}" aria-label="Delete expense ${escapeHtml(item.title)}">
              <i class="fa-solid fa-trash-can"></i> Delete
            </button>
          </div>
        </td>
      `;

      // Attach action listeners
      const editBtn = tr.querySelector('.btn-edit');
      if (editBtn) {
        editBtn.addEventListener('click', () => openModalForEdit(item));
      }

      const deleteBtn = tr.querySelector('.btn-danger');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => openDeleteModal(item.id, item.title));
      }

      expensesTbody.appendChild(tr);
    });

    if (totalAmountDisplay) {
      totalAmountDisplay.textContent = `₹${totalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (totalCountDisplay) {
      totalCountDisplay.textContent = expenses.length.toString();
    }
  }

  // Open modal for Adding new expense
  function openModalForAdd() {
    if (!expenseModal) return;
    if (expenseForm) expenseForm.reset();
    clearFormErrors();
    if (expenseIdInput) expenseIdInput.value = '';
    if (modalTitle) modalTitle.textContent = 'Add New Expense';
    if (saveExpenseBtn) saveExpenseBtn.textContent = 'Save Expense';
    
    // Set default date to today YYYY-MM-DD in local time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    expenseDateInput.value = `${year}-${month}-${day}`;

    expenseModal.style.display = 'flex';
    requestAnimationFrame(() => {
      expenseModal.classList.add('active');
      if (expenseTitleInput) expenseTitleInput.focus();
    });
    expenseModal.setAttribute('aria-hidden', 'false');
  }

  // Open modal for Editing existing expense
  function openModalForEdit(item) {
    if (!expenseModal) return;
    if (expenseForm) expenseForm.reset();
    clearFormErrors();
    
    if (expenseIdInput) expenseIdInput.value = item.id;
    if (expenseTitleInput) expenseTitleInput.value = item.title;
    if (expenseAmountInput) expenseAmountInput.value = item.amount;
    if (expenseCategorySelect) expenseCategorySelect.value = item.category_id;
    
    // Normalize date format directly to YYYY-MM-DD without UTC shifts
    if (expenseDateInput && item.expense_date) {
      const datePart = typeof item.expense_date === 'string' ? item.expense_date.split('T')[0] : '';
      expenseDateInput.value = datePart;
    }

    if (expenseDescriptionInput) {
      expenseDescriptionInput.value = item.description || '';
    }

    if (modalTitle) modalTitle.textContent = 'Edit Expense';
    if (saveExpenseBtn) saveExpenseBtn.textContent = 'Update Expense';

    expenseModal.style.display = 'flex';
    requestAnimationFrame(() => {
      expenseModal.classList.add('active');
      if (expenseTitleInput) expenseTitleInput.focus();
    });
    expenseModal.setAttribute('aria-hidden', 'false');
  }

  // Close expense modal
  function closeModal() {
    if (!expenseModal) return;
    expenseModal.classList.remove('active');
    expenseModal.style.display = 'none';
    expenseModal.setAttribute('aria-hidden', 'true');
    if (expenseForm) expenseForm.reset();
    clearFormErrors();
  }

  // Handle Form Submit (Add or Edit)
  async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const id = expenseIdInput ? expenseIdInput.value : '';
    const title = expenseTitleInput ? expenseTitleInput.value.trim() : '';
    const amount = expenseAmountInput ? parseFloat(expenseAmountInput.value) : NaN;
    const category_id = expenseCategorySelect ? parseInt(expenseCategorySelect.value, 10) : NaN;
    const expense_date = expenseDateInput ? expenseDateInput.value : '';
    const description = expenseDescriptionInput ? expenseDescriptionInput.value.trim() : '';

    let hasError = false;

    const titleError = document.getElementById('titleError');
    const amountError = document.getElementById('amountError');
    const categoryError = document.getElementById('categoryError');
    const dateError = document.getElementById('dateError');

    if (!title) {
      if (titleError) titleError.textContent = 'Title is required.';
      hasError = true;
    }

    if (isNaN(amount) || amount <= 0) {
      if (amountError) amountError.textContent = 'Amount must be greater than 0.';
      hasError = true;
    }

    if (isNaN(category_id)) {
      if (categoryError) categoryError.textContent = 'Please select a category.';
      hasError = true;
    }

    if (!expense_date) {
      if (dateError) dateError.textContent = 'Expense date is required.';
      hasError = true;
    }

    if (hasError) return;

    if (saveExpenseBtn) saveExpenseBtn.disabled = true;

    const payload = { title, amount, category_id, expense_date, description };

    try {
      if (id) {
        // PUT update
        await apiRequest(`/expenses/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast('Expense updated successfully!', 'success');
      } else {
        // POST create
        await apiRequest('/expenses', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast('Expense added successfully!', 'success');
      }

      closeModal();
      await loadExpenses();
    } catch (error) {
      showToast(error.message || 'Failed to save expense', 'error');
    } finally {
      if (saveExpenseBtn) saveExpenseBtn.disabled = false;
    }
  }

  // Open Delete Confirmation Modal
  function openDeleteModal(id, title) {
    if (!deleteModal) return;
    currentExpenseToDelete = id;
    if (deleteExpenseTitle) deleteExpenseTitle.textContent = `"${title}"`;
    deleteModal.style.display = 'flex';
    requestAnimationFrame(() => {
      deleteModal.classList.add('active');
      if (confirmDeleteBtn) confirmDeleteBtn.focus();
    });
    deleteModal.setAttribute('aria-hidden', 'false');
  }

  // Close Delete Confirmation Modal
  function closeDeleteModal() {
    if (!deleteModal) return;
    deleteModal.classList.remove('active');
    deleteModal.style.display = 'none';
    deleteModal.setAttribute('aria-hidden', 'true');
    currentExpenseToDelete = null;
  }

  // Handle Confirm Delete
  async function handleConfirmDelete() {
    if (!currentExpenseToDelete) return;
    
    if (confirmDeleteBtn) confirmDeleteBtn.disabled = true;

    try {
      await apiRequest(`/expenses/${currentExpenseToDelete}`, {
        method: 'DELETE'
      });
      showToast('Expense deleted successfully', 'success');
      closeDeleteModal();
      await loadExpenses();
    } catch (error) {
      showToast(error.message || 'Failed to delete expense', 'error');
    } finally {
      if (confirmDeleteBtn) confirmDeleteBtn.disabled = false;
    }
  }

  // UI Helpers
  function showLoading(show) {
    if (!loadingState) return;
    loadingState.style.display = show ? 'flex' : 'none';
    if (show) {
      if (emptyState) emptyState.style.display = 'none';
      if (expensesTableContainer) expensesTableContainer.style.display = 'none';
    }
  }

  function showToast(message, type = 'success') {
    if (!toastMessage) return;
    toastMessage.textContent = message;
    toastMessage.className = `toast-notification ${type}`;
    toastMessage.style.display = 'block';

    setTimeout(() => {
      clearToast();
    }, 3500);
  }

  function clearToast() {
    if (!toastMessage) return;
    toastMessage.style.display = 'none';
    toastMessage.textContent = '';
  }

  function clearFormErrors() {
    const errorIds = ['titleError', 'amountError', 'categoryError', 'dateError'];
    errorIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
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

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    // Direct string decomposition without timezone offsets
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

  // Export Filtered Expenses to CSV File
  function exportExpensesToCSV() {
    if (!currentExpensesList || currentExpensesList.length === 0) {
      showToast('No expenses available to export.', 'error');
      return;
    }

    const headers = ['Date', 'Title', 'Category', 'Amount (INR)', 'Description'];
    const rows = currentExpensesList.map(exp => {
      const dateVal = exp.expense_date ? (typeof exp.expense_date === 'string' ? exp.expense_date.split('T')[0] : exp.expense_date) : '';
      const amountVal = (parseFloat(exp.amount) || 0).toFixed(2);
      return [
        dateVal,
        exp.title || '',
        exp.category_name || 'Other',
        amountVal,
        exp.description || ''
      ];
    });

    // Build RFC 4180 CSV content
    const csvContent = [
      headers.map(escapeCsvField).join(','),
      ...rows.map(row => row.map(escapeCsvField).join(','))
    ].join('\r\n');

    // Create Blob with UTF-8 BOM so Excel opens with correct encoding
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `ExpenseFlow_Expenses_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Successfully exported ${currentExpensesList.length} expenses to CSV!`, 'success');
  }

  function escapeCsvField(field) {
    if (field === null || field === undefined) return '""';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }
});
