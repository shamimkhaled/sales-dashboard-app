// Prospect Model
const db = require('../config/database');

class Prospect {
  // Get all prospects with optional filters and pagination
  static async getAll(filters = {}) {
    let sql = `
      SELECT p.*,
             u.username as created_by_username,
             u.email as created_by_email
      FROM prospects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      sql += ` AND (p.prospect_name LIKE ? OR p.company_name LIKE ? OR p.email LIKE ? OR p.phone_number LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.status) {
      sql += ` AND p.status = ?`;
      params.push(filters.status);
    }

    if (filters.source) {
      sql += ` AND p.source = ?`;
      params.push(filters.source);
    }

    if (filters.created_by) {
      sql += ` AND p.created_by = ?`;
      params.push(filters.created_by);
    }

    if (filters.follow_up_date_from && filters.follow_up_date_to) {
      sql += ` AND p.follow_up_date BETWEEN ? AND ?`;
      params.push(filters.follow_up_date_from, filters.follow_up_date_to);
    }

    sql += ` ORDER BY p.created_at DESC`;

    // Pagination support
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const offset = (page - 1) * pageSize;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    return await db.allAsync(sql, params);
  }

  // Get prospect by ID
  static async getById(id) {
    const sql = `
      SELECT p.*,
             u.username as created_by_username,
             u.email as created_by_email
      FROM prospects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `;
    return await db.getAsync(sql, [id]);
  }

  // Create new prospect
  static async create(prospectData, createdBy = null) {
    const sql = `
      INSERT INTO prospects (
        prospect_name, company_name, email, phone_number, address,
        potential_revenue, contact_person_name, source, follow_up_date,
        notes, status, connection_type, area, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      prospectData.prospect_name,
      prospectData.company_name,
      prospectData.email,
      prospectData.phone_number,
      prospectData.address,
      prospectData.potential_revenue || 0,
      prospectData.contact_person_name,
      prospectData.source || 'Other',
      prospectData.follow_up_date,
      prospectData.notes,
      prospectData.status || 'New',
      prospectData.connection_type,
      prospectData.area,
      createdBy
    ];

    const result = await db.runAsync(sql, params);
    return {
      id: result.id,
      prospect_name: prospectData.prospect_name,
      company_name: prospectData.company_name,
      email: prospectData.email,
      phone_number: prospectData.phone_number,
      address: prospectData.address,
      potential_revenue: prospectData.potential_revenue || 0,
      contact_person_name: prospectData.contact_person_name,
      source: prospectData.source || 'Other',
      follow_up_date: prospectData.follow_up_date,
      notes: prospectData.notes,
      status: prospectData.status || 'New',
      connection_type: prospectData.connection_type,
      area: prospectData.area,
      created_by: createdBy
    };
  }

  // Update prospect
  static async update(id, prospectData) {
    let sql = `UPDATE prospects SET `;
    const params = [];
    const updates = [];

    if (prospectData.prospect_name !== undefined) {
      updates.push('prospect_name = ?');
      params.push(prospectData.prospect_name);
    }

    if (prospectData.company_name !== undefined) {
      updates.push('company_name = ?');
      params.push(prospectData.company_name);
    }

    if (prospectData.email !== undefined) {
      updates.push('email = ?');
      params.push(prospectData.email);
    }

    if (prospectData.phone_number !== undefined) {
      updates.push('phone_number = ?');
      params.push(prospectData.phone_number);
    }

    if (prospectData.address !== undefined) {
      updates.push('address = ?');
      params.push(prospectData.address);
    }

    if (prospectData.potential_revenue !== undefined) {
      updates.push('potential_revenue = ?');
      params.push(prospectData.potential_revenue);
    }

    if (prospectData.contact_person_name !== undefined) {
      updates.push('contact_person_name = ?');
      params.push(prospectData.contact_person_name);
    }

    if (prospectData.source !== undefined) {
      updates.push('source = ?');
      params.push(prospectData.source);
    }

    if (prospectData.follow_up_date !== undefined) {
      updates.push('follow_up_date = ?');
      params.push(prospectData.follow_up_date);
    }

    if (prospectData.notes !== undefined) {
      updates.push('notes = ?');
      params.push(prospectData.notes);
    }

    if (prospectData.status !== undefined) {
      updates.push('status = ?');
      params.push(prospectData.status);
    }

    if (prospectData.connection_type !== undefined) {
      updates.push('connection_type = ?');
      params.push(prospectData.connection_type);
    }

    if (prospectData.area !== undefined) {
      updates.push('area = ?');
      params.push(prospectData.area);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await db.runAsync(sql, params);
    return { id, ...prospectData };
  }

  // Delete prospect
  static async delete(id) {
    const sql = `DELETE FROM prospects WHERE id = ?`;
    await db.runAsync(sql, [id]);
    return { id };
  }

  // Get prospect count with optional filters
  static async getCount(filters = {}) {
    let sql = `SELECT COUNT(*) as count FROM prospects WHERE 1=1`;
    const params = [];

    if (filters.search) {
      sql += ` AND (prospect_name LIKE ? OR company_name LIKE ? OR email LIKE ? OR phone_number LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters.source) {
      sql += ` AND source = ?`;
      params.push(filters.source);
    }

    if (filters.created_by) {
      sql += ` AND created_by = ?`;
      params.push(filters.created_by);
    }

    if (filters.follow_up_date_from && filters.follow_up_date_to) {
      sql += ` AND follow_up_date BETWEEN ? AND ?`;
      params.push(filters.follow_up_date_from, filters.follow_up_date_to);
    }

    const result = await db.getAsync(sql, params);
    return result.count;
  }

