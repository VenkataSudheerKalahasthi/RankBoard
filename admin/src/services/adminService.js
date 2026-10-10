import api from './api';

export const adminService = {
  // 1. Auth & Admin Profile
  getAdminProfile: () => api.get('/admin/auth/me'),

  // 2. Dashboard Stats
  getDashboardStats: () => api.get('/admin/dashboard/stats'),

  // 3. Student Management
  getStudents: (params = {}) => api.get('/admin/students', { params }),
  getStudentById: (studentId) => api.get(`/admin/students/${studentId}`),
  createStudent: (data) => api.post('/admin/students', data),
  updateStudent: (studentId, data) => api.put(`/admin/students/${studentId}`, data),
  toggleStudentStatus: (studentId, status) => api.patch(`/admin/students/${studentId}/status`, { status }),
  deleteStudent: (studentId, permanent = false) => api.delete(`/admin/students/${studentId}`, { params: { permanent } }),

  // 4. Synchronization Center
  syncStudent: (studentId) => api.post(`/admin/sync/student/${studentId}`),
  syncAllStudents: () => api.post('/admin/sync/all'),
  getSyncStatus: () => api.get('/admin/sync/status'),
  getSyncLogs: () => api.get('/admin/sync/logs'),

  // 5. Bulk Import
  validateImportData: (records) => api.post('/admin/import/validate', { records }),
  confirmImport: (data) => api.post('/admin/import/confirm', data),
  getImportHistory: () => api.get('/admin/import/history'),
  getImportTemplate: () => api.get('/admin/import/template'),

  // 5B. Bulk Platform URL Update
  validateBulkPlatformUrls: (data) => api.post('/admin/import/bulk-platform-urls/validate', data),
  confirmBulkPlatformUrls: (data) => api.post('/admin/import/bulk-platform-urls/confirm', data),
  executeBulkPlatformUrlsBatch: (data) => api.post('/admin/import/bulk-platform-urls/batch', data),
  getBulkPlatformUrlTemplateUrl: (platform) => `/api/admin/import/bulk-platform-urls/template/${platform}`,

  // 6. Leaderboard
  getAdminLeaderboard: (params = {}) => api.get('/admin/leaderboard', { params }),
  recalculateLeaderboard: () => api.post('/admin/leaderboard/recalculate'),

  // 7. Platforms Management
  getPlatformStats: () => api.get('/admin/platforms/stats'),
  testPlatformConnectivity: (platform, handle) => api.post(`/admin/platforms/${platform}/test`, { handle }),

  // 8. Scores & Manual Adjustments
  getScoresOverview: () => api.get('/admin/scores'),
  recalculateSingleScore: (studentId) => api.post(`/admin/scores/recalculate/${studentId}`),
  recalculateAllScores: () => api.post('/admin/scores/recalculate-all'),
  adjustStudentScore: (studentId, data) => api.post(`/admin/scores/adjust/${studentId}`, data),
  getScoreAdjustments: () => api.get('/admin/scores/adjustments'),

  // 9. Anomalies
  getAnomalies: () => api.get('/admin/anomalies'),
  resolveAnomaly: (data) => api.post('/admin/anomalies/resolve', data),

  // 10. AI Insights
  getAiInsights: (params = {}) => api.get('/admin/insights', { params }),
  refreshAiInsights: () => api.post('/admin/insights/refresh'),

  // 11. Audit Logs
  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),

  // 12. Notifications
  getNotifications: () => api.get('/admin/notifications'),
  markNotificationRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  clearNotifications: () => api.delete('/admin/notifications'),

  // 13. Settings & System Health
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  getSystemHealth: () => api.get('/admin/system/health'),
};
