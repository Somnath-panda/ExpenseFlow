// Expense Management Frontend Logic - Vanilla JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // 1. Guard against unauthenticated access
  const token = getToken();
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
  const logoutBtn = document.getElementById('logoutBtn');

  // Modal Elements
  const expenseModal = document.getElementById('expenseModal');
  const openAddModalBtn = document.getElementById('openAddModalBtn');
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
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadExpenses, 300);
    });

    categoryFilter.addEventListener('change', loadExpenses);
    monthFilter.addEventListener('change', loadExpenses);
    yearFilter.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadExpenses, 300);
    });

    resetFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      categoryFilter.value = '';
      monthFilter.value = '';
      yearFilter.value = '';
      loadExpenses();
    });

    // Add Expense Modal Open
    openAddModalBtn.addEventListener('click', () => {
      openModalForAdd();
    });

    // Modal Close
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    expenseModal.addEventListener('click', (e) => {
      if (e.target === expenseModal) closeModal();
    });

    // Form Submit
    expenseForm.addEventListener('submit', handleFormSubmit);

    // Delete Modal Close
    closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });

    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

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
      
      categoryFilter.innerHTML = '<option value="">All Categories</option>';
      expenseCategorySelect.innerHTML = '<option value="">Select Category</option>';

      categoryList.forEach(cat => {
        const optionFilter = document.createElement('option');
        optionFilter.value = cat.id;
        optionFilter.textContent = cat.name;
        categoryFilter.appendChild(optionFilter);

        const optionForm = document.createElement('option');
        optionForm.value = cat.id;
        optionForm.textContent = cat.name;
        expenseCategorySelect.appendChild(optionForm);
      });
    } catch (err) {
      showToast('Failed to load category list', 'error');
    }
  }

  // Load Expenses with active filters
  async function loadExpenses() {
    showLoading(true);
    clearToast();

    const queryParams = new URLSearchParams();
    if (searchInput.value.trim()) queryParams.append('search', searchInput.value.trim());
    if (categoryFilter.value) queryParams.append('category', categoryFilter.value);
    if (monthFilter.value) queryParams.append('month', monthFilter.value);
    if (yearFilter.value.trim()) queryParams.append('year', yearFilter.value.trim());

    try {
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await apiRequest(`/expenses${queryString}`);

      if (response && response.success && response.data) {
        const expenses = response.data.expenses || [];
        renderExpenses(expenses);
      }
    } catch (error) {
      showToast(error.message || 'Error loading expenses', 'error');
      renderExpenses([]);
    } finally {
      showLoading(false);
    }
  }

  // Render expenses into table
  function renderExpenses(expenses) {
    expensesTbody.innerHTML = '';

    if (expenses.length === 0) {
      emptyState.style.display = 'block';
      expensesTableContainer.style.display = 'none';
      totalAmountDisplay.textContent = '₹0.00';
      totalCountDisplay.textContent = '0';
      return;
    }

    emptyState.style.display = 'none';
    expensesTableContainer.style.display = 'block';

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
        <td><span class="badge ${badgeClass}">${escapeHtml(item.category_name || 'Other')}</span></td>
        <td class="expense-amount">₹${amount.toFixed(2)}</td>
        <td>${escapeHtml(item.description || '-')}</td>
        <td class="text-right">
          <div class="action-buttons">
            <button type="button" class="btn btn-action btn-edit" data-id="${item.id}">Edit</button>
            <button type="button" class="btn btn-action btn-danger" data-id="${item.id}" data-title="${escapeHtml(item.title)}">Delete</button>
          </div>
        </td>
      `;

      // Attach action listeners
      const editBtn = tr.querySelector('.btn-edit');
      editBtn.addEventListener('click', () => openModalForEdit(item));

      const deleteBtn = tr.querySelector('.btn-danger');
      deleteBtn.addEventListener('click', () => openDeleteModal(item.id, item.title));

      expensesTbody.appendChild(tr);
    });

    totalAmountDisplay.textContent = `₹${totalSum.toFixed(2)}`;
    totalCountDisplay.textContent = expenses.length.toString();
  }

  // Open modal for Adding new expense
  function openModalForAdd() {
    expenseForm.reset();
    clearFormErrors();
    expenseIdInput.value = '';
    modalTitle.textContent = 'Add New Expense';
    saveExpenseBtn.textContent = 'Save Expense';
    
    // Set default date to today YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    expenseDateInput.value = today;

    expenseModal.style.display = 'flex';
    expenseModal.setAttribute('aria-hidden', 'false');
  }

  // Open modal for Editing existing expense
  function openModalForEdit(item) {
    expenseForm.reset();
    clearFormErrors();
    
    expenseIdInput.value = item.id;
    expenseTitleInput.value = item.title;
    expenseAmountInput.value = item.amount;
    expenseCategorySelect.value = item.category_id;
    
    // Normalize date format to YYYY-MM-DD
    const rawDate = new Date(item.expense_date);
    const formattedDate = rawDate.toISOString().split('T')[0];
    expenseDateInput.value = formattedDate;

    expenseDescriptionInput.value = item.description || '';

    modalTitle.textContent = 'Edit Expense';
    saveExpenseBtn.textContent = 'Update Expense';

    expenseModal.style.display = 'flex';
    expenseModal.setAttribute('aria-hidden', 'false');
  }

  // Close expense modal
  function closeModal() {
    expenseModal.style.display = 'none';
    expenseModal.setAttribute('aria-hidden', 'true');
    expenseForm.reset();
    clearFormErrors();
  }

  // Handle Form Submit (Add or Edit)
  async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const id = expenseIdInput.value;
    const title = expenseTitleInput.value.trim();
    const amount = parseFloat(expenseAmountInput.value);
    const category_id = parseInt(expenseCategorySelect.value, 10);
    const expense_date = expenseDateInput.value;
    const description = expenseDescriptionInput.value.trim();

    let hasError = false;

    if (!title) {
      document.getElementById('titleError').textContent = 'Title is required.';
      hasError = true;
    }

    if (isNaN(amount) || amount <= 0) {
      document.getElementById('amountError').textContent = 'Amount must be greater than 0.';
      hasError = true;
    }

    if (isNaN(category_id)) {
      document.getElementById('categoryError').textContent = 'Please select a category.';
      hasError = true;
    }

    if (!expense_date) {
      document.getElementById('dateError').textContent = 'Expense date is required.';
      hasError = true;
    }

    if (hasError) return;

    saveExpenseBtn.disabled = true;

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
      saveExpenseBtn.disabled = false;
    }
  }

  // Open Delete Confirmation Modal
  function openDeleteModal(id, title) {
    currentExpenseToDelete = id;
    deleteExpenseTitle.textContent = `"${title}"`;
    deleteModal.style.display = 'flex';
    deleteModal.setAttribute('aria-hidden', 'false');
  }

  // Close Delete Confirmation Modal
  function closeDeleteModal() {
    deleteModal.style.display = 'none';
    deleteModal.setAttribute('aria-hidden', 'true');
    currentExpenseToDelete = null;
  }

  // Handle Confirm Delete
  async function handleConfirmDelete() {
    if (!currentExpenseToDelete) return;
    
    confirmDeleteBtn.disabled = true;

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
      confirmDeleteBtn.disabled = false;
    }
  }

  // UI Helpers
  function showLoading(show) {
    loadingState.style.display = show ? 'flex' : 'none';
    if (show) {
      emptyState.style.display = 'none';
      expensesTableContainer.style.display = 'none';
    }
  }

  function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toastMessage.className = `toast-notification ${type}`;
    toastMessage.style.display = 'block';

    setTimeout(() => {
      clearToast();
    }, 3500);
  }

  function clearToast() {
    toastMessage.style.display = 'none';
    toastMessage.textContent = '';
  }

  function clearFormErrors() {
    document.getElementById('titleError').textContent = '';
    document.getElementById('amountError').textContent = '';
    document.getElementById('categoryError').textContent = '';
    document.getElementById('dateError').textContent = '';
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
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
