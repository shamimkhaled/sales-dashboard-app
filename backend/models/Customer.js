// Customer Model
const db = require('../config/database');

class Customer {
  // Get all customers with optional filters and pagination
  static async getAll(filters = {}) {
    let sql = `SELECT * FROM customers WHERE 1=1`;
    const params = [];

    if (filters.search) {
      sql += ` AND (name_of_party LIKE ? OR email LIKE ? OR phone_number LIKE ? OR serial_number LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters.connection_type) {
      sql += ` AND connection_type = ?`;
      params.push(filters.connection_type);
    }

    if (filters.area) {
      sql += ` AND area = ?`;
      params.push(filters.area);
    }

    sql += ` ORDER BY serial_number ASC`;

    // Pagination support
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const offset = (page - 1) * pageSize;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    return await db.allAsync(sql, params);
  }

  // Get customer by ID
  static async getById(id) {
    const sql = `SELECT * FROM customers WHERE id = ?`;
    return await db.getAsync(sql, [id]);
  }

  // Create new customer
  static async create(customerData) {
    // Get the next serial number
    let serialNumber = customerData.serial_number;
    if (!serialNumber) {
      const maxSerialResult = await db.getAsync(
        `SELECT MAX(serial_number) as max_serial FROM customers`
      );
      serialNumber = (maxSerialResult?.max_serial || 0) + 1;
    }

    const sql = `
      INSERT INTO customers (
        serial_number, name_of_party, address, email, proprietor_name,
        phone_number, link_id, remarks, kam, status, connection_type, area
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      serialNumber,
      customerData.name_of_party,
      customerData.address,
      customerData.email,
      customerData.proprietor_name,
      customerData.phone_number,
      customerData.link_id,
      customerData.remarks,
      customerData.kam,
      customerData.status || 'Active',
      customerData.connection_type,
      customerData.area
    ];

    const result = await db.runAsync(sql, params);
    return {
      id: result.id,
      serial_number: serialNumber,
      name_of_party: customerData.name_of_party,
      address: customerData.address,
      email: customerData.email,
      proprietor_name: customerData.proprietor_name,
      phone_number: customerData.phone_number,
      link_id: customerData.link_id,
      remarks: customerData.remarks,
      kam: customerData.kam,
      status: customerData.status || 'Active',
      connection_type: customerData.connection_type,
      area: customerData.area
    };
  }

  // Update customer
  static async update(id, customerData) {
    const sql = `
      UPDATE customers SET
        serial_number = ?, name_of_party = ?, address = ?, email = ?,
        proprietor_name = ?, phone_number = ?, link_id = ?, remarks = ?,
        kam = ?, status = ?, connection_type = ?, area = ?, updated_at = CURRENT_TIMESTAMP
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
      customerData.connection_type,
      customerData.area,
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

  // Get customer count with optional filters
  static async getCount(filters = {}) {
    let sql = `SELECT COUNT(*) as count FROM customers WHERE 1=1`;
    const params = [];

    if (filters.search) {
      sql += ` AND (name_of_party LIKE ? OR email LIKE ? OR phone_number LIKE ? OR serial_number LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters.connection_type) {
      sql += ` AND connection_type = ?`;
      params.push(filters.connection_type);
    }

    if (filters.area) {
      sql += ` AND area = ?`;
      params.push(filters.area);
    }

    const result = await db.getAsync(sql, params);
    return result.count;
  }
}

module.exports = Customer;