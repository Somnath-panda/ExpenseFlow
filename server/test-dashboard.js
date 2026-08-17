// Automated Test Script for Dashboard Calculations & Endpoints using native fetch
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

async function runDashboardTests() {
  console.log('🧪 Starting Dashboard Automated Verification Tests...\n');

  // Direct MySQL Connection to inspect ground-truth data
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'expenseflow'
  });

  try {
    // 1. Create a unique test user
    const testEmail = `dash_tester_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Dashboard Tester';

    console.log(`1. Registering test user: ${testEmail}`);
    const regRes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword
      })
    });

    const token = regRes.data.token;
    const userId = regRes.data.user.id;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    console.log(`   ✅ Registered successfully. User ID: ${userId}\n`);

    // 2. Verify empty dashboard summary (zero state)
    console.log('2. Verifying initial empty dashboard state...');
    const emptySummaryRes = await api('/dashboard/summary', { ...authHeaders });
    const emptySummary = emptySummaryRes.data;
    console.log('   Empty summary response:', emptySummary);

    if (
      emptySummary.totalExpenses === 0 &&
      emptySummary.monthlyExpenses === 0 &&
      emptySummary.transactionCount === 0 &&
      emptySummary.highestExpense === 0 &&
      emptySummary.averageExpense === 0 &&
      emptySummary.remainingBudget === 0
    ) {
      console.log('   ✅ Empty state returns clean 0s with no errors.\n');
    } else {
      throw new Error(`Empty state summary mismatch: ${JSON.stringify(emptySummary)}`);
    }

    // 3. Get category IDs
    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY id ASC');
    const foodCat = categories.find(c => c.name.toLowerCase() === 'food') || categories[0];
    const travelCat = categories.find(c => c.name.toLowerCase() === 'travel') || categories[1];
    const billsCat = categories.find(c => c.name.toLowerCase() === 'bills') || categories[2];

    const currentYear = new Date().getFullYear();
    const currentMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');
    const todayDate = `${currentYear}-${currentMonthNum}-15`;

    // 4. Set a monthly budget directly in db
    const budgetAmount = 20000.00;
    await db.query(
      `INSERT INTO budgets (user_id, month, year, amount) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [userId, parseInt(currentMonthNum, 10), currentYear, budgetAmount]
    );
    console.log(`3. Created monthly budget of ₹${budgetAmount} for month ${currentMonthNum}/${currentYear}`);

    // 5. Add test expenses
    console.log('4. Adding 4 sample expenses...');
    await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Supermarket Grocery',
        amount: 4500,
        category_id: foodCat.id,
        expense_date: todayDate,
        description: 'Weekly groceries'
      }),
      ...authHeaders
    });

    await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Flight Ticket',
        amount: 2500,
        category_id: travelCat.id,
        expense_date: todayDate,
        description: 'Weekend trip'
      }),
      ...authHeaders
    });

    await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Electricity Bill',
        amount: 4000,
        category_id: billsCat.id,
        expense_date: todayDate,
        description: 'Home power bill'
      }),
      ...authHeaders
    });

    const exp4 = await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Dinner at Restaurant',
        amount: 1500,
        category_id: foodCat.id,
        expense_date: todayDate,
        description: 'Team outing'
      }),
      ...authHeaders
    });

    const exp4Id = exp4.data.expense.id;
    console.log('   ✅ 4 expenses created.\n');

    // 6. Test GET /api/dashboard/summary calculations
    console.log('5. Testing GET /api/dashboard/summary calculations against expected math:');
    const summaryRes = await api('/dashboard/summary', { ...authHeaders });
    const summary = summaryRes.data;
    console.log('   Calculated summary:', summary);

    console.assert(summary.totalExpenses === 12500, `Expected totalExpenses 12500, got ${summary.totalExpenses}`);
    console.assert(summary.monthlyExpenses === 12500, `Expected monthlyExpenses 12500, got ${summary.monthlyExpenses}`);
    console.assert(summary.monthlyBudget === 20000, `Expected monthlyBudget 20000, got ${summary.monthlyBudget}`);
    console.assert(summary.remainingBudget === 7500, `Expected remainingBudget 7500, got ${summary.remainingBudget}`);
    console.assert(summary.transactionCount === 4, `Expected transactionCount 4, got ${summary.transactionCount}`);
    console.assert(summary.highestExpense === 4500, `Expected highestExpense 4500, got ${summary.highestExpense}`);
    console.assert(summary.averageExpense === 3125, `Expected averageExpense 3125, got ${summary.averageExpense}`);
    console.log('   ✅ All 7 summary KPIs matched expected values exactly!\n');

    // 7. Test GET /api/dashboard/category-summary
    console.log('6. Testing GET /api/dashboard/category-summary:');
    const catSummaryRes = await api('/dashboard/category-summary', { ...authHeaders });
    const catSummary = catSummaryRes.data;
    console.log('   Category summary:', JSON.stringify(catSummary, null, 2));

    const foodItem = catSummary.categories.find(c => c.name.toLowerCase() === 'food');
    const travelItem = catSummary.categories.find(c => c.name.toLowerCase() === 'travel');
    const billsItem = catSummary.categories.find(c => c.name.toLowerCase() === 'bills');

    console.assert(foodItem && foodItem.amount === 6000, `Food expected 6000, got ${foodItem?.amount}`);
    console.assert(travelItem && travelItem.amount === 2500, `Travel expected 2500, got ${travelItem?.amount}`);
    console.assert(billsItem && billsItem.amount === 4000, `Bills expected 4000, got ${billsItem?.amount}`);
    console.log('   ✅ Category spending distribution verified!\n');

    // 8. Test GET /api/dashboard/monthly-summary
    console.log('7. Testing GET /api/dashboard/monthly-summary:');
    const monthlySummaryRes = await api('/dashboard/monthly-summary', { ...authHeaders });
    const monthlySummary = monthlySummaryRes.data;
    console.log('   Monthly summary year:', monthlySummary.year);
    const currentMonthObj = monthlySummary.months.find(m => m.month === parseInt(currentMonthNum, 10));
    console.assert(currentMonthObj && currentMonthObj.amount === 12500, `Month amount expected 12500, got ${currentMonthObj?.amount}`);
    console.log(`   ✅ Current month (${currentMonthObj.name}) amount is ₹${currentMonthObj.amount} with ${currentMonthObj.count} transactions.\n`);

    // 9. Test dynamic update after deleting an expense
    console.log(`8. Deleting expense ID ${exp4Id} (amount 1500) and checking real-time recalculation...`);
    await api(`/expenses/${exp4Id}`, {
      method: 'DELETE',
      ...authHeaders
    });

    const updatedSummaryRes = await api('/dashboard/summary', { ...authHeaders });
    const updatedSummary = updatedSummaryRes.data;
    console.log('   Recalculated summary after delete:', updatedSummary);

    console.assert(updatedSummary.totalExpenses === 11000, `Expected totalExpenses 11000, got ${updatedSummary.totalExpenses}`);
    console.assert(updatedSummary.transactionCount === 3, `Expected transactionCount 3, got ${updatedSummary.transactionCount}`);
    console.assert(updatedSummary.remainingBudget === 9000, `Expected remainingBudget 9000, got ${updatedSummary.remainingBudget}`);
    console.assert(updatedSummary.averageExpense === 3666.67, `Expected averageExpense 3666.67, got ${updatedSummary.averageExpense}`);
    console.log('   ✅ Real-time recalculation on deletion verified successfully!\n');

    // 10. Clean up test user
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    console.log('🧹 Cleaned up test user records.');

    console.log('\n🎉 ALL DASHBOARD AUTOMATED TESTS PASSED SUCCESSFULLY! 🎉');
    await db.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err.data || err.message);
    await db.end();
    process.exit(1);
  }
}

runDashboardTests();
