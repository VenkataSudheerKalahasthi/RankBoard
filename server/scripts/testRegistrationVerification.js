require('dotenv').config();
const { getSupabase } = require('../src/supabase/supabaseClient');
const { getAllStudents } = require('../src/supabase/supabaseRepository');
const studentController = require('../src/controllers/studentController');
const crypto = require('crypto');
const { config } = require('../src/config/env');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING REGISTRATION VERIFICATION & VISIBILITY LOGIC');
  console.log('====================================================');

  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase not connected');
    process.exit(1);
  }

  // Fetch an active student to test with real database record
  const students = await getAllStudents();
  const activeStudent = students.find((s) => s.accountStatus === 'ACTIVE');
  if (!activeStudent) {
    console.error('❌ No active student found in database for test.');
    process.exit(1);
  }
  console.log(`✅ Using active student: ID=${activeStudent.id}`);

  const secret = config.CLERK_SECRET_KEY || config.SUPABASE_SERVICE_ROLE_KEY || 'college-dsa-rankboard-sec';

  // Helper to generate a receipt matching controller logic
  const createTestReceipt = (sub, exp = Date.now() + 180 * 24 * 60 * 60 * 1000) => {
    const payload = { sub, iat: Date.now(), exp };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${sig}`;
  };

  // Mock response helper
  const createMockRes = () => {
    let statusCode = 200;
    let jsonBody = null;
    let headers = {};
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
      setHeader(name, val) {
        headers[name] = val;
      },
      getHeader(name) {
        return headers[name];
      },
      getJson() {
        return jsonBody;
      },
      getHeaders() {
        return headers;
      },
    };
  };

  let passed = 0;
  let total = 0;

  const assert = (desc, cond) => {
    total++;
    if (cond) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
    }
  };

  // TEST 1: No receipt provided (First-time visitor)
  {
    const req = { headers: {}, query: {}, body: {} };
    const res = createMockRes();
    await studentController.verifyRegistration(req, res, () => {});
    const body = res.getJson();
    assert('Test 1: Unregistered visitor returns isRegistered: false', body && body.success === true && body.isRegistered === false);
    assert('Test 1: No sensitive data exposed', !body.student && !body.email && !body.name);
  }

  // TEST 2: Valid active student receipt via header
  {
    const validReceipt = createTestReceipt(activeStudent.id);
    const req = {
      headers: { 'x-registration-receipt': validReceipt },
      query: {},
      body: {},
    };
    const res = createMockRes();
    await studentController.verifyRegistration(req, res, () => {});
    const body = res.getJson();
    assert('Test 2: Valid student via x-registration-receipt header returns isRegistered: true', body && body.success === true && body.isRegistered === true);
    assert('Test 2: Set-Cookie refreshed on valid receipt', !!res.getHeader('Set-Cookie') && res.getHeader('Set-Cookie').includes('rankboard_reg_receipt'));
    assert('Test 2: No personal student info leaked', !body.student && !body.email && !body.name);
  }

  // TEST 3: Valid active student receipt via Cookie header
  {
    const validReceipt = createTestReceipt(activeStudent.id);
    const req = {
      headers: { cookie: `some_cookie=abc; rankboard_reg_receipt=${validReceipt}; other=123` },
      query: {},
      body: {},
    };
    const res = createMockRes();
    await studentController.verifyRegistration(req, res, () => {});
    const body = res.getJson();
    assert('Test 3: Valid student via cookie header returns isRegistered: true', body && body.success === true && body.isRegistered === true);
  }

  // TEST 4: Valid active student receipt via query param
  {
    const validReceipt = createTestReceipt(activeStudent.id);
    const req = {
      headers: {},
      query: { receipt: validReceipt },
      body: {},
    };
    const res = createMockRes();
    await studentController.verifyRegistration(req, res, () => {});
    const body = res.getJson();
    assert('Test 4: Valid student via query param returns isRegistered: true', body && body.success === true && body.isRegistered === true);
  }

  // TEST 5: Tampered / invalid signature
  {
    const validReceipt = createTestReceipt(activeStudent.id);
    const tamperedReceipt = validReceipt.slice(0, -6) + 'xxxxxx';
    const req = {
      headers: { 'x-registration-receipt': tamperedReceipt },
      query: {},
      body: {},
    };
    const res = createMockRes();
    await studentController.verifyRegistration(req, res, () => {});
    const body = res.getJson();
    assert('Test 5: Tampered signature returns isRegistered: false', body && body.success === true && body.isRegistered === false);
    assert('Test 5: Set-Cookie cleared (Max-Age=0)', res.getHeader('Set-Cookie') && res.getHeader('Set-Cookie').includes('Max-Age=0'));
  }

  // TEST 6: Expired receipt
  {
    const expiredReceipt = createTestReceipt(activeStudent.id, Date.now() - 1000);
    const req = {
      headers: { 'x-registration-receipt': expiredReceipt },
      query: {},
      body: {},
    };
    const res = createMockRes();
    await studentController.verifyRegistration(req, res, () => {});
    const body = res.getJson();
    assert('Test 6: Expired receipt returns isRegistered: false', body && body.success === true && body.isRegistered === false);
  }

  // TEST 7: Non-existent student ID
  {
    const nonExistentReceipt = createTestReceipt('non_existent_student_id_99999');
    const req = {
      headers: { 'x-registration-receipt': nonExistentReceipt },
      query: {},
      body: {},
    };
    const res = createMockRes();
    await studentController.verifyRegistration(req, res, () => {});
    const body = res.getJson();
    assert('Test 7: Non-existent student ID returns isRegistered: false', body && body.success === true && body.isRegistered === false);
    assert('Test 7: Set-Cookie cleared (Max-Age=0)', res.getHeader('Set-Cookie') && res.getHeader('Set-Cookie').includes('Max-Age=0'));
  }

  console.log('====================================================');
  console.log(`🎯 RESULTS: ${passed}/${total} assertions passed`);
  console.log('====================================================');

  if (passed === total) {
    console.log('✅ ALL TESTS PASSED SUCCESSFULLY');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
