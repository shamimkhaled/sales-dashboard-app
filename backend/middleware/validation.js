// Data Validation and Cross-Check Middleware
const Joi = require('joi');

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bangladeshi phone number validation regex
const bdPhoneRegex = /^(\+880|880|0)?1[3-9]\d{8}$/;

// Revenue amount validation (decimal with up to 2 decimal places)
const revenueRegex = /^\d+(\.\d{1,2})?$/;

// Date validation (YYYY-MM-DD format and not in future)
const validateDate = (value, helpers) => {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(date.getTime())) {
    return helpers.error('date.invalid');
  }

  if (date > today) {
    return helpers.error('date.future');
  }

  return value;
};

// Customer validation schema
const customerValidationSchema = Joi.object({
  serial_number: Joi.number().integer().min(1).optional(),
  name_of_party: Joi.string().trim().min(1).max(255).required()
    .messages({
      'string.empty': 'Name of party is required',
      'string.max': 'Name of party must be less than 255 characters'
    }),
  address: Joi.string().trim().max(500).optional()
    .messages({
      'string.max': 'Address must be less than 500 characters'
    }),
  email: Joi.string().trim().email().optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  proprietor_name: Joi.string().trim().max(255).optional()
    .messages({
      'string.max': 'Proprietor name must be less than 255 characters'
    }),
  phone_number: Joi.string().trim().regex(bdPhoneRegex).optional()
    .messages({
      'string.pattern.base': 'Please provide a valid Bangladeshi phone number'
    }),
  link_id: Joi.string().trim().max(100).optional()
    .messages({
      'string.max': 'Link ID must be less than 100 characters'
    }),
  remarks: Joi.string().trim().max(1000).optional()
    .messages({
      'string.max': 'Remarks must be less than 1000 characters'
    }),
  kam: Joi.string().trim().max(255).optional()
    .messages({
      'string.max': 'KAM name must be less than 255 characters'
    }),
  status: Joi.string().valid('Active', 'Inactive', 'Suspended').optional()
    .default('Active')
});

// Bill validation schema
const billValidationSchema = Joi.object({
  customer_id: Joi.number().integer().min(1).required()
    .messages({
      'number.base': 'Valid customer ID is required',
      'number.min': 'Customer ID must be a positive number'
    }),
  nttn_cap: Joi.string().trim().max(100).optional(),
  nttn_com: Joi.string().trim().max(100).optional(),
  active_date: Joi.date().iso().optional().custom(validateDate)
    .messages({
      'date.format': 'Active date must be in YYYY-MM-DD format',
      'date.future': 'Active date cannot be in the future'
    }),
  billing_date: Joi.date().iso().required().custom(validateDate)
    .messages({
      'date.format': 'Billing date must be in YYYY-MM-DD format',
      'date.future': 'Billing date cannot be in the future',
      'any.required': 'Billing date is required'
    }),
  termination_date: Joi.date().iso().optional().custom(validateDate).when('active_date', {
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref('active_date'))
  })
    .messages({
      'date.format': 'Termination date must be in YYYY-MM-DD format',
      'date.future': 'Termination date cannot be in the future',
      'date.greater': 'Termination date must be after active date'
    }),
  iig_qt_price: Joi.number().min(0).optional().default(0),
  fna_price: Joi.number().min(0).optional().default(0),
  ggc_price: Joi.number().min(0).optional().default(0),
  cdn_price: Joi.number().min(0).optional().default(0),
  bdix_price: Joi.number().min(0).optional().default(0),
  baishan_price: Joi.number().min(0).optional().default(0),
  total_bill: Joi.number().min(0).optional(),
  total_received: Joi.number().min(0).optional().default(0),
  total_due: Joi.number().min(0).optional().default(0),
  discount: Joi.number().min(0).optional().default(0),
  status: Joi.string().valid('Active', 'Inactive', 'Terminated').optional()
    .default('Active'),
  remarks: Joi.string().trim().max(1000).optional()
});

