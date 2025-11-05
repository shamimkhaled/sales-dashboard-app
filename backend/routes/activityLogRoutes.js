/**
 * @swagger
 * /activity-logs:
 *   get:
 *     summary: Get activity logs
 *     description: Retrieve activity logs with optional filtering
 *     tags:
 *       - Activity Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Filter by resource type
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivityLog'
 *                 pagination:
 *                   type: object
 */

// Activity Log Routes
const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const { authenticate, authorize, logActivity } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/security');

// All activity log routes require authentication
router.use(authenticate);

// Get activity logs
router.get('/',
  apiLimiter,
  logActivity('view_activity_logs', 'activity_log'),
  activityLogController.getActivityLogs
);

/**
 * @swagger
 * /activity-logs/{id}:
 *   get:
 *     summary: Get activity log by ID
 *     description: Retrieve a specific activity log entry
 *     tags:
 *       - Activity Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity log ID
 *     responses:
 *       200:
 *         description: Activity log retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityLog'
 *       404:
 *         description: Activity log not found
 */

/**
 * @swagger
 * /activity-logs/stats/summary:
 *   get:
 *     summary: Get activity statistics
 *     description: Retrieve aggregated activity statistics (admin only)
 *     tags:
 *       - Activity Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       403:
 *         description: Insufficient permissions
 */

/**
 * @swagger
 * /activity-logs/user/{userId}/summary:
 *   get:
 *     summary: Get user activity summary
 *     description: Retrieve activity summary for a specific user
 *     tags:
 *       - Activity Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: User activity summary retrieved successfully
 *       403:
 *         description: Insufficient permissions
 */

/**
 * @swagger
 * /activity-logs/clean:
 *   post:
 *     summary: Clean old activity logs
 *     description: Remove activity logs older than specified days (super admin only)
 *     tags:
 *       - Activity Logs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - daysToKeep
 *             properties:
 *               daysToKeep:
 *                 type: integer
 *                 description: Number of days of logs to keep
 *                 default: 90
 *     responses:
 *       200:
 *         description: Logs cleaned successfully
 *       403:
 *         description: Insufficient permissions
 */

// Get activity log by ID
router.get('/:id',
  apiLimiter,
  logActivity('view_activity_log', 'activity_log'),
  activityLogController.getActivityLogById
);

// Get activity statistics (admin only)
router.get('/stats/summary',
  authorize('super_admin', 'admin'),
  apiLimiter,
  logActivity('view_activity_stats', 'activity_log'),
  activityLogController.getActivityStats
);

// Get user activity summary
router.get('/user/:userId/summary',
  apiLimiter,
  logActivity('view_user_activity_summary', 'activity_log'),
  activityLogController.getUserActivitySummary
);

// Clean old logs (super admin only)
router.post('/clean',
  authorize('super_admin'),
  apiLimiter,
  logActivity('clean_activity_logs', 'activity_log'),
  activityLogController.cleanOldLogs
);

module.exports = router;