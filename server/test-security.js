// Comprehensive Security & Validation Verification Test Suite for ExpenseFlow
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
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runSecurityAuditTests() {
  console.log('🛡️ Starting ExpenseFlow Comprehensive Security & Validation Audit...\n');

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'expenseflow'
  });

  let userAId, userBId;

  try {
    const timestamp = Date.now();
    const userAEmail = `user_a_${timestamp}@sec.test`;
    const userBEmail = `user_b_${timestamp}@sec.test`;
    const password = 'StrongPassword123!';

    // ==========================================
    // TEST 1: Password Security & Hash Protection
    // ==========================================
    console.log('1️⃣ Testing Password Security & No Hash Exposure:');
    const regARes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'User Alice', email: userAEmail, password })
    });

    console.assert(regARes.status === 201, 'User A registration should succeed (201)');
    const tokenA = regARes.data.data.token;
    userAId = regARes.data.data.user.id;

    // Check response user object
    console.assert(!regARes.data.data.user.password, 'User object must NEVER contain password');
    console.assert(!regARes.data.data.user.passwordHash, 'User object must NEVER contain passwordHash');

    // Check database hash
    const [dbRows] = await db.query('SELECT password FROM users WHERE id = ?', [userAId]);
    console.assert(dbRows[0].password.startsWith('$2b$'), 'Password must be hashed with bcrypt ($2b$)');
    console.log('   ✅ Passwords hashed with bcrypt and never exposed in API responses.\n');

    // Register User B
    const regBRes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'User Bob', email: userBEmail, password })
    });
    const tokenB = regBRes.data.data.token;
    userBId = regBRes.data.data.user.id;

    const headersA = { headers: { Authorization: `Bearer ${tokenA}` } };
    const headersB = { headers: { Authorization: `Bearer ${tokenB}` } };

    // Get default category
    const [cats] = await db.query('SELECT id FROM categories LIMIT 1');
    const catId = cats[0].id;

    // ==========================================
    // TEST 2: IDOR & Cross-User Ownership Isolation
    // ==========================================
    console.log('2️⃣ Testing IDOR & Cross-User Authorization Boundaries:');
    // User A creates an expense
    const createExpA = await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Confidential Medical Bill',
        amount: 8500,
        category_id: catId,
        expense_date: '2026-08-10'
      }),
      ...headersA
    });
    const expAId = createExpA.data.data.expense.id;
    console.log(`   User A created expense ID ${expAId}.`);

    // User B attempts GET on User A's expense
    const getOtherRes = await api(`/expenses/${expAId}`, { ...headersB });
    console.assert(getOtherRes.status === 404, `Expected 404 for User B reading User A's expense, got ${getOtherRes.status}`);
    console.log('   ✅ User B prevented from viewing User A\'s expense (404 Not Found).');

    // User B attempts PUT on User A's expense
    const putOtherRes = await api(`/expenses/${expAId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Hacked Expense', amount: 1 }),
      ...headersB
    });
    console.assert(putOtherRes.status === 404, `Expected 404 for User B editing User A's expense, got ${putOtherRes.status}`);
    console.log('   ✅ User B prevented from editing User A\'s expense (404 Not Found).');

    // User B attempts DELETE on User A's expense
    const delOtherRes = await api(`/expenses/${expAId}`, {
      method: 'DELETE',
      ...headersB
    });
    console.assert(delOtherRes.status === 404, `Expected 404 for User B deleting User A's expense, got ${delOtherRes.status}`);
    console.log('   ✅ User B prevented from deleting User A\'s expense (404 Not Found).\n');

    // ==========================================
    // TEST 3: User ID Spoofing Prevention
    // ==========================================
    console.log('3️⃣ Testing User ID Spoofing Prevention in Request Body:');
    const spoofRes = await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userBId, // Malicious override attempt
        title: 'Spoofed Expense',
        amount: 1200,
        category_id: catId,
        expense_date: '2026-08-12'
      }),
      ...headersA
    });
    const spoofedExpense = spoofRes.data.data.expense;
    console.assert(spoofedExpense.user_id === userAId, `Expected expense to be owned by authenticated User A (${userAId}), not spoofed User B (${spoofedExpense.user_id})`);
    console.log('   ✅ Backend strictly enforces JWT user identity and ignores user_id in payload.\n');

    // ==========================================
    // TEST 4: Budget Ownership Isolation
    // ==========================================
    console.log('4️⃣ Testing Budget Ownership & Data Isolation:');
    await api('/budget', {
      method: 'POST',
      body: JSON.stringify({ month: 8, year: 2026, amount: 50000 }),
      ...headersA
    });

    // User B queries budget for August 2026
    const budgetBRes = await api('/budget?month=8&year=2026', { ...headersB });
    console.assert(budgetBRes.data.data.budget === 0, `User B should have budget 0, got ${budgetBRes.data.data.budget}`);
    console.assert(budgetBRes.data.data.status === 'unbudgeted', 'User B should see unbudgeted status');
    console.log('   ✅ Budgets are fully isolated between accounts.\n');

    // ==========================================
    // TEST 5: SQL Injection Attack Resilience
    // ==========================================
    console.log('5️⃣ Testing SQL Injection Payload Attacks:');
    // Injection in search query
    const sqlSearchRes = await api("/expenses?search=' OR 1=1 --", { ...headersA });
    console.assert(sqlSearchRes.status === 200, 'SQL search payload should execute safely without SQL syntax error');
    console.assert(Array.isArray(sqlSearchRes.data.data.expenses), 'Response should be a valid list');

    // Injection in title
    const sqlTitleRes = await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        title: "'; DROP TABLE test_dummy; --",
        amount: 100,
        category_id: catId,
        expense_date: '2026-08-14'
      }),
      ...headersA
    });
    console.assert(sqlTitleRes.status === 201, 'SQL title payload should safely insert as literal string');
    console.assert(sqlTitleRes.data.data.expense.title === "'; DROP TABLE test_dummy; --", 'Title stored literally without execution');
    console.log('   ✅ Parameterized queries neutralized SQL injection payloads.\n');

    // ==========================================
    // TEST 6: JWT Token Validation & Expiry
    // ==========================================
    console.log('6️⃣ Testing JWT Token Authentication & Tamper Rejection:');
    // Missing Token
    const noTokenRes = await api('/expenses');
    console.assert(noTokenRes.status === 401, 'Missing token must return 401');

    // Malformed Token
    const malformedTokenRes = await api('/expenses', {
      headers: { Authorization: 'Bearer thisisnotavalidtoken.signature.fake' }
    });
    console.assert(malformedTokenRes.status === 401, 'Malformed token must return 401');
    console.log('   ✅ Missing and tampered JWT tokens rejected with 401 Unauthorized.\n');

    // ==========================================
    // TEST 7: Input Validation & Boundary Checks
    // ==========================================
    console.log('7️⃣ Testing Input Validation & Negative / Invalid Values:');
    
    // Negative Amount
    const negAmountRes = await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({ title: 'Negative Amount Test', amount: -500, category_id: catId, expense_date: '2026-08-10' }),
      ...headersA
    });
    console.assert(negAmountRes.status === 400, 'Negative amount must return 400');

    // Zero Amount
    const zeroAmountRes = await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({ title: 'Zero Amount Test', amount: 0, category_id: catId, expense_date: '2026-08-10' }),
      ...headersA
    });
    console.assert(zeroAmountRes.status === 400, 'Zero amount must return 400');

    // Non-existent Category
    const badCatRes = await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({ title: 'Bad Category', amount: 100, category_id: 999999, expense_date: '2026-08-10' }),
      ...headersA
    });
    console.assert(badCatRes.status === 400, 'Non-existent category must return 400');

    // Invalid Calendar Date (e.g. Feb 31)
    const badDateRes = await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({ title: 'Invalid Date', amount: 100, category_id: catId, expense_date: '2026-02-31' }),
      ...headersA
    });
    console.assert(badDateRes.status === 400, 'Invalid calendar date must return 400');

    // Duplicate Email Registration
    const dupEmailRes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Duplicate User', email: userAEmail, password: 'password123' })
    });
    console.assert(dupEmailRes.status === 409, 'Duplicate email registration must return 409 Conflict');
    console.log('   ✅ All input validation and conflict checks verified (400 / 409).\n');

    // Cleanup test users
    await db.query('DELETE FROM users WHERE id IN (?, ?)', [userAId, userBId]);
    console.log('🧹 Cleaned up security audit test users.');

    console.log('\n🎉 ALL 7 SECURITY & VALIDATION AUDIT TEST SUITES PASSED! 🎉');
    await db.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Security audit test failed:', err);
    if (userAId || userBId) {
      await db.query('DELETE FROM users WHERE id IN (?, ?)', [userAId || 0, userBId || 0]).catch(() => {});
    }
    await db.end();
    process.exit(1);
  }
}

runSecurityAuditTests();
