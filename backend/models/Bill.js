// models/Bill.js - Bill Model
const db = require('../config/database');

class Bill {
  // Get all bills with optional filters
  static async getAll(filters = {}) {
    let sql = `
      SELECT br.*, c.name_of_party, c.serial_number
      FROM bill_records br
      LEFT JOIN customers c ON br.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.customer_id) {
      sql += ` AND br.customer_id = ?`;
      params.push(filters.customer_id);
    }

    if (filters.status) {
      sql += ` AND br.status = ?`;
      params.push(filters.status);
    }

    if (filters.start_date && filters.end_date) {
      sql += ` AND br.billing_date BETWEEN ? AND ?`;
      params.push(filters.start_date, filters.end_date);
    }

    sql += ` ORDER BY br.created_at DESC`;

    if (filters.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
    }

    return await db.allAsync(sql, params);
  }

  // Get bill by ID
  static async getById(id) {
    const sql = `
      SELECT br.*, c.name_of_party, c.serial_number
      FROM bill_records br
      LEFT JOIN customers c ON br.customer_id = c.id
      WHERE br.id = ?
    `;
    return await db.getAsync(sql, [id]);
  }

  // Create new bill
  static async create(billData) {
    const sql = `
      INSERT INTO bill_records (
        customer_id, nttn_cap, nttn_com, active_date, billing_date,
        termination_date, iig_qt_price, fna_price, ggc_price, cdn_price,
        bdix_price, baishan_price, total_bill, total_received, total_due,
        discount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      billData.customer_id,
      billData.nttn_cap,
      billData.nttn_com,
      billData.active_date,
      billData.billing_date,
      billData.termination_date,
      billData.iig_qt_price || 0,
      billData.fna_price || 0,
      billData.ggc_price || 0,
      billData.cdn_price || 0,
      billData.bdix_price || 0,
      billData.baishan_price || 0,
      billData.total_bill || 0,
      billData.total_received || 0,
      billData.total_due || 0,
      billData.discount || 0,
      billData.status || 'Active'
    ];

    const result = await db.runAsync(sql, params);
    return { id: result.id, ...billData };
  }

  // Update bill
  static async update(id, billData) {
    const sql = `
      UPDATE bill_records SET
        customer_id = ?, nttn_cap = ?, nttn_com = ?, active_date = ?,
        billing_date = ?, termination_date = ?, iig_qt_price = ?,
        fna_price = ?, ggc_price = ?, cdn_price = ?, bdix_price = ?,
        baishan_price = ?, total_bill = ?, total_received = ?,
        total_due = ?, discount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const params = [
      billData.customer_id,
      billData.nttn_cap,
      billData.nttn_com,
      billData.active_date,
      billData.billing_date,
      billData.termination_date,
      billData.iig_qt_price,
      billData.fna_price,
      billData.ggc_price,
      billData.cdn_price,
      billData.bdix_price,
      billData.baishan_price,
      billData.total_bill,
      billData.total_received,
      billData.total_due,
      billData.discount,
      billData.status,
      id
    ];

    await db.runAsync(sql, params);
    return { id, ...billData };
  }

  // Delete bill
  static async delete(id) {
    const sql = `DELETE FROM bill_records WHERE id = ?`;
    await db.runAsync(sql, [id]);
    return { id };
  }

  // Get bill statistics
  static async getStats() {
    const sql = `
      SELECT
        COUNT(*) as total_bills,
        SUM(total_bill) as total_amount,
        SUM(total_received) as total_received,
        SUM(total_due) as total_due,
        AVG(total_bill) as avg_bill
      FROM bill_records
      WHERE status = 'Active'
    `;
    return await db.getAsync(sql);
  }

  // Get bills by customer
  static async getByCustomer(customerId) {
    const sql = `
      SELECT * FROM bill_records
      WHERE customer_id = ?
      ORDER BY billing_date DESC
    `;
    return await db.allAsync(sql, [customerId]);
  }
}

module.exports = Bill;