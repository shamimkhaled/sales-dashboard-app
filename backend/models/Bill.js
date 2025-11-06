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

    // Search across all relevant columns
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      sql += ` AND (
        c.name_of_party LIKE ? OR
        c.address LIKE ? OR
        c.email LIKE ? OR
        c.proprietor_name LIKE ? OR
        c.phone_number LIKE ? OR
        c.link_id LIKE ? OR
        c.serial_number LIKE ? OR
        c.kam LIKE ? OR
        br.nttn_cap LIKE ? OR
        br.nttn_com LIKE ? OR
        br.status LIKE ? OR
        CAST(br.total_bill AS TEXT) LIKE ? OR
        CAST(br.total_received AS TEXT) LIKE ? OR
        CAST(br.total_due AS TEXT) LIKE ?
      )`;
      // Push the same search pattern 14 times for all the LIKE clauses
      for (let i = 0; i < 14; i++) {
        params.push(searchPattern);
      }
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
    let sql = `
      SELECT COUNT(*) as count 
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

    // Search across all relevant columns (same as getAll)
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      sql += ` AND (
        c.name_of_party LIKE ? OR
        c.address LIKE ? OR
        c.email LIKE ? OR
        c.proprietor_name LIKE ? OR
        c.phone_number LIKE ? OR
        c.link_id LIKE ? OR
        c.serial_number LIKE ? OR
        c.kam LIKE ? OR
        br.nttn_cap LIKE ? OR
        br.nttn_com LIKE ? OR
        br.status LIKE ? OR
        CAST(br.total_bill AS TEXT) LIKE ? OR
        CAST(br.total_received AS TEXT) LIKE ? OR
        CAST(br.total_due AS TEXT) LIKE ?
      )`;
      // Push the same search pattern 14 times for all the LIKE clauses
      for (let i = 0; i < 14; i++) {
        params.push(searchPattern);
      }
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
        termination_date, iig_qt, iig_qt_price, fna, fna_price, ggc, ggc_price, 
        cdn, cdn_price, bdix, bdix_price, baishan, baishan_price,
        total_bill, total_received, total_due, discount, remarks, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      billData.customer_id,
      billData.nttn_cap,
      billData.nttn_com,
      billData.active_date,
      billData.billing_date,
      billData.termination_date,
      billData.iig_qt || 0,
      billData.iig_qt_price || 0,
      billData.fna || 0,
      billData.fna_price || 0,
      billData.ggc || 0,
      billData.ggc_price || 0,
      billData.cdn || 0,
      billData.cdn_price || 0,
      billData.bdix || 0,
      billData.bdix_price || 0,
      billData.baishan || 0,
      billData.baishan_price || 0,
      billData.total_bill || 0,
      billData.total_received || 0,
      billData.total_due || 0,
      billData.discount || 0,
      billData.remarks || '',
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
        billing_date = ?, termination_date = ?, iig_qt = ?, iig_qt_price = ?,
        fna = ?, fna_price = ?, ggc = ?, ggc_price = ?, cdn = ?, cdn_price = ?, 
        bdix = ?, bdix_price = ?, baishan = ?, baishan_price = ?,
        total_bill = ?, total_received = ?, total_due = ?, discount = ?, 
        remarks = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const params = [
      billData.customer_id,
      billData.nttn_cap,
      billData.nttn_com,
      billData.active_date,
      billData.billing_date,
      billData.termination_date,
      billData.iig_qt || 0,
      billData.iig_qt_price || 0,
      billData.fna || 0,
      billData.fna_price || 0,
      billData.ggc || 0,
      billData.ggc_price || 0,
      billData.cdn || 0,
      billData.cdn_price || 0,
      billData.bdix || 0,
      billData.bdix_price || 0,
      billData.baishan || 0,
      billData.baishan_price || 0,
      billData.total_bill || 0,
      billData.total_received || 0,
      billData.total_due || 0,
      billData.discount || 0,
      billData.remarks || '',
      billData.status || 'Active',
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