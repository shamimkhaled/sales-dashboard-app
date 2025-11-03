// models/Customer.js - Customer Model
const db = require('../config/database');

class Customer {
  // Get all customers with optional filters
  static async getAll(filters = {}) {
    let sql = `SELECT * FROM customers WHERE 1=1`;
    const params = [];

    if (filters.search) {
      sql += ` AND (name_of_party LIKE ? OR email LIKE ? OR phone_number LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }

    sql += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
    }

    return await db.allAsync(sql, params);
  }

  // Get customer by ID
  static async getById(id) {
    const sql = `SELECT * FROM customers WHERE id = ?`;
    return await db.getAsync(sql, [id]);
  }

  // Create new customer
  static async create(customerData) {
    const sql = `
      INSERT INTO customers (
        serial_number, name_of_party, address, email, proprietor_name,
        phone_number, link_id, remarks, kam, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      customerData.serial_number,
      customerData.name_of_party,
      customerData.address,
      customerData.email,
      customerData.proprietor_name,
      customerData.phone_number,
      customerData.link_id,
      customerData.remarks,
      customerData.kam,
      customerData.status || 'Active'
    ];

    const result = await db.runAsync(sql, params);
    return { id: result.id, ...customerData };
  }

  // Update customer
  static async update(id, customerData) {
    const sql = `
      UPDATE customers SET
        serial_number = ?, name_of_party = ?, address = ?, email = ?,
        proprietor_name = ?, phone_number = ?, link_id = ?, remarks = ?,
        kam = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const params = [
      customerData.serial_number,
      customerData.name_of_party,
      customerData.address,
      customerData.email,
      customerData.proprietor_name,
      customerData.phone_number,
      customerData.link_id,
      customerData.remarks,
      customerData.kam,
      customerData.status,
      id
    ];

    await db.runAsync(sql, params);
    return { id, ...customerData };
  }

  // Delete customer
  static async delete(id) {
    const sql = `DELETE FROM customers WHERE id = ?`;
    await db.runAsync(sql, [id]);
    return { id };
  }

  // Get customer count
  static async getCount() {
    const sql = `SELECT COUNT(*) as count FROM customers`;
    const result = await db.getAsync(sql);
    return result.count;
  }
}

module.exports = Customer;