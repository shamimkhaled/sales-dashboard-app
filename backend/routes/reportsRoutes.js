// Reports Routes
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticate, requirePermission, logActivity } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/security');

// All report routes require authentication
router.use(authenticate);

// Get company reports (admin and above)
router.get('/company',
  apiLimiter,
  requirePermission('reports:read'),
  logActivity('view_company_reports', 'report'),
  reportsController.getCompanyReports
);

// Get data entry performance report (admin and above)
router.get('/data-entry-performance',
  apiLimiter,
  requirePermission('reports:read'),
  logActivity('view_data_entry_performance', 'report'),
  reportsController.getDataEntryPerformance
);

// Get user activity logs summary
router.get('/user-activity/:userId',
  apiLimiter,
  logActivity('view_user_activity_logs', 'report'),
  reportsController.getUserActivityLogs
);

// Get audit trail for specific record (admin only)
router.get('/audit-trail/:table_name/:record_id',
  apiLimiter,
  requirePermission('logs:read'),
  logActivity('view_audit_trail', 'report'),
  reportsController.getAuditTrail
);

module.exports = router;