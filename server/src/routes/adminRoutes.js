const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/adminAuth');

// All admin endpoints require server-side Admin authorization
router.use(requireAdmin);

// 1. Auth / Profile
router.get('/auth/me', adminController.getAdminProfile);

// 2. Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// 3. Students
router.get('/students', adminController.getStudents);
router.post('/students', adminController.createStudent);
router.get('/students/:studentId', adminController.getStudentById);
router.put('/students/:studentId', adminController.updateStudent);
router.patch('/students/:studentId/status', adminController.toggleStudentStatus);
router.delete('/students/:studentId', adminController.deleteStudent);

// 4. Synchronization
router.post('/sync/student/:studentId', adminController.syncStudent);
router.post('/sync/all', adminController.syncAllStudents);
router.get('/sync/status', adminController.getSyncStatus);
router.get('/sync/logs', adminController.getSyncLogs);

// 5. Bulk Import
router.post('/import/validate', adminController.validateImportData);
router.post('/import/confirm', adminController.confirmImport);
router.get('/import/history', adminController.getImportHistory);
router.get('/import/template', adminController.getImportTemplate);

// 6. Leaderboard
router.get('/leaderboard', adminController.getAdminLeaderboard);
router.post('/leaderboard/recalculate', adminController.recalculateLeaderboard);

// 7. Platforms
router.get('/platforms/stats', adminController.getPlatformStats);
router.post('/platforms/:platform/test', adminController.testPlatformConnectivity);

// 8. Scores & Manual Adjustments
router.get('/scores', adminController.getScoresOverview);
router.post('/scores/recalculate/:studentId', adminController.recalculateSingleScore);
router.post('/scores/recalculate-all', adminController.recalculateAllScores);
router.post('/scores/adjust/:studentId', adminController.adjustStudentScore);
router.get('/scores/adjustments', adminController.getScoreAdjustments);

// 9. Anomalies
router.get('/anomalies', adminController.getAnomalies);
router.post('/anomalies/resolve', adminController.resolveAnomaly);

// 10. AI Insights
router.get('/insights', adminController.getAiInsights);
router.post('/insights/refresh', adminController.refreshAiInsights);

// 11. Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// 12. Notifications
router.get('/notifications', adminController.getNotifications);
router.patch('/notifications/:id/read', adminController.markNotificationRead);
router.delete('/notifications', adminController.clearNotifications);

// 13. Settings & System Health
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.get('/system/health', adminController.getSystemHealth);

module.exports = router;
