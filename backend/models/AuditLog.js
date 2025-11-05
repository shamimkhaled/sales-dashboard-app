// Audit Log Model for enhanced audit trail
const db = require('../config/database');

class AuditLog {
  // Get all audit logs with optional filters and pagination
  static async getAll(filters = {}) {
    let sql = `
      SELECT al.*,
             u.username,
             u.email
      FROM audit_logs al
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

    if (filters.table_name) {
      sql += ` AND al.table_name = ?`;
      params.push(filters.table_name);
    }

    if (filters.record_id) {
      sql += ` AND al.record_id = ?`;
      params.push(filters.record_id);
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

  // Get audit log by ID
  static async getById(id) {
    const sql = `
      SELECT al.*,
             u.username,
             u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = ?
    `;
    return await db.getAsync(sql, [id]);
  }

  // Create new audit log entry
  static async create(auditData) {
    const sql = `
      INSERT INTO audit_logs (
        user_id, action, table_name, record_id, old_values, new_values
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      auditData.user_id,
      auditData.action,
      auditData.table_name,
      auditData.record_id,
      auditData.old_values ? JSON.stringify(auditData.old_values) : null,
      auditData.new_values ? JSON.stringify(auditData.new_values) : null
    ];

    const result = await db.runAsync(sql, params);
    return { id: result.id, ...auditData };
  }

  // Get audit logs count with optional filters
  static async getCount(filters = {}) {
    let sql = `SELECT COUNT(*) as count FROM audit_logs WHERE 1=1`;
    const params = [];

    if (filters.user_id) {
      sql += ` AND user_id = ?`;
      params.push(filters.user_id);
    }

    if (filters.action) {
      sql += ` AND action = ?`;
      params.push(filters.action);
    }

    if (filters.table_name) {
      sql += ` AND table_name = ?`;
      params.push(filters.table_name);
    }

    if (filters.record_id) {
      sql += ` AND record_id = ?`;
      params.push(filters.record_id);
    }

    if (filters.start_date && filters.end_date) {
      sql += ` AND created_at BETWEEN ? AND ?`;
      params.push(filters.start_date, filters.end_date);
    }

    const result = await db.getAsync(sql, params);
    return result.count;
  }

  // Get audit statistics
  static async getStats(filters = {}) {
    let sql = `
      SELECT
        COUNT(*) as total_audits,
        COUNT(DISTINCT user_id) as unique_users,
        action,
        table_name,
        COUNT(*) as action_count
      FROM audit_logs
      WHERE 1=1
    `;
    const params = [];

    if (filters.start_date && filters.end_date) {
      sql += ` AND created_at BETWEEN ? AND ?`;
      params.push(filters.start_date, filters.end_date);
    }

    sql += ` GROUP BY action, table_name ORDER BY action_count DESC`;

    return await db.allAsync(sql, params);
  }

  // Get audit logs for a specific record
  static async getByRecord(tableName, recordId) {
    const sql = `
      SELECT al.*,
             u.username,
             u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.table_name = ? AND al.record_id = ?
      ORDER BY al.created_at DESC
    `;
    return await db.allAsync(sql, [tableName, recordId]);
  }

  // Get audit logs by user
  static async getByUser(userId, limit = 100) {
    const sql = `
      SELECT al.*,
             u.username,
             u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC
      LIMIT ?
    `;
    return await db.allAsync(sql, [userId, limit]);
  }

  // Clean old audit logs (keep last N days)
  static async cleanOldLogs(daysToKeep = 365) {
    const sql = `DELETE FROM audit_logs WHERE created_at < datetime('now', '-${daysToKeep} days')`;
    const result = await db.runAsync(sql);
    return result.changes;
  }

  // Get recent changes summary
  static async getRecentChangesSummary(hours = 24) {
    const sql = `
      SELECT
        table_name,
        action,
        COUNT(*) as change_count,
        MAX(created_at) as last_change
      FROM audit_logs
      WHERE created_at >= datetime('now', '-${hours} hours')
      GROUP BY table_name, action
      ORDER BY last_change DESC
    `;
    return await db.allAsync(sql);
  }

  // Log data change (helper method)
  static async logChange(userId, action, tableName, recordId, oldValues = null, newValues = null) {
    return await this.create({
      user_id: userId,
      action: action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues
    });
  }
}

module.exports = AuditLog;
