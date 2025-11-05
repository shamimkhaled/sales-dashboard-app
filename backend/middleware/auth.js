// Authentication and Authorization Middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// JWT Secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// Verify JWT token
const verifyToken = (token, secret = JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }

    // Get user from database to ensure they still exist and are active
    const user = await User.getById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const hasPermission = await User.hasPermission(req.user.id, permission);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

// Activity logging middleware
const logActivity = (action, resource = null, getResourceId = null) => {
  return async (req, res, next) => {
    // Store original response methods
    const originalJson = res.json;
    const originalSend = res.send;
    const originalStatus = res.status;

    let responseSent = false;

    // Override response methods to capture response
    res.json = function(data) {
      if (!responseSent) {
        logToDatabase(req, res, action, resource, getResourceId, data);
        responseSent = true;
      }
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      if (!responseSent) {
        logToDatabase(req, res, action, resource, getResourceId, data);
        responseSent = true;
      }
      return originalSend.call(this, data);
    };

    // Override status to track status code
    res.status = function(code) {
      res.statusCode = code;
      return originalStatus.call(this, code);
    };

    next();
  };
};

// Helper function to log activity to database
const logToDatabase = async (req, res, action, resource, getResourceId, responseData) => {
  try {
    if (!req.user) return; // Only log if user is authenticated

    let resourceId = null;
    if (getResourceId) {
      resourceId = getResourceId(req, res);
    } else if (req.params.id) {
      resourceId = req.params.id;
    }

    // Extract details from request/response
    let details = {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode
    };

    // Add request body for write operations (exclude sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const safeBody = { ...req.body };
      delete safeBody.password; // Remove sensitive fields
      delete safeBody.password_hash;
      details.requestBody = safeBody;
    }

    // Add response data for successful operations
    if (res.statusCode >= 200 && res.statusCode < 300 && responseData) {
      details.responseData = responseData;
    }

    await ActivityLog.create({
      user_id: req.user.id,
      action: action,
      resource: resource,
      resource_id: resourceId,
      details: JSON.stringify(details),
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    });
  } catch (error) {
    console.error('Activity logging error:', error);
    // Don't fail the request if logging fails
  }
};

// Refresh token middleware
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    const user = await User.getById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
    }

    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  logActivity,
  refreshToken,
  generateAccessToken,
  generateRefreshToken,
  verifyToken
};