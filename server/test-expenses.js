const http = require('http');
const app = require('./app');

const PORT = 5002; // Use test port 5002
let server;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runExpenseTests() {
  console.log('🧪 Starting ExpenseFlow Expense REST API Test Suite...\n');

  server = app.listen(PORT);

  try {
    // 1. Register User A and User B for authorization isolation testing
    console.log('1️⃣ Registering User A & User B...');
    const userA_Res = await makeRequest('POST', '/api/auth/register', {
      name: 'User Alpha',
      email: `usera_${Date.now()}@example.com`,
      password: 'password123'
    });
    const tokenA = userA_Res.body.data.token;

    const userB_Res = await makeRequest('POST', '/api/auth/register', {
      name: 'User Beta',
      email: `userb_${Date.now()}@example.com`,
      password: 'password123'
    });
    const tokenB = userB_Res.body.data.token;

    console.log('   ✅ Registered User A & User B successfully.');

    // 2. Test POST /api/expenses (Valid Creation for User A)
    console.log('\n2️⃣ Testing POST /api/expenses (Valid Creation for User A)...');
    const createResA = await makeRequest('POST', '/api/expenses', {
      title: 'Dinner at Restaurant',
      amount: 450.50,
      category_id: 1, // Food
      description: 'Dinner with college friends',
      expense_date: '2026-08-16',
      user_id: 99999 // Malicious user_id injection attempt
    }, tokenA);

    if (createResA.status === 201 && createResA.body.success) {
      console.log('   ✅ Expense Created Successfully! Status:', createResA.status);
      console.log('   ✅ Category Name Joined:', createResA.body.data.expense.category_name);
      console.log('   ✅ Enforced user_id:', createResA.body.data.expense.user_id, '(Ignored 99999 override)');
    } else {
      throw new Error(`Create expense failed. Status: ${createResA.status}, Body: ${JSON.stringify(createResA.body)}`);
    }

    const expenseA_Id = createResA.body.data.expense.id;

    // Create a second expense for User A (Travel)
    await makeRequest('POST', '/api/expenses', {
      title: 'Uber to Airport',
      amount: 850.00,
      category_id: 2, // Travel
      description: 'Flight pickup',
      expense_date: '2026-08-15'
    }, tokenA);

    // 3. Test Invalid Amount (<= 0)
    console.log('\n3️⃣ Testing POST /api/expenses (Invalid Amount <= 0)...');
    const invalidAmtRes = await makeRequest('POST', '/api/expenses', {
      title: 'Coffee',
      amount: -50,
      category_id: 1,
      expense_date: '2026-08-16'
    }, tokenA);

    if (invalidAmtRes.status === 400 && !invalidAmtRes.body.success) {
      console.log('   ✅ Negative Amount Rejected with 400 Bad Request!');
      console.log('   ✅ Error Message:', invalidAmtRes.body.message);
    } else {
      throw new Error(`Expected 400 for negative amount, got status ${invalidAmtRes.status}`);
    }

    // 4. Test Invalid Category ID
    console.log('\n4️⃣ Testing POST /api/expenses (Non-existent Category ID)...');
    const invalidCatRes = await makeRequest('POST', '/api/expenses', {
      title: 'Books',
      amount: 300,
      category_id: 99999, // Invalid Category ID
      expense_date: '2026-08-16'
    }, tokenA);

    if (invalidCatRes.status === 400 && !invalidCatRes.body.success) {
      console.log('   ✅ Non-existent Category ID Rejected with 400 Bad Request!');
      console.log('   ✅ Error Message:', invalidCatRes.body.message);
    } else {
      throw new Error(`Expected 400 for invalid category ID, got status ${invalidCatRes.status}`);
    }

    // 5. Test Unauthorized Access (No Token)
    console.log('\n5️⃣ Testing GET /api/expenses (Without Auth Token)...');
    const noAuthRes = await makeRequest('GET', '/api/expenses', null, null);

    if (noAuthRes.status === 401 && !noAuthRes.body.success) {
      console.log('   ✅ Unauthorized Access Rejected with 401 Unauthorized!');
    } else {
      throw new Error(`Expected 401 for no token, got status ${noAuthRes.status}`);
    }

    // 6. Test GET /api/expenses (Filtering & Search for User A)
    console.log('\n6️⃣ Testing GET /api/expenses (With Filters & Search)...');
    const searchRes = await makeRequest('GET', '/api/expenses?search=Dinner', null, tokenA);
    if (searchRes.status === 200 && searchRes.body.data.expenses.length === 1) {
      console.log('   ✅ Search Filter ("Dinner") returned 1 matching record.');
    } else {
      throw new Error(`Search filter failed. Got count ${searchRes.body.data.expenses.length}`);
    }

    const catFilterRes = await makeRequest('GET', '/api/expenses?category=Travel', null, tokenA);
    if (catFilterRes.status === 200 && catFilterRes.body.data.expenses.length === 1) {
      console.log('   ✅ Category Filter ("Travel") returned 1 matching record.');
    } else {
      throw new Error(`Category filter failed. Got count ${catFilterRes.body.data.expenses.length}`);
    }

    // 7. Test User Isolation / Accessing another user's expense
    console.log('\n7️⃣ Testing User B Accessing User A\'s Expense (GET, PUT, DELETE)...');

    const getOtherRes = await makeRequest('GET', `/api/expenses/${expenseA_Id}`, null, tokenB);
    if (getOtherRes.status === 404) {
      console.log('   ✅ GET /api/expenses/:id for another user\'s expense returned 404 Not Found!');
    } else {
      throw new Error(`Expected 404 when accessing another user's expense, got ${getOtherRes.status}`);
    }

    const putOtherRes = await makeRequest('PUT', `/api/expenses/${expenseA_Id}`, { amount: 1000 }, tokenB);
    if (putOtherRes.status === 404) {
      console.log('   ✅ PUT /api/expenses/:id for another user\'s expense returned 404 Not Found!');
    } else {
      throw new Error(`Expected 404 when updating another user's expense, got ${putOtherRes.status}`);
    }

    const deleteOtherRes = await makeRequest('DELETE', `/api/expenses/${expenseA_Id}`, null, tokenB);
    if (deleteOtherRes.status === 404) {
      console.log('   ✅ DELETE /api/expenses/:id for another user\'s expense returned 404 Not Found!');
    } else {
      throw new Error(`Expected 404 when deleting another user's expense, got ${deleteOtherRes.status}`);
    }

    // 8. Test PUT /api/expenses/:id (Valid Update for User A)
    console.log('\n8️⃣ Testing PUT /api/expenses/:id (Valid Update for User A)...');
    const updateRes = await makeRequest('PUT', `/api/expenses/${expenseA_Id}`, {
      title: 'Dinner at Fine Dining Restaurant',
      amount: 550.00
    }, tokenA);

    if (updateRes.status === 200 && updateRes.body.data.expense.amount === 550) {
      console.log('   ✅ Expense Updated Successfully! New Title:', updateRes.body.data.expense.title, '| New Amount:', updateRes.body.data.expense.amount);
    } else {
      throw new Error(`Update failed. Status: ${updateRes.status}, Body: ${JSON.stringify(updateRes.body)}`);
    }

    // 9. Test DELETE /api/expenses/:id (Valid Delete for User A)
    console.log('\n9️⃣ Testing DELETE /api/expenses/:id (Valid Delete for User A)...');
    const deleteRes = await makeRequest('DELETE', `/api/expenses/${expenseA_Id}`, null, tokenA);
    if (deleteRes.status === 200 && deleteRes.body.success) {
      console.log('   ✅ Expense Deleted Successfully!');
    } else {
      throw new Error(`Delete failed. Status: ${deleteRes.status}`);
    }

    // Confirm deletion
    const getDeletedRes = await makeRequest('GET', `/api/expenses/${expenseA_Id}`, null, tokenA);
    if (getDeletedRes.status === 404) {
      console.log('   ✅ Confirmed: Deleted expense no longer exists (404 Not Found).');
    }

    console.log('\n🎉 ALL EXPENSE REST API TESTS PASSED SUCCESSFULLY! 🎉\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ EXPENSE API TEST FAILED!');
    console.error(err.message);
    if (server) server.close();
    process.exit(1);
  }
}

runExpenseTests();
