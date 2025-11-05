// Activity Log Controller
const ActivityLog = require('../models/ActivityLog');

// Get activity logs (paginated)
const getActivityLogs = async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id ? parseInt(req.query.user_id) : undefined,
      action: req.query.action,
      resource: req.query.resource,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 50
    };

    // Check permissions - only super admin and admin can view all logs
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      // Regular users can only see their own logs
      filters.user_id = req.user.id;
    }

    const logs = await ActivityLog.getAll(filters);
    const totalCount = await ActivityLog.getCount(filters);

    res.json({
      logs,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / filters.pageSize)
      }
    });

  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to get activity logs' });
  }
};

// Get activity log by ID
const getActivityLogById = async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    const log = await ActivityLog.getById(logId);

    if (!log) {
      return res.status(404).json({
        error: 'Activity log not found',
        code: 'LOG_NOT_FOUND'
      });
    }

    // Check permissions
    if (!['super_admin', 'admin'].includes(req.user.role) && log.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    res.json({ log });

  } catch (error) {
    console.error('Get activity log by ID error:', error);
    res.status(500).json({ error: 'Failed to get activity log' });
  }
};

// Get activity statistics
const getActivityStats = async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    // Check permissions - only super admin and admin can view stats
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    const stats = await ActivityLog.getStats(filters);
    res.json({ stats });

  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ error: 'Failed to get activity statistics' });
  }
};

// Get user activity summary
const getUserActivitySummary = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId) || req.user.id;
    const days = parseInt(req.query.days) || 30;

    // Check permissions
    if (!['super_admin', 'admin'].includes(req.user.role) && userId !== req.user.id) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    const summary = await ActivityLog.getUserActivitySummary(userId, days);
    res.json({ summary });

  } catch (error) {
    console.error('Get user activity summary error:', error);
    res.status(500).json({ error: 'Failed to get user activity summary' });
  }
};

// Clean old logs (admin only)
const cleanOldLogs = async (req, res) => {
  try {
    // Only super admin can clean logs
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    const daysToKeep = parseInt(req.body.daysToKeep) || 90;
    const deletedCount = await ActivityLog.cleanOldLogs(daysToKeep);

    res.json({
      message: `Cleaned ${deletedCount} old activity logs`,
      deletedCount
    });

  } catch (error) {
    console.error('Clean old logs error:', error);
    res.status(500).json({ error: 'Failed to clean old logs' });
  }
};

module.exports = {
  getActivityLogs,
  getActivityLogById,
  getActivityStats,
  getUserActivitySummary,
  cleanOldLogs
};