// User Model
const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Get all users with optional filters and pagination
  static async getAll(filters = {}) {
    let sql = `
      SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at, u.updated_at,
             r.name as role_name, r.description as role_description, r.permissions,
             creator.username as created_by_username
      FROM users u
      LEFT JOIN roles r ON u.role = r.name
      LEFT JOIN users creator ON u.created_by = creator.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      sql += ` AND (u.username LIKE ? OR u.email LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.role) {
      sql += ` AND u.role = ?`;
      params.push(filters.role);
    }

    if (filters.is_active !== undefined) {
      sql += ` AND u.is_active = ?`;
      params.push(filters.is_active);
    }

    sql += ` ORDER BY u.created_at DESC`;

    // Pagination support
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const offset = (page - 1) * pageSize;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    return await db.allAsync(sql, params);
  }

  // Get user by ID
  static async getById(id) {
    const sql = `
      SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at, u.updated_at,
             r.name as role_name, r.description as role_description, r.permissions,
             creator.username as created_by_username
      FROM users u
      LEFT JOIN roles r ON u.role = r.name
      LEFT JOIN users creator ON u.created_by = creator.id
      WHERE u.id = ?
    `;
    return await db.getAsync(sql, [id]);
  }

  // Get user by email
  static async getByEmail(email) {
    const sql = `
      SELECT u.*, r.permissions
      FROM users u
      LEFT JOIN roles r ON u.role = r.name
      WHERE u.email = ? AND u.is_active = 1
    `;
    return await db.getAsync(sql, [email]);
  }

  // Get user by username
  static async getByUsername(username) {
    const sql = `
      SELECT u.*, r.permissions
      FROM users u
      LEFT JOIN roles r ON u.role = r.name
      WHERE u.username = ? AND u.is_active = 1
    `;
    return await db.getAsync(sql, [username]);
  }

  // Create new user
  static async create(userData, createdBy = null) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const sql = `
      INSERT INTO users (
        username, email, password_hash, role, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userData.username,
      userData.email,
      hashedPassword,
      userData.role || 'user',
      userData.is_active !== undefined ? userData.is_active : true,
      createdBy
    ];

    const result = await db.runAsync(sql, params);
    return {
      id: result.id,
      username: userData.username,
      email: userData.email,
      role: userData.role || 'user',
      is_active: userData.is_active !== undefined ? userData.is_active : true
    };
  }

  // Update user
  static async update(id, userData) {
    let sql = `UPDATE users SET `;
    const params = [];
    const updates = [];

    if (userData.username) {
      updates.push('username = ?');
      params.push(userData.username);
    }

    if (userData.email) {
      updates.push('email = ?');
      params.push(userData.email);
    }

    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      updates.push('password_hash = ?');
      params.push(hashedPassword);
    }

    if (userData.role) {
      updates.push('role = ?');
      params.push(userData.role);
    }

    if (userData.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(userData.is_active);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await db.runAsync(sql, params);
    return { id, ...userData };
  }

  // Delete user (soft delete by setting is_active to false)
  static async delete(id) {
    const sql = `UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await db.runAsync(sql, [id]);
    return { id };
  }

  // Hard delete user
  static async hardDelete(id) {
    const sql = `DELETE FROM users WHERE id = ?`;
    await db.runAsync(sql, [id]);
    return { id };
  }

  // Get user count with optional filters
  static async getCount(filters = {}) {
    let sql = `SELECT COUNT(*) as count FROM users WHERE 1=1`;
    const params = [];

    if (filters.search) {
      sql += ` AND (username LIKE ? OR email LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.role) {
      sql += ` AND role = ?`;
      params.push(filters.role);
    }

    if (filters.is_active !== undefined) {
      sql += ` AND is_active = ?`;
      params.push(filters.is_active);
    }

    const result = await db.getAsync(sql, params);
    return result.count;
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Get user permissions
  static async getPermissions(userId) {
    const sql = `
      SELECT r.permissions
      FROM users u
      LEFT JOIN roles r ON u.role = r.name
      WHERE u.id = ? AND u.is_active = 1
    `;
    const result = await db.getAsync(sql, [userId]);
    return result ? JSON.parse(result.permissions || '[]') : [];
  }

  // Check if user has permission
  static async hasPermission(userId, permission) {
    const permissions = await this.getPermissions(userId);
    return permissions.includes('all') || permissions.includes(permission);
  }

  // Get all roles
  static async getAllRoles() {
    const sql = `SELECT * FROM roles ORDER BY name`;
    return await db.allAsync(sql);
  }

  // Get role by name
  static async getRoleByName(name) {
    const sql = `SELECT * FROM roles WHERE name = ?`;
    return await db.getAsync(sql, [name]);
  }
}

module.exports = User;