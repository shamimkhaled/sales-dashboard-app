// Security Middleware
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs for API endpoints
  message: {
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs for sensitive operations
  message: {
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Input validation middleware
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
];

const validateRegister = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'user'])
    .withMessage('Invalid role specified'),
];

const validateUserUpdate = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'user'])
    .withMessage('Invalid role specified'),
];

const validateCustomer = [
  body('name_of_party')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name of party is required and must be less than 255 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone_number')
    .optional()
    .matches(/^(\+880|880|0)?1[3-9]\d{8}$/)
    .withMessage('Please provide a valid Bangladeshi phone number'),
  body('serial_number')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Serial number must be a positive integer'),
];

const validateBill = [
  body('customer_id')
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Valid customer ID is required'),
  body('billing_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Valid billing date is required'),
  body('active_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Valid active date format required'),
  body('termination_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Valid termination date format required'),
  body('total_bill')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Total bill must be a positive number'),
  body('total_received')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Total received must be a positive number'),
  body('total_due')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Total due must be a positive number'),
  body('discount')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Discount must be a positive number'),
  body('iig_qt')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('IIG-QT must be a positive number'),
  body('iig_qt_price')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('IIG-QT price must be a positive number'),
  body('fna')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('FNA must be a positive number'),
  body('fna_price')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('FNA price must be a positive number'),
  body('ggc')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('GGC must be a positive number'),
  body('ggc_price')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('GGC price must be a positive number'),
  body('cdn')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('CDN must be a positive number'),
  body('cdn_price')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('CDN price must be a positive number'),
  body('bdix')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('BDIX must be a positive number'),
  body('bdix_price')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('BDIX price must be a positive number'),
  body('baishan')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('BAISHAN must be a positive number'),
  body('baishan_price')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('BAISHAN price must be a positive number'),
  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be either Active or Inactive'),
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Recursively sanitize object properties
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/<[^>]*>/g, ''); // Remove HTML tags
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  authLimiter,
  apiLimiter,
  strictLimiter,
  helmetConfig,
  validateLogin,
  validateRegister,
  validateUserUpdate,
  validateCustomer,
  validateBill,
  handleValidationErrors,
  sanitizeInput,
  corsOptions
};