const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const app = require('../src/app');
const { getAllStudentsCached } = require('../src/utils/studentCache');
const adminController = require('../src/controllers/adminController');

async function runApiSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING COMPLETE DSA RANKBOARD API VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Start server on ephemeral port
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at: ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------------------
    // A. ROOT & HEALTH ENDPOINTS
    // -------------------------------------------------------------------------
    console.log('--- Section A: Root & Health Check ---');
    const rootRes = await axios.get(`${baseUrl}/`);
    assert(rootRes.status === 200, 'GET / returns HTTP 200');
    assert(rootRes.data.name === 'College DSA Rankboard API', 'GET / returns API metadata');

    const healthRes = await axios.get(`${baseUrl}/api/health`);
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthRes.data.success === true, 'GET /api/health returns success: true');
    assert(healthRes.data.service === 'DSA Rankboard API', 'GET /api/health returns service name');

    // -------------------------------------------------------------------------
    // B. PUBLIC LEADERBOARD ENDPOINTS
    // -------------------------------------------------------------------------
    console.log('\n--- Section B: Public Leaderboard & Aggregates ---');
    const lbStatsRes = await axios.get(`${baseUrl}/api/leaderboard/stats`);
    assert(lbStatsRes.status === 200, 'GET /api/leaderboard/stats returns HTTP 200');
    assert(lbStatsRes.data.success === true, 'GET /api/leaderboard/stats success: true');
    assert(typeof lbStatsRes.data.stats.totalRegisteredStudents === 'number', 'totalRegisteredStudents is numeric');
    assert(lbStatsRes.data.stats.codingPlatforms === 5, 'codingPlatforms is exactly 5');
    assert(Array.isArray(lbStatsRes.data.platforms) && lbStatsRes.data.platforms.length === 5, 'platforms array has 5 items');

    const lbRes = await axios.get(`${baseUrl}/api/leaderboard`);
    assert(lbRes.status === 200, 'GET /api/leaderboard returns HTTP 200');
    assert(lbRes.data.success === true, 'GET /api/leaderboard success: true');
    assert(Array.isArray(lbRes.data.leaderboard), 'leaderboard is an array');
    assert(Array.isArray(lbRes.data.podium), 'podium is an array');
    assert(lbRes.data.podium.length <= 3, 'podium contains top 3 or fewer');

    // Test search filter
    const searchRes = await axios.get(`${baseUrl}/api/leaderboard?search=harinee`);
    assert(searchRes.status === 200, 'GET /api/leaderboard?search=harinee returns HTTP 200');
    assert(searchRes.data.leaderboard.length >= 1, 'Search query returned matching students');

    // Test pagination
    const pageRes = await axios.get(`${baseUrl}/api/leaderboard?limit=10&page=1`);
    assert(pageRes.status === 200, 'GET /api/leaderboard?limit=10&page=1 returns HTTP 200');
    assert(pageRes.data.leaderboard.length <= 10, 'Pagination respects limit <= 10');
    assert(pageRes.data.pagination && pageRes.data.pagination.currentPage === 1, 'Pagination metadata returned correctly');

    // -------------------------------------------------------------------------
    // C. REGISTRATION VERIFICATION & PUBLIC SHOWCASE
    // -------------------------------------------------------------------------
    console.log('\n--- Section C: Registration Verification & Public Showcase ---');
    const regCheckRes = await axios.get(`${baseUrl}/api/student/verify-registration`);
    assert(regCheckRes.status === 200, 'GET /api/student/verify-registration returns HTTP 200');
    assert(regCheckRes.data.isRegistered === false, 'Visitor without receipt returns isRegistered: false');

    const students = await getAllStudentsCached();
    const sampleStudent = students[0];
    if (sampleStudent) {
      const showcaseRes = await axios.get(`${baseUrl}/api/showcase/${sampleStudent.id}`);
      assert(showcaseRes.status === 200, `GET /api/showcase/${sampleStudent.id} returns HTTP 200`);
      assert(showcaseRes.data.success === true, 'Showcase data returns success: true');
      assert(showcaseRes.data.showcase.name === sampleStudent.name, 'Showcase returns correct student name');
    }

    try {
      await axios.get(`${baseUrl}/api/showcase/non_existent_student_99999`);
      assert(false, 'Non-existent showcase should return 404');
    } catch (err) {
      assert(err.response?.status === 404, 'GET /api/showcase/invalid returns HTTP 404');
    }

    // -------------------------------------------------------------------------
    // D. 404 NOT FOUND & SECURITY HEADERS
    // -------------------------------------------------------------------------
    console.log('\n--- Section D: Error Handling & Security Headers ---');
    try {
      await axios.get(`${baseUrl}/api/non_existent_route_${Date.now()}`);
      assert(false, 'Non-existent route should return 404');
    } catch (err) {
      assert(err.response?.status === 404, 'Non-existent route correctly returns HTTP 404');
      assert(err.response?.data?.success === false, 'Error response has success: false');
    }

    // Check Helmet security headers
    assert(rootRes.headers['x-content-type-options'] === 'nosniff', 'Security header: X-Content-Type-Options: nosniff');
    assert(rootRes.headers['x-frame-options'] === 'SAMEORIGIN', 'Security header: X-Frame-Options: SAMEORIGIN');

    // -------------------------------------------------------------------------
    // E. STUDENT AUTHENTICATION GUARDS (UNAUTHORIZED ATTEMPTS)
    // -------------------------------------------------------------------------
    console.log('\n--- Section E: Student Authentication Guards (Must return 401 without Bearer token) ---');
    const studentProtectedEndpoints = [
      { method: 'GET', url: '/api/student/me' },
      { method: 'GET', url: '/api/student/profile' },
      { method: 'PUT', url: '/api/student/profile', data: { name: 'Hacker' } },
      { method: 'GET', url: '/api/student/platforms' },
      { method: 'POST', url: '/api/student/platforms/sync', data: {} },
      { method: 'GET', url: '/api/student/score' },
      { method: 'GET', url: '/api/student/rank' },
      { method: 'GET', url: '/api/showcase/me/preview' },
      { method: 'PUT', url: '/api/showcase/settings', data: {} },
    ];

    for (const ep of studentProtectedEndpoints) {
      try {
        await axios({ method: ep.method, url: `${baseUrl}${ep.url}`, data: ep.data });
        assert(false, `${ep.method} ${ep.url} should be protected by requireAuth`);
      } catch (err) {
        assert(err.response?.status === 401, `${ep.method} ${ep.url} correctly rejected with 401 Unauthorized`);
      }
    }

    // Test with invalid token
    try {
      await axios.get(`${baseUrl}/api/student/me`, {
        headers: { Authorization: 'Bearer invalid_garbage_token_123' },
      });
      assert(false, 'Invalid Bearer token should be rejected with 401');
    } catch (err) {
      assert(err.response?.status === 401, 'Invalid Bearer token correctly rejected with 401');
    }

    // -------------------------------------------------------------------------
    // F. ADMIN AUTHORIZATION GUARDS (UNAUTHORIZED ATTEMPTS)
    // -------------------------------------------------------------------------
    console.log('\n--- Section F: Admin Authorization Guards (Must return 401 without Bearer token) ---');
    const adminEndpoints = [
      { method: 'GET', url: '/api/admin/auth/me' },
      { method: 'GET', url: '/api/admin/dashboard/stats' },
      { method: 'GET', url: '/api/admin/students' },
      { method: 'POST', url: '/api/admin/students', data: {} },
      { method: 'GET', url: '/api/admin/students/std_1' },
      { method: 'PUT', url: '/api/admin/students/std_1', data: {} },
      { method: 'PATCH', url: '/api/admin/students/std_1/status', data: {} },
      { method: 'DELETE', url: '/api/admin/students/std_1' },
      { method: 'POST', url: '/api/admin/sync/student/std_1', data: {} },
      { method: 'POST', url: '/api/admin/sync/all', data: {} },
      { method: 'GET', url: '/api/admin/sync/status' },
      { method: 'GET', url: '/api/admin/sync/logs' },
      { method: 'POST', url: '/api/admin/import/validate', data: {} },
      { method: 'POST', url: '/api/admin/import/confirm', data: {} },
      { method: 'GET', url: '/api/admin/import/history' },
      { method: 'GET', url: '/api/admin/import/template' },
      { method: 'POST', url: '/api/admin/import/bulk-platform-urls/validate', data: {} },
      { method: 'POST', url: '/api/admin/import/bulk-platform-urls/confirm', data: {} },
      { method: 'POST', url: '/api/admin/import/bulk-platform-urls/batch', data: {} },
      { method: 'GET', url: '/api/admin/import/bulk-platform-urls/template/leetcode' },
      { method: 'GET', url: '/api/admin/leaderboard' },
      { method: 'POST', url: '/api/admin/leaderboard/recalculate', data: {} },
      { method: 'GET', url: '/api/admin/platforms/stats' },
      { method: 'POST', url: '/api/admin/platforms/leetcode/test', data: {} },
      { method: 'GET', url: '/api/admin/scores' },
      { method: 'POST', url: '/api/admin/scores/recalculate/std_1', data: {} },
      { method: 'POST', url: '/api/admin/scores/recalculate-all', data: {} },
      { method: 'POST', url: '/api/admin/scores/adjust/std_1', data: {} },
      { method: 'GET', url: '/api/admin/scores/adjustments' },
      { method: 'GET', url: '/api/admin/activity/today-top-solvers' },
      { method: 'GET', url: '/api/admin/activity/anomalies' },
      { method: 'POST', url: '/api/admin/activity/anomalies/scan', data: {} },
      { method: 'POST', url: '/api/admin/activity/anomalies/1/review', data: {} },
      { method: 'GET', url: '/api/admin/activity/trends' },
      { method: 'GET', url: '/api/admin/activity/student/std_1' },
      { method: 'POST', url: '/api/admin/activity/student/std_1/snapshot', data: {} },
      { method: 'GET', url: '/api/admin/activity/export' },
      { method: 'GET', url: '/api/admin/anomalies' },
      { method: 'POST', url: '/api/admin/anomalies/resolve', data: {} },
      { method: 'GET', url: '/api/admin/insights' },
      { method: 'POST', url: '/api/admin/insights/refresh', data: {} },
      { method: 'GET', url: '/api/admin/audit-logs' },
      { method: 'GET', url: '/api/admin/notifications' },
      { method: 'PATCH', url: '/api/admin/notifications/1/read', data: {} },
      { method: 'DELETE', url: '/api/admin/notifications' },
      { method: 'GET', url: '/api/admin/settings' },
      { method: 'PUT', url: '/api/admin/settings', data: {} },
      { method: 'GET', url: '/api/admin/system/health' },
      { method: 'POST', url: '/api/admin/admins', data: {} },
      { method: 'PATCH', url: '/api/admin/admins/adm_1/status', data: {} },
      { method: 'DELETE', url: '/api/admin/admins/adm_1' },
    ];

    for (const ep of adminEndpoints) {
      try {
        await axios({ method: ep.method, url: `${baseUrl}${ep.url}`, data: ep.data });
        assert(false, `Admin endpoint ${ep.method} ${ep.url} should require Admin authorization`);
      } catch (err) {
        assert(
          err.response?.status === 401,
          `Admin guard enforced: ${ep.method} ${ep.url} rejected with HTTP 401`
        );
      }
    }

    // -------------------------------------------------------------------------
    // G. ADMIN CONTROLLER BUSINESS LOGIC VALIDATION
    // -------------------------------------------------------------------------
    console.log('\n--- Section G: Admin Controller Business Logic Verification ---');
    const mockRes = () => {
      let status = 200;
      let json = null;
      let headers = {};
      return {
        status(c) { status = c; return this; },
        json(j) { json = j; return this; },
        setHeader(k, v) { headers[k] = v; },
        send(s) { json = s; return this; },
        getStatus: () => status,
        getJson: () => json,
      };
    };

    const mockAdmin = {
      userId: 'test_admin_verifier',
      email: 'testadmin@rankboard.edu',
      name: 'System Test Administrator',
      role: 'SUPER_ADMIN',
    };

    // 1. Dashboard Stats
    {
      const res = mockRes();
      await adminController.getDashboardStats({ admin: mockAdmin, query: {} }, res, (err) => { throw err; });
      const data = res.getJson();
      assert(data.success === true, 'adminController.getDashboardStats returns success: true');
      assert(typeof data.stats.totalStudents === 'number', 'totalStudents is numeric');
      assert(typeof data.stats.activeStudents === 'number', 'activeStudents is numeric');
      assert(typeof data.stats.platforms.totalProblemsSolved === 'number', 'totalProblemsSolved is numeric');
    }

    // 2. Settings
    {
      const res = mockRes();
      await adminController.getSettings({ admin: mockAdmin }, res, (err) => { throw err; });
      const data = res.getJson();
      assert(data.success === true, 'adminController.getSettings returns success: true');
      assert(data.settings && data.settings.scoringWeights, 'scoringWeights returned in settings');
    }

    // 3. System Health
    {
      const res = mockRes();
      await adminController.getSystemHealth({ admin: mockAdmin }, res, (err) => { throw err; });
      const data = res.getJson();
      assert(data.success === true, 'adminController.getSystemHealth returns success: true');
      assert(data.database && data.database.status === 'CONNECTED', 'Database health check reports CONNECTED');
      assert(data.authentication && data.authentication.status === 'HEALTHY', 'Clerk Auth reports HEALTHY');
    }

    // 4. Platform Stats
    {
      const res = mockRes();
      await adminController.getPlatformStats({ admin: mockAdmin }, res, (err) => { throw err; });
      const data = res.getJson();
      assert(data.success === true, 'adminController.getPlatformStats returns success: true');
      assert(data.platforms && Object.keys(data.platforms).length === 5, 'All 5 platforms returned in admin platform stats');
    }

    // 5. Audit Logs
    {
      const res = mockRes();
      await adminController.getAuditLogs({ admin: mockAdmin, query: { limit: 5 } }, res, (err) => { throw err; });
      const data = res.getJson();
      assert(data.success === true, 'adminController.getAuditLogs returns success: true');
      assert(Array.isArray(data.logs), 'Audit logs array returned');
    }

    // 6. Notifications
    {
      const res = mockRes();
      await adminController.getNotifications({ admin: mockAdmin, query: { limit: 5 } }, res, (err) => { throw err; });
      const data = res.getJson();
      assert(data.success === true, 'adminController.getNotifications returns success: true');
      assert(typeof data.unreadCount === 'number', 'unreadCount is numeric');
    }

    // 7. Import Templates
    {
      const res = mockRes();
      await adminController.getImportTemplate({ admin: mockAdmin }, res, (err) => { throw err; });
      assert(res.getStatus() === 200, 'adminController.getImportTemplate returns HTTP 200');
    }

    {
      const res = mockRes();
      await adminController.getBulkPlatformUrlTemplate({ admin: mockAdmin, params: { platform: 'leetcode' } }, res, (err) => { throw err; });
      assert(res.getStatus() === 200, 'adminController.getBulkPlatformUrlTemplate returns HTTP 200');
    }

    // 8. AI Insights
    {
      const res = mockRes();
      await adminController.getAiInsights({ admin: mockAdmin, query: {} }, res, (err) => { throw err; });
      const data = res.getJson();
      assert(data.success === true, 'adminController.getAiInsights returns success: true');
      assert(typeof data.insights === 'object' && data.insights !== null, 'AI insights payload returned');
    }

  } finally {
    server.close();
    console.log('\nTest server shut down cleanly.');
  }

  console.log('\n================================================================');
  console.log(`📊 API TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runApiSuite().catch((err) => {
  console.error('Fatal API Suite Error:', err);
  process.exit(1);
});