// Cross-validation middleware for bills
const validateBillData = async (req, res, next) => {
  try {
    // Validate basic structure
    const { error, value } = billValidationSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    // Cross-check calculations
    const billData = value;
    const calculatedTotal = (billData.iig_qt_price || 0) +
                           (billData.fna_price || 0) +
                           (billData.ggc_price || 0) +
                           (billData.cdn_price || 0) +
                           (billData.bdix_price || 0) +
                           (billData.baishan_price || 0);

    // If total_bill is provided, check if it matches calculation
    if (billData.total_bill !== undefined && Math.abs(billData.total_bill - calculatedTotal) > 0.01) {
      return res.status(400).json({
        error: 'Total bill calculation mismatch',
        code: 'CALCULATION_ERROR',
        details: {
          provided: billData.total_bill,
          calculated: calculatedTotal,
          difference: billData.total_bill - calculatedTotal
        }
      });
    }

    // Auto-calculate total_bill if not provided
    if (billData.total_bill === undefined) {
      billData.total_bill = calculatedTotal;
    }

    // Validate total_due calculation
    const expectedDue = billData.total_bill - (billData.total_received || 0) - (billData.discount || 0);
    if (billData.total_due !== undefined && Math.abs(billData.total_due - expectedDue) > 0.01) {
      return res.status(400).json({
        error: 'Total due calculation mismatch',
        code: 'CALCULATION_ERROR',
        details: {
          provided: billData.total_due,
          calculated: expectedDue,
          difference: billData.total_due - expectedDue
        }
      });
    }

    // Auto-calculate total_due if not provided
    if (billData.total_due === undefined) {
      billData.total_due = Math.max(0, expectedDue);
    }

    // Check if customer exists
    const Customer = require('../models/Customer');
    const customer = await Customer.getById(billData.customer_id);
    if (!customer) {
      return res.status(400).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND',
        details: { customer_id: billData.customer_id }
      });
    }

    // Check for duplicate bills (same customer, same billing date)
    const Bill = require('../models/Bill');
    const existingBills = await Bill.getByCustomer(billData.customer_id);
    const duplicateBill = existingBills.find(bill =>
      bill.billing_date === billData.billing_date &&
      bill.id !== req.params.id // Exclude current bill when updating
    );

    if (duplicateBill) {
      return res.status(400).json({
        error: 'Duplicate bill found for this customer on the same billing date',
        code: 'DUPLICATE_BILL',
        details: {
          customer_id: billData.customer_id,
          billing_date: billData.billing_date,
          existing_bill_id: duplicateBill.id
        }
      });
    }

    // Attach validated data to request
    req.validatedData = billData;
    next();

  } catch (error) {
    console.error('Bill validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      code: 'VALIDATION_SYSTEM_ERROR'
    });
  }
};

// Cross-validation middleware for customers
const validateCustomerData = async (req, res, next) => {
  try {
    // Validate basic structure
    const { error, value } = customerValidationSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    const customerData = value;

    // Check for duplicate email if provided
    if (customerData.email) {
      const Customer = require('../models/Customer');
      const existingCustomer = await Customer.getAll({ search: customerData.email });
      const duplicateCustomer = existingCustomer.find(c =>
        c.email === customerData.email &&
        c.id !== req.params.id // Exclude current customer when updating
      );

      if (duplicateCustomer) {
        return res.status(400).json({
          error: 'Customer with this email already exists',
          code: 'DUPLICATE_EMAIL',
          details: { email: customerData.email }
        });
      }
    }

    // Check for duplicate phone number if provided
    if (customerData.phone_number) {
      const Customer = require('../models/Customer');
      const existingCustomer = await Customer.getAll({ search: customerData.phone_number });
      const duplicateCustomer = existingCustomer.find(c =>
        c.phone_number === customerData.phone_number &&
        c.id !== req.params.id // Exclude current customer when updating
      );

      if (duplicateCustomer) {
        return res.status(400).json({
          error: 'Customer with this phone number already exists',
          code: 'DUPLICATE_PHONE',
          details: { phone_number: customerData.phone_number }
        });
      }
    }

    // Attach validated data to request
    req.validatedData = customerData;
    next();

  } catch (error) {
    console.error('Customer validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      code: 'VALIDATION_SYSTEM_ERROR'
    });
  }
};

// Commission calculation validation
const validateCommissionCalculation = (req, res, next) => {
  const { total_bill, total_received, discount } = req.validatedData || req.body;

  if (total_bill && total_received !== undefined) {
    const commission = (total_received / total_bill) * 100;

    // Flag suspicious commission rates
    if (commission > 100) {
      console.warn(`Suspicious commission rate: ${commission}% for bill`);
      // Could add to audit log or send notification
    }

    if (commission < 0) {
      return res.status(400).json({
        error: 'Invalid commission calculation',
        code: 'INVALID_COMMISSION',
        details: { commission_rate: commission }
      });
    }
  }

  next();
};

module.exports = {
  validateBillData,
  validateCustomerData,
  validateCommissionCalculation,
  customerValidationSchema,
  billValidationSchema
};