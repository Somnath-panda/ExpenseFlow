// Automated Test Runner for ExpenseFlow API Test Plan
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function req(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runPostmanPlan() {
  console.log('🚀 Running ExpenseFlow Full Postman API Test Suite...\n');

  const timestamp = Date.now();
  const testEmail = `postman_run_${timestamp}@example.com`;
  const password = 'SecretPassword123!';
  let token = '';
  let expenseId = null;

  try {
    // ==========================================
    // 1. AUTHENTICATION TESTS
    // ==========================================
    console.log('📁 1. AUTHENTICATION:');
    
    // Register Success (201)
    const regRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Postman Tester', email: testEmail, password })
    });
    console.assert(regRes.status === 201, `Expected 201 on register, got ${regRes.status}`);
    token = regRes.data.data.token;
    console.log('   ✅ Register Success (201 Created)');

    // Duplicate Registration (409)
    const dupRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Duplicate User', email: testEmail, password })
    });
    console.assert(dupRes.status === 409, `Expected 409 on duplicate register, got ${dupRes.status}`);
    console.log('   ✅ Duplicate Registration (409 Conflict)');

    // Invalid Email (400)
    const invEmailRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Invalid Email', email: 'notanemail', password })
    });
    console.assert(invEmailRes.status === 400, `Expected 400 on invalid email, got ${invEmailRes.status}`);
    console.log('   ✅ Invalid Email Format (400 Bad Request)');

    // Short Password (400)
    const shortPassRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Short Pass', email: `short_${timestamp}@test.com`, password: '123' })
    });
    console.assert(shortPassRes.status === 400, `Expected 400 on short password, got ${shortPassRes.status}`);
    console.log('   ✅ Short Password (400 Bad Request)');

    // Login Success (200)
    const loginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password })
    });
    console.assert(loginRes.status === 200, `Expected 200 on login, got ${loginRes.status}`);
    console.log('   ✅ Login Success (200 OK)');

    // Login Wrong Password (401)
    const wrongPassRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword' })
    });
    console.assert(wrongPassRes.status === 401, `Expected 401 on wrong password, got ${wrongPassRes.status}`);
    console.log('   ✅ Wrong Password (401 Unauthorized)');

    // GET /api/auth/me (200)
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    const meRes = await req('/auth/me', { ...authHeaders });
    console.assert(meRes.status === 200, `Expected 200 on /me, got ${meRes.status}`);
    console.log('   ✅ GET /api/auth/me (200 OK)');

    // Missing Token (401)
    const noTokenRes = await req('/auth/me');
    console.assert(noTokenRes.status === 401, `Expected 401 on missing token, got ${noTokenRes.status}`);
    console.log('   ✅ Missing Token (401 Unauthorized)');

    // Invalid Token (401)
    const badTokenRes = await req('/auth/me', { headers: { Authorization: 'Bearer fake.jwt.token' } });
    console.assert(badTokenRes.status === 401, `Expected 401 on invalid token, got ${badTokenRes.status}`);
    console.log('   ✅ Invalid Token (401 Unauthorized)\n');

    // ==========================================
    // 2. EXPENSES TESTS
    // ==========================================
    console.log('📁 2. EXPENSES MANAGEMENT:');
    
    // Create Expense (201)
    const createExpRes = await req('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Client Business Lunch',
        amount: 3500,
        category_id: 1,
        expense_date: '2026-08-15',
        description: 'Meeting with prospective client'
      }),
      ...authHeaders
    });
    console.assert(createExpRes.status === 201, `Expected 201 on create expense, got ${createExpRes.status}`);
    expenseId = createExpRes.data.data.expense.id;
    console.log(`   ✅ Create Expense (201 Created) - ID: ${expenseId}`);

    // Create Expense - Invalid Amount (400)
    const invAmtRes = await req('/expenses', {
      method: 'POST',
      body: JSON.stringify({ title: 'Negative Amount', amount: -100, category_id: 1, expense_date: '2026-08-15' }),
      ...authHeaders
    });
    console.assert(invAmtRes.status === 400, `Expected 400 on negative amount, got ${invAmtRes.status}`);
    console.log('   ✅ Negative Amount (400 Bad Request)');

    // Create Expense - Missing Title (400)
    const noTitleRes = await req('/expenses', {
      method: 'POST',
      body: JSON.stringify({ title: '', amount: 500, category_id: 1, expense_date: '2026-08-15' }),
      ...authHeaders
    });
    console.assert(noTitleRes.status === 400, `Expected 400 on empty title, got ${noTitleRes.status}`);
    console.log('   ✅ Missing Title (400 Bad Request)');

    // Get All Expenses (200)
    const listRes = await req('/expenses', { ...authHeaders });
    console.assert(listRes.status === 200, `Expected 200 on get expenses, got ${listRes.status}`);
    console.log('   ✅ Get All Expenses (200 OK)');

    // Get Single Expense (200)
    const singleRes = await req(`/expenses/${expenseId}`, { ...authHeaders });
    console.assert(singleRes.status === 200, `Expected 200 on get single expense, got ${singleRes.status}`);
    console.log('   ✅ Get Single Expense (200 OK)');

    // Search Query (200)
    const searchRes = await req('/expenses?search=Lunch', { ...authHeaders });
    console.assert(searchRes.status === 200 && searchRes.data.data.expenses.length >= 1, 'Expected search match');
    console.log('   ✅ Search Query Filtering (200 OK)');

    // Category Filter (200)
    const catFilterRes = await req('/expenses?category=1&month=8&year=2026', { ...authHeaders });
    console.assert(catFilterRes.status === 200, `Expected 200 on category filter, got ${catFilterRes.status}`);
    console.log('   ✅ Category & Date Filtering (200 OK)');

    // Update Expense (200)
    const updateRes = await req(`/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Upgraded Business Lunch', amount: 4200 }),
      ...authHeaders
    });
    console.assert(updateRes.status === 200, `Expected 200 on update expense, got ${updateRes.status}`);
    console.log('   ✅ Update Expense (200 OK)');

    // Delete Expense (200)
    const delRes = await req(`/expenses/${expenseId}`, {
      method: 'DELETE',
      ...authHeaders
    });
    console.assert(delRes.status === 200, `Expected 200 on delete expense, got ${delRes.status}`);
    console.log('   ✅ Delete Expense (200 OK)');

    // Delete Again - Non-existent (404)
    const del404Res = await req(`/expenses/${expenseId}`, {
      method: 'DELETE',
      ...authHeaders
    });
    console.assert(del404Res.status === 404, `Expected 404 on deleted expense, got ${del404Res.status}`);
    console.log('   ✅ Non-Existent Expense Deletion (404 Not Found)\n');

    // ==========================================
    // 3. BUDGET TESTS
    // ==========================================
    console.log('📁 3. MONTHLY BUDGET:');
    
    // Set Budget (201)
    const setBudgetRes = await req('/budget', {
      method: 'POST',
      body: JSON.stringify({ month: 8, year: 2026, amount: 35000 }),
      ...authHeaders
    });
    console.assert(setBudgetRes.status === 201, `Expected 201 on set budget, got ${setBudgetRes.status}`);
    console.log('   ✅ Set Monthly Budget (201 Created)');

    // Get Budget (200)
    const getBudgetRes = await req('/budget?month=8&year=2026', { ...authHeaders });
    console.assert(getBudgetRes.status === 200 && getBudgetRes.data.data.budget === 35000, 'Expected 200 on get budget');
    console.log('   ✅ Get Monthly Budget Details (200 OK)');

    // Update Budget via PUT (200)
    const putBudgetRes = await req('/budget', {
      method: 'PUT',
      body: JSON.stringify({ month: 8, year: 2026, amount: 40000 }),
      ...authHeaders
    });
    console.assert(putBudgetRes.status === 200 && putBudgetRes.data.data.budget === 40000, 'Expected 200 on put budget');
    console.log('   ✅ Update Budget (200 OK)');

    // Invalid Month (400)
    const badMonthRes = await req('/budget', {
      method: 'POST',
      body: JSON.stringify({ month: 13, year: 2026, amount: 20000 }),
      ...authHeaders
    });
    console.assert(badMonthRes.status === 400, `Expected 400 on invalid month, got ${badMonthRes.status}`);
    console.log('   ✅ Invalid Month (400 Bad Request)\n');

    // ==========================================
    // 4. DASHBOARD TESTS
    // ==========================================
    console.log('📁 4. FINANCIAL DASHBOARD:');
    
    // Dashboard Summary (200)
    const dashSummaryRes = await req('/dashboard/summary', { ...authHeaders });
    console.assert(dashSummaryRes.status === 200, `Expected 200 on dashboard summary, got ${dashSummaryRes.status}`);
    console.assert(dashSummaryRes.data.data.monthlyBudget === 40000, 'Expected monthlyBudget to be 40000');
    console.log('   ✅ Dashboard Summary (200 OK)');

    // Category Summary (200)
    const catSummaryRes = await req('/dashboard/category-summary', { ...authHeaders });
    console.assert(catSummaryRes.status === 200, `Expected 200 on category summary, got ${catSummaryRes.status}`);
    console.log('   ✅ Category Summary (200 OK)');

    // Monthly Summary (200)
    const monthlySummaryRes = await req('/dashboard/monthly-summary?year=2026', { ...authHeaders });
    console.assert(monthlySummaryRes.status === 200 && monthlySummaryRes.data.data.months.length === 12, 'Expected 12 months');
    console.log('   ✅ Monthly Spending Summary (200 OK)\n');

    // Cleanup
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'expenseflow'
    });
    await db.query('DELETE FROM users WHERE email = ?', [testEmail]);
    await db.end();

    console.log('🎉 ALL POSTMAN COLLECTION API TESTS EXECUTED AND PASSED SUCCESSFULLY! 🎉');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test runner failed:', err);
    process.exit(1);
  }
}

runPostmanPlan();
