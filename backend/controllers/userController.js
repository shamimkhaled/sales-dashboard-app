// User Management Controller
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all users (paginated)
const getUsers = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      role: req.query.role,
      is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 10
    };

    const users = await User.getAll(filters);
    const totalCount = await User.getCount(filters);

    res.json({
      users,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / filters.pageSize)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check permissions - users can only see their own profile, admins can see all
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    const user = await User.getById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Create user (only super admin and admin)
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { username, email, password, role } = req.body;

    // Check permissions
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    // Admin cannot create super admin
    if (req.user.role === 'admin' && role === 'super_admin') {
      return res.status(403).json({
        error: 'Cannot create super admin account',
        code: 'FORBIDDEN'
      });
    }

    // Check if user already exists
    const existingUser = await User.getByEmail(email) || await User.getByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email or username already exists',
        code: 'USER_EXISTS'
      });
    }

    // Create user
    const newUser = await User.create({
      username,
      email,
      password,
      role: role || 'user'
    }, req.user.id);

    // Return user data (excluding password)
    const userData = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active,
      created_at: newUser.created_at
    };

    res.status(201).json({
      message: 'User created successfully',
      user: userData
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    const { username, email, password, role, is_active } = req.body;

    // Check permissions
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    // Users can update their own profile, but not role or active status
    if (req.user.id === userId) {
      if (role !== undefined || is_active !== undefined) {
        return res.status(403).json({
          error: 'Cannot modify your own role or active status',
          code: 'FORBIDDEN'
        });
      }
    } else {
      // Admin cannot modify super admin
      if (req.user.role === 'admin') {
        const targetUser = await User.getById(userId);
        if (targetUser.role === 'super_admin') {
          return res.status(403).json({
            error: 'Cannot modify super admin account',
            code: 'FORBIDDEN'
          });
        }
        // Admin cannot assign super admin role
        if (role === 'super_admin') {
          return res.status(403).json({
            error: 'Cannot assign super admin role',
            code: 'FORBIDDEN'
          });
        }
      }
    }

    // Update user
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (password !== undefined) updateData.password = password;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updatedUser = await User.update(userId, updateData);

    const userData = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      is_active: updatedUser.is_active,
      updated_at: updatedUser.updated_at
    };

    res.json({
      message: 'User updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user (soft delete)
const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check permissions
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    // Cannot delete own account
    if (req.user.id === userId) {
      return res.status(400).json({
        error: 'Cannot delete your own account',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    // Admin cannot delete super admin
    if (req.user.role === 'admin') {
      const targetUser = await User.getById(userId);
      if (targetUser.role === 'super_admin') {
        return res.status(403).json({
          error: 'Cannot delete super admin account',
          code: 'FORBIDDEN'
        });
      }
    }

    await User.delete(userId);

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Get all roles
const getRoles = async (req, res) => {
  try {
    const roles = await User.getAllRoles();
    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
};

// Get user permissions
const getUserPermissions = async (req, res) => {
  try {
    const userId = parseInt(req.params.id) || req.user.id;
    const permissions = await User.getPermissions(userId);
    res.json({ permissions });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ error: 'Failed to get user permissions' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getUserPermissions
};