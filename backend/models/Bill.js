// Bill Model
const db = require('../config/database');

class Bill {
  // Get all bills with optional filters and pagination
  static async getAll(filters = {}) {
    let sql = `
      SELECT br.*,
             c.id as customer_id_ref,
             c.serial_number,
             c.name_of_party,
             c.address,
             c.email,
             c.proprietor_name,
             c.phone_number,
             c.link_id,
             c.remarks as customer_remarks,
             c.kam,
             c.status as customer_status
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

    // Pagination support
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const offset = (page - 1) * pageSize;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    return await db.allAsync(sql, params);
  }

  // Get total count of bills with optional filters
  static async getCount(filters = {}) {
    let sql = `SELECT COUNT(*) as count FROM bill_records WHERE 1=1`;
    const params = [];

    if (filters.customer_id) {
      sql += ` AND customer_id = ?`;
      params.push(filters.customer_id);
    }

    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters.start_date && filters.end_date) {
      sql += ` AND billing_date BETWEEN ? AND ?`;
      params.push(filters.start_date, filters.end_date);
    }

    const result = await db.getAsync(sql, params);
    return result.count;
  }

  // Get bill by ID
  static async getById(id) {
    const sql = `
      SELECT br.*,
             c.id as customer_id_ref,
             c.serial_number,
             c.name_of_party,
             c.address,
             c.email,
             c.proprietor_name,
             c.phone_number,
             c.link_id,
             c.remarks as customer_remarks,
             c.kam,
             c.status as customer_status
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

  // Get revenue calculations (monthly, weekly, yearly)
  static async getRevenueCalculations(filters = {}) {
    let sql = `
      SELECT
        DATE_FORMAT(billing_date, '%Y-%m') as month,
        DATE_FORMAT(billing_date, '%Y-%U') as week,
        DATE_FORMAT(billing_date, '%Y') as year,
        SUM(total_bill) as monthly_revenue,
        SUM(total_received) as monthly_received,
        SUM(total_due) as monthly_due,
        COUNT(*) as bill_count
      FROM bill_records
      WHERE status = 'Active'
    `;
    const params = [];

    if (filters.start_date && filters.end_date) {
      sql += ` AND billing_date BETWEEN ? AND ?`;
      params.push(filters.start_date, filters.end_date);
    }

    if (filters.customer_id) {
      sql += ` AND customer_id = ?`;
      params.push(filters.customer_id);
    }

    sql += ` GROUP BY DATE_FORMAT(billing_date, '%Y-%m'), DATE_FORMAT(billing_date, '%Y-%U'), DATE_FORMAT(billing_date, '%Y')`;
    sql += ` ORDER BY month DESC`;

    return await db.allAsync(sql, params);
  }

  // Verify calculations (cross-check totals)
  static async verifyCalculations(billId = null) {
    let sql = `
      SELECT
        id,
        customer_id,
        iig_qt_price,
        fna_price,
        ggc_price,
        cdn_price,
        bdix_price,
        baishan_price,
        (iig_qt_price + fna_price + ggc_price + cdn_price + bdix_price + baishan_price) as calculated_total,
        total_bill,
        total_received,
        total_due,
        (total_received + total_due) as received_plus_due,
        CASE
          WHEN ABS((iig_qt_price + fna_price + ggc_price + cdn_price + bdix_price + baishan_price) - total_bill) < 0.01 THEN 'Valid'
          ELSE 'Invalid'
        END as total_calculation_status,
        CASE
          WHEN ABS((total_received + total_due) - total_bill) < 0.01 THEN 'Valid'
          ELSE 'Invalid'
        END as balance_calculation_status
      FROM bill_records
    `;
    const params = [];

    if (billId) {
      sql += ` WHERE id = ?`;
      params.push(billId);
    }

    return await db.allAsync(sql, params);
  }

  // Get calculation summary for verification
  static async getCalculationSummary() {
    const sql = `
      SELECT
        COUNT(*) as total_bills,
        SUM(CASE WHEN ABS((iig_qt_price + fna_price + ggc_price + cdn_price + bdix_price + baishan_price) - total_bill) < 0.01 THEN 1 ELSE 0 END) as valid_calculations,
        SUM(CASE WHEN ABS((total_received + total_due) - total_bill) < 0.01 THEN 1 ELSE 0 END) as valid_balances,
        SUM(CASE WHEN ABS((iig_qt_price + fna_price + ggc_price + cdn_price + bdix_price + baishan_price) - total_bill) >= 0.01 THEN 1 ELSE 0 END) as invalid_calculations,
        SUM(CASE WHEN ABS((total_received + total_due) - total_bill) >= 0.01 THEN 1 ELSE 0 END) as invalid_balances
      FROM bill_records
      WHERE status = 'Active'
    `;
    return await db.getAsync(sql);
  }

  // Get bills by customer
  static async getByCustomer(customerId) {
    const sql = `
      SELECT br.*,
             c.id as customer_id_ref,
             c.serial_number,
             c.name_of_party,
             c.address,
             c.email,
             c.proprietor_name,
             c.phone_number,
             c.link_id,
             c.remarks as customer_remarks,
             c.kam,
             c.status as customer_status
      FROM bill_records br
      LEFT JOIN customers c ON br.customer_id = c.id
      WHERE br.customer_id = ?
      ORDER BY br.billing_date DESC
    `;
    return await db.allAsync(sql, [customerId]);
  }

  // Get all bills with customer info for export (no pagination)
  static async getAllWithCustomerInfo(filters = {}) {
    let sql = `
      SELECT br.*,
             c.id as customer_id_ref,
             c.serial_number,
             c.name_of_party,
             c.address,
             c.email,
             c.proprietor_name,
             c.phone_number,
             c.link_id,
             c.remarks as customer_remarks,
             c.kam,
             c.status as customer_status
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

    sql += ` ORDER BY c.serial_number ASC, br.created_at DESC`;

    return await db.allAsync(sql, params);
  }
}

module.exports = Bill;