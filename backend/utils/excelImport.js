const XLSX = require('xlsx');
const Papa = require('papaparse');

/**
 * Excel column mapping based on Sales-Pannel-Oct.2025.xlsx
 */
const EXCEL_COLUMN_MAPPING = {
  customers: {
    'S/L': 'serial_number',
    'Name Of Party': 'name_of_party',
    'Address': 'address',
    'E-mail': 'email',
    'Proprietor  Name': 'proprietor_name',
    'Phone Number': 'phone_number',
    'Link ID': 'link_id',
    'Remarks': 'remarks',
    'KAM': 'kam',
  },
  bills: {
    'S/L': 'serial_number',
    'Name Of Party': 'name_of_party',
    'NTTN  Com': 'nttn_com',
    'NTTN  Cap': 'nttn_cap',
    'Active Date': 'active_date',
    'Billing Date': 'billing_date',
    'Termination Date': 'termination_date',
    'IIG-QT': 'iig_qt_price',
    'Price': 'service_price',
    'FNA': 'fna_price',
    'GGC': 'ggc_price',
    'CDN': 'cdn_price',
    'BDIX': 'bdix_price',
    'BAISHAN': 'baishan_price',
    'Total Bill': 'total_bill',
    'Total Received': 'total_received',
    'Total Due': 'total_due',
    'Discount': 'discount',
  },
};

/**
 * Parse Excel file and extract data
 * @param {Buffer} fileBuffer - File buffer from upload
 * @param {string} sheetName - Name of the sheet to parse
 * @returns {Array} Parsed data
 */
const parseExcelFile = (fileBuffer, sheetName = 0) => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[sheetName]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Parse Excel file and extract data from specific sheet
 * @param {Buffer} fileBuffer - File buffer from upload
 * @param {string} sheetName - Name of the sheet to parse (e.g., 'SUM')
 * @returns {Array} Parsed data
 */
const parseExcelFileByName = (fileBuffer, sheetName = 'SUM') => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Find sheet by name
    let worksheet;
    if (workbook.SheetNames.includes(sheetName)) {
      worksheet = workbook.Sheets[sheetName];
    } else {
      // Fallback to first sheet if specified sheet not found
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
    }
    
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Parse CSV file and extract data
 * @param {Buffer} fileBuffer - File buffer from upload
 * @returns {Array} Parsed data
 */
const parseCSVFile = (fileBuffer) => {
  try {
    const csvString = fileBuffer.toString('utf-8');
    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV file: ${error.message}`));
        },
      });
    });
  } catch (error) {
    throw new Error(`Failed to parse CSV file: ${error.message}`);
  }
};

/**
 * Validate customer data
 * @param {Object} customer - Customer object to validate
 * @returns {Object} Validation result with errors array
 */
const validateCustomer = (customer) => {
  const errors = [];

  if (!customer.serial_number) {
    errors.push('Serial number is required');
  }
  if (!customer.name_of_party) {
    errors.push('Name of party is required');
  }
  if (customer.email && !isValidEmail(customer.email)) {
    errors.push('Invalid email format');
  }
  if (customer.phone_number && !isValidPhoneNumber(customer.phone_number)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate bill data
 * @param {Object} bill - Bill object to validate
 * @returns {Object} Validation result with errors array
 */
const validateBill = (bill) => {
  const errors = [];

  if (!bill.customer_id && !bill.name_of_party) {
    errors.push('Customer ID or Name is required');
  }
  if (bill.active_date && !isValidDate(bill.active_date)) {
    errors.push('Invalid active date format');
  }
  if (bill.billing_date && !isValidDate(bill.billing_date)) {
    errors.push('Invalid billing date format');
  }
  if (bill.termination_date && !isValidDate(bill.termination_date)) {
    errors.push('Invalid termination date format');
  }

  // Validate numeric fields
  const numericFields = [
    'iig_qt_price',
    'fna_price',
    'ggc_price',
    'cdn_price',
    'bdix_price',
    'baishan_price',
    'total_bill',
    'total_received',
    'total_due',
    'discount',
  ];

  numericFields.forEach((field) => {
    if (bill[field] && isNaN(parseFloat(bill[field]))) {
      errors.push(`${field} must be a valid number`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Helper function to validate email
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Helper function to validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * Helper function to validate date
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if valid
 */
const isValidDate = (date) => {
  if (!date) return true;
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate);
};

/**
 * Map Excel columns to database fields
 * @param {Array} data - Raw data from Excel/CSV
 * @param {string} type - Type of data ('customers' or 'bills')
 * @returns {Array} Mapped data
 */
const mapExcelColumns = (data, type = 'customers') => {
  const mapping = EXCEL_COLUMN_MAPPING[type];
  if (!mapping) {
    throw new Error(`Unknown data type: ${type}`);
  }

  return data.map((row) => {
    const mappedRow = {};
    Object.keys(row).forEach((key) => {
      const mappedKey = mapping[key] || key;
      mappedRow[mappedKey] = row[key];
    });
    return mappedRow;
  });
};

module.exports = {
  parseExcelFile,
  parseExcelFileByName,
  parseCSVFile,
  validateCustomer,
  validateBill,
  mapExcelColumns,
  EXCEL_COLUMN_MAPPING,
};
