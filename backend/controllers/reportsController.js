// Reports Controller
const ActivityLog = require('../models/ActivityLog');
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const User = require('../models/User');

// Get company reports
const getCompanyReports = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Revenue reports
    const revenueStats = await Bill.getStats();

    // Customer statistics
    const customerStats = await Customer.getCount({ status: 'Active' });

    // Recent entries (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBills = await Bill.getAll({
      start_date: thirtyDaysAgo.toISOString().split('T')[0],
      pageSize: 10
    });

    const recentCustomers = await Customer.getAll({
      pageSize: 5
    });

    // Data entry performance (by user)
    const dataEntryStats = await ActivityLog.getStats({
      start_date: start_date || thirtyDaysAgo.toISOString().split('T')[0],
      end_date: end_date
    });

    res.json({
      revenue: {
        total_bills: revenueStats.total_bills,
        total_amount: revenueStats.total_amount,
        total_received: revenueStats.total_received,
        total_due: revenueStats.total_due,
        avg_bill: revenueStats.avg_bill
      },
      customers: {
        total_active: customerStats
      },
      recent_entries: {
        bills: recentBills,
        customers: recentCustomers
      },
      data_entry_performance: dataEntryStats
    });

  } catch (error) {
    console.error('Get company reports error:', error);
    res.status(500).json({ error: 'Failed to get company reports' });
  }
};

// Get data entry performance report
const getDataEntryPerformance = async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;

    const filters = {};
    if (start_date && end_date) {
      filters.start_date = start_date;
      filters.end_date = end_date;
    }
    if (user_id) {
      filters.user_id = parseInt(user_id);
    }

    // Get activity statistics
    const activityStats = await ActivityLog.getStats(filters);

    // Get detailed activity logs for the period
    const activities = await ActivityLog.getAll({
      ...filters,
      pageSize: 1000 // Get more data for analysis
    });

    // Group activities by user and action
    const userPerformance = {};
    activities.forEach(activity => {
      const userId = activity.user_id;
      const action = activity.action;

      if (!userPerformance[userId]) {
        userPerformance[userId] = {
          user_id: userId,
          username: activity.username,
          actions: {}
        };
      }

      if (!userPerformance[userId].actions[action]) {
        userPerformance[userId].actions[action] = 0;
      }

      userPerformance[userId].actions[action]++;
    });

    // Convert to array and calculate totals
    const performanceData = Object.values(userPerformance).map(user => ({
      ...user,
      total_actions: Object.values(user.actions).reduce((sum, count) => sum + count, 0)
    }));

    res.json({
      period: { start_date, end_date },
      summary: activityStats,
      user_performance: performanceData
    });

  } catch (error) {
    console.error('Get data entry performance error:', error);
    res.status(500).json({ error: 'Failed to get data entry performance' });
  }
};

// Get user activity logs summary
const getUserActivityLogs = async (req, res) => {
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

    res.json({
      user_id: userId,
      period_days: days,
      activities: summary
    });

  } catch (error) {
    console.error('Get user activity logs error:', error);
    res.status(500).json({ error: 'Failed to get user activity logs' });
  }
};

// Get audit trail for specific record
const getAuditTrail = async (req, res) => {
  try {
    const { table_name, record_id } = req.params;

    // Only super admin and admin can view audit trails
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    // This would require implementing audit logging in the database
    // For now, return activity logs related to this record
    const activities = await ActivityLog.getAll({
      resource: table_name,
      resource_id: record_id,
      pageSize: 100
    });

    res.json({
      table_name,
      record_id,
      audit_trail: activities
    });

  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ error: 'Failed to get audit trail' });
  }
};

module.exports = {
  getCompanyReports,
  getDataEntryPerformance,
  getUserActivityLogs,
  getAuditTrail
};