// Activity Log Model
const db = require('../config/database');

class ActivityLog {
  // Get all activity logs with optional filters and pagination
  static async getAll(filters = {}) {
    let sql = `
      SELECT al.*, u.username, u.email
      FROM user_activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.user_id) {
      sql += ` AND al.user_id = ?`;
      params.push(filters.user_id);
    }

    if (filters.action) {
      sql += ` AND al.action = ?`;
      params.push(filters.action);
    }

    if (filters.resource) {
      sql += ` AND al.resource = ?`;
      params.push(filters.resource);
    }

    if (filters.start_date && filters.end_date) {
      sql += ` AND al.created_at BETWEEN ? AND ?`;
      params.push(filters.start_date, filters.end_date);
    }

    sql += ` ORDER BY al.created_at DESC`;

    // Pagination support
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const offset = (page - 1) * pageSize;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    return await db.allAsync(sql, params);
  }

  // Get activity log by ID
  static async getById(id) {
    const sql = `
      SELECT al.*, u.username, u.email
      FROM user_activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = ?
    `;
    return await db.getAsync(sql, [id]);
  }

  // Create new activity log
  static async create(activityData) {
    const sql = `
      INSERT INTO user_activity_logs (
        user_id, action, resource, resource_id, details, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      activityData.user_id,
      activityData.action,
      activityData.resource,
      activityData.resource_id,
      activityData.details,
      activityData.ip_address,
      activityData.user_agent
    ];

    const result = await db.runAsync(sql, params);
    return { id: result.id, ...activityData };
  }

  // Get activity logs count with optional filters
  static async getCount(filters = {}) {
    let sql = `SELECT COUNT(*) as count FROM user_activity_logs WHERE 1=1`;
    const params = [];

    if (filters.user_id) {
      sql += ` AND user_id = ?`;
      params.push(filters.user_id);
    }

    if (filters.action) {
      sql += ` AND action = ?`;
      params.push(filters.action);
    }

    if (filters.resource) {
      sql += ` AND resource = ?`;
      params.push(filters.resource);
    }

    if (filters.start_date && filters.end_date) {
      sql += ` AND created_at BETWEEN ? AND ?`;
      params.push(filters.start_date, filters.end_date);
    }

    const result = await db.getAsync(sql, params);
    return result.count;
  }

  // Get activity statistics
  static async getStats(filters = {}) {
    let sql = `
      SELECT
        COUNT(*) as total_activities,
        COUNT(DISTINCT user_id) as unique_users,
        action,
        COUNT(*) as action_count
      FROM user_activity_logs
      WHERE 1=1
    `;
    const params = [];

    if (filters.start_date && filters.end_date) {
      sql += ` AND created_at BETWEEN ? AND ?`;
      params.push(filters.start_date, filters.end_date);
    }

    sql += ` GROUP BY action ORDER BY action_count DESC`;

    return await db.allAsync(sql, params);
  }

  // Get user activity summary
  static async getUserActivitySummary(userId, days = 30) {
    const sql = `
      SELECT
        action,
        COUNT(*) as count,
        MAX(created_at) as last_activity
      FROM user_activity_logs
      WHERE user_id = ? AND created_at >= datetime('now', '-${days} days')
      GROUP BY action
      ORDER BY count DESC
    `;
    return await db.allAsync(sql, [userId]);
  }

  // Clean old logs (keep last N days)
  static async cleanOldLogs(daysToKeep = 90) {
    const sql = `DELETE FROM user_activity_logs WHERE created_at < datetime('now', '-${daysToKeep} days')`;
    const result = await db.runAsync(sql);
    return result.changes;
  }
}

module.exports = ActivityLog;