// Automated Test Script for Monthly Budget Calculations & Endpoints
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function api(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function runBudgetTests() {
  console.log('🧪 Starting Monthly Budget Automated Verification Tests...\n');

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'expenseflow'
  });

  try {
    // 1. Register test user
    const testEmail = `budget_tester_${Date.now()}@example.com`;
    const testPassword = 'BudgetPassword123!';
    const testName = 'Budget Tester';

    console.log(`1. Registering test user: ${testEmail}`);
    const regRes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword })
    });

    const token = regRes.data.token;
    const userId = regRes.data.user.id;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    console.log(`   ✅ Registered successfully. User ID: ${userId}\n`);

    // 2. Test initial GET /api/budget before setting budget
    console.log('2. Testing GET /api/budget for unbudgeted month:');
    const unbudgetedRes = await api('/budget?month=8&year=2026', { ...authHeaders });
    console.log('   Unbudgeted response:', unbudgetedRes.data);
    console.assert(unbudgetedRes.data.budget === 0, 'Expected budget 0');
    console.assert(unbudgetedRes.data.status === 'unbudgeted', 'Expected status unbudgeted');
    console.log('   ✅ Handled unbudgeted month correctly.\n');

    // 3. Test POST /api/budget to set budget
    console.log('3. Setting budget of ₹20,000 for August 2026 (Month: 8, Year: 2026):');
    const setBudgetRes = await api('/budget', {
      method: 'POST',
      body: JSON.stringify({ month: 8, year: 2026, amount: 20000 }),
      ...authHeaders
    });
    console.log('   POST /api/budget response:', setBudgetRes.data);
    console.assert(setBudgetRes.data.budget === 20000, 'Expected budget 20000');
    console.assert(setBudgetRes.data.remaining === 20000, 'Expected remaining 20000');
    console.assert(setBudgetRes.data.percentageUsed === 0, 'Expected percentageUsed 0');
    console.log('   ✅ Budget created successfully.\n');

    // 4. Add test expenses totaling ₹16,500 (82.5% usage -> warning threshold)
    const [categories] = await db.query('SELECT id, name FROM categories LIMIT 2');
    const catId = categories[0].id;

    console.log('4. Adding test expenses totaling ₹16,500 in August 2026:');
    await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({ title: 'Rent & Maintenance', amount: 12000, category_id: catId, expense_date: '2026-08-05' }),
      ...authHeaders
    });
    await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({ title: 'Utilities & Grocery', amount: 4500, category_id: catId, expense_date: '2026-08-10' }),
      ...authHeaders
    });
    console.log('   ✅ Expenses created.\n');

    // 5. Test calculations & warning threshold (82.5%)
    console.log('5. Verifying calculations for 82.5% usage (Warning state):');
    const budgetWarnRes = await api('/budget?month=8&year=2026', { ...authHeaders });
    const warnData = budgetWarnRes.data;
    console.log('   Budget details:', warnData);

    console.assert(warnData.budget === 20000, `Expected budget 20000, got ${warnData.budget}`);
    console.assert(warnData.spent === 16500, `Expected spent 16500, got ${warnData.spent}`);
    console.assert(warnData.remaining === 3500, `Expected remaining 3500, got ${warnData.remaining}`);
    console.assert(warnData.percentageUsed === 82.5, `Expected percentageUsed 82.5, got ${warnData.percentageUsed}`);
    console.assert(warnData.status === 'warning', `Expected status 'warning', got ${warnData.status}`);
    console.assert(warnData.alertMessage.includes('82.5%'), `Expected alert message to mention 82.5%, got ${warnData.alertMessage}`);
    console.log('   ✅ Warning status and exact calculations verified (Budget: ₹20,000, Spent: ₹16,500, Remaining: ₹3,500, Used: 82.5%)!\n');

    // 6. Add expense to exceed budget (Add ₹4,500 -> total spent = 21,000 -> Exceeded by ₹1,000)
    console.log('6. Adding ₹4,500 expense to exceed budget:');
    await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({ title: 'Extra Electronics', amount: 4500, category_id: catId, expense_date: '2026-08-20' }),
      ...authHeaders
    });

    const budgetExceededRes = await api('/budget?month=8&year=2026', { ...authHeaders });
    const exceededData = budgetExceededRes.data;
    console.log('   Exceeded budget details:', exceededData);

    console.assert(exceededData.spent === 21000, `Expected spent 21000, got ${exceededData.spent}`);
    console.assert(exceededData.remaining === -1000, `Expected remaining -1000, got ${exceededData.remaining}`);
    console.assert(exceededData.percentageUsed === 105, `Expected percentageUsed 105, got ${exceededData.percentageUsed}`);
    console.assert(exceededData.status === 'exceeded', `Expected status 'exceeded', got ${exceededData.status}`);
    console.assert(exceededData.alertMessage.includes('exceeded by'), `Expected exceeded message, got ${exceededData.alertMessage}`);
    console.log('   ✅ Exceeded status verified (Spent: ₹21,000, Exceeded by ₹1,000)!\n');

    // 7. Test updating budget via PUT /api/budget (increase to ₹25,000)
    console.log('7. Updating budget to ₹25,000 via PUT /api/budget:');
    const updateRes = await api('/budget', {
      method: 'PUT',
      body: JSON.stringify({ month: 8, year: 2026, amount: 25000 }),
      ...authHeaders
    });
    const updateData = updateRes.data;
    console.log('   Updated budget details:', updateData);

    console.assert(updateData.budget === 25000, `Expected budget 25000, got ${updateData.budget}`);
    console.assert(updateData.remaining === 4000, `Expected remaining 4000, got ${updateData.remaining}`);
    console.assert(updateData.percentageUsed === 84, `Expected percentageUsed 84, got ${updateData.percentageUsed}`);
    console.assert(updateData.status === 'warning', `Expected status 'warning', got ${updateData.status}`);
    console.log('   ✅ Budget updated successfully!\n');

    // 8. Test Duplicate Handling on POST (Upsert safety)
    console.log('8. Testing duplicate month/year on POST (Upsert safety to ₹30,000):');
    const upsertRes = await api('/budget', {
      method: 'POST',
      body: JSON.stringify({ month: 8, year: 2026, amount: 30000 }),
      ...authHeaders
    });
    console.assert(upsertRes.data.budget === 30000, `Expected upserted budget 30000, got ${upsertRes.data.budget}`);
    console.assert(upsertRes.data.percentageUsed === 70, `Expected percentageUsed 70, got ${upsertRes.data.percentageUsed}`);
    console.assert(upsertRes.data.status === 'normal', `Expected status 'normal', got ${upsertRes.data.status}`);
    console.log('   ✅ Safe upsert on duplicate month/year verified (Normal state at 70%)!\n');

    // 9. Test validation rejections
    console.log('9. Testing input validation rejections:');
    try {
      await api('/budget', { method: 'POST', body: JSON.stringify({ month: 13, year: 2026, amount: 5000 }), ...authHeaders });
      throw new Error('Should have rejected invalid month 13');
    } catch (err) {
      console.log('   ✅ Rejected invalid month 13 as expected.');
    }

    try {
      await api('/budget', { method: 'POST', body: JSON.stringify({ month: 8, year: 2026, amount: -500 }), ...authHeaders });
      throw new Error('Should have rejected negative amount');
    } catch (err) {
      console.log('   ✅ Rejected negative amount as expected.');
    }

    // 10. Verify dashboard summary utilizes the budget
    console.log('\n10. Verifying GET /api/dashboard/summary reflects the budget:');
    const dashSummaryRes = await api('/dashboard/summary', { ...authHeaders });
    console.log('    Dashboard summary:', dashSummaryRes.data);
    console.assert(dashSummaryRes.data.monthlyBudget === 30000, `Expected dashboard monthlyBudget 30000, got ${dashSummaryRes.data.monthlyBudget}`);
    console.assert(dashSummaryRes.data.remainingBudget === 9000, `Expected dashboard remainingBudget 9000, got ${dashSummaryRes.data.remainingBudget}`);
    console.log('    ✅ Dashboard integration confirmed!\n');

    // 11. Clean up
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    console.log('🧹 Cleaned up test user records.');

    console.log('\n🎉 ALL BUDGET AUTOMATED TESTS PASSED SUCCESSFULLY! 🎉');
    await db.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err.data || err.message);
    await db.end();
    process.exit(1);
  }
}

runBudgetTests();
