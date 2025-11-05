// Auth Controller
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');

// Login
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { email, password, rememberMe } = req.body;

    // Find user by email
    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return user data (excluding sensitive information)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: JSON.parse(user.permissions || '[]')
    };

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: userData,
      expiresIn: rememberMe ? '7d' : '1h'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Register (only for super admin and admin)
const register = async (req, res) => {
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
    const createdBy = req.user ? req.user.id : null;

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
    }, createdBy);

    // Return user data (excluding password)
    const userData = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active
    };

    res.status(201).json({
      message: 'User created successfully',
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.getById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      permissions: JSON.parse(user.permissions || '[]')
    };

    res.json({ user: userData });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { username, email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Current password is required to change password',
          code: 'CURRENT_PASSWORD_REQUIRED'
        });
      }

      const user = await User.getById(userId);
      const isValidPassword = await User.verifyPassword(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (newPassword) updateData.password = newPassword;

    const updatedUser = await User.update(userId, updateData);

    const userData = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      is_active: updatedUser.is_active
    };

    res.json({
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Logout (client-side token removal, but we can log the activity)
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can log the activity
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Refresh token is required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // This will be handled by the refreshToken middleware
    // This endpoint just returns success
    res.json({ message: 'Token refreshed successfully' });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

// Change password (admin can change any user's password)
const changePassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
        code: 'INVALID_PASSWORD'
      });
    }

    // Check permissions - only super admin and admin can change passwords
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    // Super admin can change anyone's password, admin can change user passwords
    if (req.user.role === 'admin' && userId !== req.user.id) {
      const targetUser = await User.getById(userId);
      if (targetUser.role === 'super_admin' || targetUser.role === 'admin') {
        return res.status(403).json({
          error: 'Cannot change password of admin or super admin',
          code: 'FORBIDDEN'
        });
      }
    }

    await User.update(userId, { password: newPassword });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  logout,
  refreshToken,
  changePassword
};