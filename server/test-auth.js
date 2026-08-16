const http = require('http');
const app = require('./app');
const pool = require('./config/db');

const PORT = 5001; // Use test port 5001
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

async function runAuthTests() {
  console.log('🧪 Starting ExpenseFlow Auth Test Suite...\n');

  // Start test server
  server = app.listen(PORT);

  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Test Student';
  let authToken = '';

  try {
    // 1. Test Registration
    console.log('1️⃣ Testing POST /api/auth/register (New User)...');
    const regRes = await makeRequest('POST', '/api/auth/register', {
      name: testName,
      email: testEmail,
      password: testPassword
    });

    if (regRes.status === 201 && regRes.body.success && regRes.body.data.token) {
      console.log('   ✅ Registration Successful! Status:', regRes.status);
      console.log('   ✅ User Object (no password/hash):', regRes.body.data.user);
      authToken = regRes.body.data.token;
    } else {
      throw new Error(`Registration failed. Status: ${regRes.status}, Body: ${JSON.stringify(regRes.body)}`);
    }

    // 2. Test Duplicate Email Registration
    console.log('\n2️⃣ Testing POST /api/auth/register (Duplicate Email)...');
    const dupRes = await makeRequest('POST', '/api/auth/register', {
      name: testName,
      email: testEmail,
      password: testPassword
    });

    if (dupRes.status === 409 && !dupRes.body.success) {
      console.log('   ✅ Duplicate Email Rejected with 409 Conflict!');
      console.log('   ✅ Error Message:', dupRes.body.message);
    } else {
      throw new Error(`Expected 409 for duplicate email, got status ${dupRes.status}`);
    }

    // 3. Test Invalid Inputs (Short Password)
    console.log('\n3️⃣ Testing POST /api/auth/register (Short Password)...');
    const invalidRes = await makeRequest('POST', '/api/auth/register', {
      name: testName,
      email: `invalid_${Date.now()}@example.com`,
      password: '123'
    });

    if (invalidRes.status === 400 && !invalidRes.body.success) {
      console.log('   ✅ Invalid Password Length Rejected with 400 Bad Request!');
      console.log('   ✅ Error Message:', invalidRes.body.message);
    } else {
      throw new Error(`Expected 400 for short password, got status ${invalidRes.status}`);
    }

    // 4. Test Login (Success)
    console.log('\n4️⃣ Testing POST /api/auth/login (Correct Credentials)...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword
    });

    if (loginRes.status === 200 && loginRes.body.success && loginRes.body.data.token) {
      console.log('   ✅ Login Successful! Status:', loginRes.status);
      console.log('   ✅ JWT Token received.');
      authToken = loginRes.body.data.token;
    } else {
      throw new Error(`Login failed. Status: ${loginRes.status}, Body: ${JSON.stringify(loginRes.body)}`);
    }

    // 5. Test Login (Wrong Password)
    console.log('\n5️⃣ Testing POST /api/auth/login (Wrong Password)...');
    const wrongPassRes = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword123'
    });

    if (wrongPassRes.status === 401 && !wrongPassRes.body.success) {
      console.log('   ✅ Wrong Password Rejected with 401 Unauthorized!');
      console.log('   ✅ Error Message:', wrongPassRes.body.message);
    } else {
      throw new Error(`Expected 401 for wrong password, got status ${wrongPassRes.status}`);
    }

    // 6. Test Protected GET /api/auth/me (Valid Token)
    console.log('\n6️⃣ Testing Protected GET /api/auth/me (Valid Token)...');
    const meRes = await makeRequest('GET', '/api/auth/me', null, authToken);

    if (meRes.status === 200 && meRes.body.success && meRes.body.data.user.email === testEmail) {
      console.log('   ✅ Protected Endpoint Returned User Profile!');
      console.log('   ✅ User:', meRes.body.data.user);
    } else {
      throw new Error(`GET /me failed. Status: ${meRes.status}, Body: ${JSON.stringify(meRes.body)}`);
    }

    // 7. Test Protected GET /api/auth/me (Missing Token)
    console.log('\n7️⃣ Testing Protected GET /api/auth/me (No Token)...');
    const noTokenRes = await makeRequest('GET', '/api/auth/me', null, null);

    if (noTokenRes.status === 401 && !noTokenRes.body.success) {
      console.log('   ✅ Missing Token Rejected with 401 Unauthorized!');
    } else {
      throw new Error(`Expected 401 for missing token, got status ${noTokenRes.status}`);
    }

    // 8. Verify Password Hash in Database
    console.log('\n8️⃣ Checking Password Hash in MySQL Database...');
    const [rows] = await pool.query('SELECT email, password FROM users WHERE email = ?', [testEmail]);
    if (rows.length > 0) {
      const storedHash = rows[0].password;
      console.log('   ✅ Stored Hash:', storedHash);
      if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
        console.log('   ✅ Confirmed: Password is correctly hashed using bcrypt!');
      } else {
        throw new Error('Password hash does not match bcrypt pattern!');
      }
    }

    console.log('\n🎉 ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ AUTHENTICATION TEST FAILED!');
    console.error(err.message);
    if (server) server.close();
    process.exit(1);
  }
}

runAuthTests();