  // Convert prospect to customer
  static async convertToCustomer(prospectId, customerData, createdBy = null) {
    // Get prospect data
    const prospect = await this.getById(prospectId);
    if (!prospect) {
      throw new Error('Prospect not found');
    }

    // Create customer from prospect data
    const Customer = require('./Customer');
    const customer = await Customer.create({
      name_of_party: prospect.prospect_name,
      address: prospect.address,
      email: prospect.email,
      proprietor_name: prospect.contact_person_name,
      phone_number: prospect.phone_number,
      link_id: prospect.company_name,
      remarks: `Converted from prospect: ${prospect.notes || ''}`,
      kam: prospect.created_by_username,
      status: 'Active',
      connection_type: prospect.connection_type,
      area: prospect.area
    });

    // Update prospect status to 'Converted'
    await this.update(prospectId, { status: 'Converted' });

    return { prospect, customer };
  }

  // Get prospects by status
  static async getByStatus(status) {
    const sql = `
      SELECT p.*,
             u.username as created_by_username
      FROM prospects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.status = ?
      ORDER BY p.created_at DESC
    `;
    return await db.allAsync(sql, [status]);
  }

  // Get prospects requiring follow-up (overdue)
  static async getOverdueFollowUps() {
    const sql = `
      SELECT p.*,
             u.username as created_by_username
      FROM prospects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.follow_up_date < DATE('now') AND p.status IN ('New', 'Contacted', 'Qualified')
      ORDER BY p.follow_up_date ASC
    `;
    return await db.allAsync(sql);
  }

  // Get prospects by potential revenue range
  static async getByRevenueRange(minRevenue = 0, maxRevenue = null) {
    let sql = `
      SELECT p.*,
             u.username as created_by_username
      FROM prospects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.potential_revenue >= ?
    `;
    const params = [minRevenue];

    if (maxRevenue !== null) {
      sql += ` AND p.potential_revenue <= ?`;
      params.push(maxRevenue);
    }

    sql += ` ORDER BY p.potential_revenue DESC`;

    return await db.allAsync(sql, params);
  }

  // Get prospect statistics
  static async getStats() {
    const sql = `
      SELECT
        COUNT(*) as total_prospects,
        SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new_prospects,
        SUM(CASE WHEN status = 'Contacted' THEN 1 ELSE 0 END) as contacted_prospects,
        SUM(CASE WHEN status = 'Qualified' THEN 1 ELSE 0 END) as qualified_prospects,
        SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as converted_prospects,
        SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END) as lost_prospects,
        SUM(potential_revenue) as total_potential_revenue,
        AVG(potential_revenue) as avg_potential_revenue
      FROM prospects
    `;
    return await db.getAsync(sql);
  }

  // Get prospects created by user
  static async getByCreator(userId) {
    const sql = `
      SELECT p.*,
             u.username as created_by_username
      FROM prospects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.created_by = ?
      ORDER BY p.created_at DESC
    `;
    return await db.allAsync(sql, [userId]);
  }
}

module.exports = Prospect;
