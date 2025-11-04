// Upload Controller with Export
const multer = require('multer');
const XLSX = require('xlsx');
const Papa = require('papaparse');
const path = require('path');
const fs = require('fs');
const Customer = require('../models/Customer');
const Bill = require('../models/Bill');
const { mapExcelColumns, validateCustomer, validateBill, parseExcelFileByName } = require('../utils/excelImport');
const { exportCustomersToExcel, exportCustomersToCSV, exportBillsToExcel, exportBillsToCSV } = require('../utils/excelExport');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
      'application/octet-stream' // For curl and other tools that might send this
    ];

    const fileExt = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];

    // Check both MIME type and file extension
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  }
});

/**
 * Upload customers from Excel/CSV with validation
 */
const uploadCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    let data = [];

    try {
      if (fileExt === '.csv') {
        const csvContent = fs.readFileSync(filePath, 'utf8');
        const parsed = Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true
        });
        data = parsed.data;
      } else if (fileExt === '.xlsx' || fileExt === '.xls') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      } else {
        throw new Error('Invalid file format. Please upload .xlsx or .csv file');
      }
    } catch (parseError) {
      throw new Error(`Failed to parse file: ${parseError.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No data found in the file');
    }

    // Map Excel columns to database fields
    const mappedData = mapExcelColumns(data, 'customers');

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      warnings: []
    };

    for (let i = 0; i < mappedData.length; i++) {
      const row = mappedData[i];

      try {
        // Validate customer data
        const validation = validateCustomer(row);
        if (!validation.isValid) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            errors: validation.errors,
            data: row
          });
          continue;
        }

        // Prepare customer data
        const customerData = {
          serial_number: row.serial_number || i + 1,
          name_of_party: row.name_of_party,
          address: row.address || '',
          email: row.email || '',
          proprietor_name: row.proprietor_name || '',
          phone_number: row.phone_number || '',
          link_id: row.link_id || '',
          remarks: row.remarks || '',
          kam: row.kam || '',
          status: row.status || 'Active'
        };

        await Customer.create(customerData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message,
          data: row
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Upload completed. ${results.success} customers imported, ${results.failed} failed.`,
      data: results
    });

  } catch (error) {
    console.error('Error uploading customers:', error);
    if (fs.existsSync(req.file?.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to upload customers',
      details: error.message
    });
  }
};

/**
 * Upload bills from Excel/CSV with validation
 */
const uploadBills = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    let data = [];

    if (fileExt === '.csv') {
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true
      });
      data = parsed.data;
    } else {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    // Map Excel columns to database fields
    const mappedData = mapExcelColumns(data, 'bills');

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      warnings: []
    };

    for (let i = 0; i < mappedData.length; i++) {
      const row = mappedData[i];

      try {
        // Validate bill data
        const validation = validateBill(row);
        if (!validation.isValid) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            errors: validation.errors,
            data: row
          });
          continue;
        }

        // Find customer by serial number or name
        let customerId = null;
        if (row.customer_id) {
          customerId = row.customer_id;
        } else if (row.name_of_party) {
          const customers = await Customer.getAll({ search: row.name_of_party });
          if (customers.length > 0) {
            customerId = customers[0].id;
          }
        }

        if (!customerId) {
          throw new Error('Customer not found. Please ensure customer exists or provide customer_id.');
        }

        const billData = {
          customer_id: customerId,
          nttn_cap: row.nttn_cap || '',
          nttn_com: row.nttn_com || '',
          active_date: row.active_date || null,
          billing_date: row.billing_date || null,
          termination_date: row.termination_date || null,
          iig_qt_price: parseFloat(row.iig_qt_price) || 0,
          fna_price: parseFloat(row.fna_price) || 0,
          ggc_price: parseFloat(row.ggc_price) || 0,
          cdn_price: parseFloat(row.cdn_price) || 0,
          bdix_price: parseFloat(row.bdix_price) || 0,
          baishan_price: parseFloat(row.baishan_price) || 0,
          total_bill: parseFloat(row.total_bill) || 0,
          total_received: parseFloat(row.total_received) || 0,
          total_due: parseFloat(row.total_due) || 0,
          discount: parseFloat(row.discount) || 0,
          status: row.status || 'Active'
        };

        await Bill.create(billData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message,
          data: row
        });
      }
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Upload completed. ${results.success} bills imported, ${results.failed} failed.`,
      data: results
    });

  } catch (error) {
    console.error('Error uploading bills:', error);
    if (fs.existsSync(req.file?.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to upload bills',
      details: error.message
    });
  }
};

/**
 * Export customers to Excel
 */
const exportCustomersExcel = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status
    };

    const customers = await Customer.getAll(filters);

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No customers found to export'
      });
    }

    const buffer = exportCustomersToExcel(customers);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export customers',
      details: error.message
    });
  }
};

/**
 * Export customers to CSV
 */
const exportCustomersCSV = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status
    };

    const customers = await Customer.getAll(filters);

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No customers found to export'
      });
    }

    const csv = exportCustomersToCSV(customers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export customers',
      details: error.message
    });
  }
};

/**
 * Export bills to Excel
 */
const exportBillsExcel = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      customerId: req.query.customerId
    };

    // Get bills with customer information joined
    const bills = await Bill.getAllWithCustomerInfo(filters);

    if (bills.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No bills found to export'
      });
    }

    const buffer = exportBillsToExcel(bills);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Sales-Pannel-Oct.2025.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting bills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export bills',
      details: error.message
    });
  }
};

/**
 * Export bills to CSV
 */
const exportBillsCSV = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      customerId: req.query.customerId
    };

    const bills = await Bill.getAll(filters);

    if (bills.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No bills found to export'
      });
    }

    const csv = exportBillsToCSV(bills);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bills.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting bills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export bills',
      details: error.message
    });
  }
};

/**
 * Upload both customers and bills from a single Excel file
 * This unified endpoint imports data from the SUM sheet
 */
const uploadCustomersAndBills = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    let data = [];

    try {
      if (fileExt === '.csv') {
        const csvContent = fs.readFileSync(filePath, 'utf8');
        const parsed = Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true
        });
        data = parsed.data;
      } else if (fileExt === '.xlsx' || fileExt === '.xls') {
       // Try to read from SUM sheet first, fallback to first sheet
       const fileBuffer = fs.readFileSync(filePath);
       const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
       
       let worksheet;
       let sheetName = workbook.SheetNames[0];
       
       // Look for SUM sheet (with or without suffix)
       const sumSheet = workbook.SheetNames.find(name => name.includes('SUM'));
       if (sumSheet) {
         sheetName = sumSheet;
       }
       
       worksheet = workbook.Sheets[sheetName];
       
       // Read all data as arrays first
       const allRows = XLSX.utils.sheet_to_json(worksheet, {
         header: 1,
         defval: ''
       });
       
       // Find header row (row with 'S/L' column)
       let headerRowIdx = 0;
       for (let i = 0; i < allRows.length; i++) {
         if (allRows[i][0] === 'S/L ' || allRows[i][0] === 'S/L') {
           headerRowIdx = i;
           break;
         }
       }
       
       const headerRow = allRows[headerRowIdx];
       const dataRows = allRows.slice(headerRowIdx + 1);
       
       // Convert array rows to objects using header row
       data = dataRows.map(row => {
         const obj = {};
         headerRow.forEach((header, idx) => {
           if (header && header.trim()) {
             obj[header.trim()] = row[idx] || '';
           }
         });
         return obj;
       }).filter(row => row['S/L'] || row['S/L ']); // Filter out empty rows
      } else {
        throw new Error('Invalid file format. Please upload .xlsx or .csv file');
      }
    } catch (parseError) {
      throw new Error(`Failed to parse file: ${parseError.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No data found in the file');
    }

    // Map Excel columns to database fields
    const mappedData = mapExcelColumns(data, 'customers');

    const results = {
      customers: {
        success: 0,
        failed: 0,
        errors: []
      },
      bills: {
        success: 0,
        failed: 0,
        errors: []
      }
    };

    // Process each row - create customer and bill
    for (let i = 0; i < mappedData.length; i++) {
      const row = mappedData[i];

      try {
        // Skip empty rows
        if (!row.name_of_party || row.name_of_party.toString().trim() === '') {
          continue;
        }

        // Validate and create customer
        const customerValidation = validateCustomer(row);
        if (!customerValidation.isValid) {
          results.customers.failed++;
          results.customers.errors.push({
            row: i + 1,
            errors: customerValidation.errors,
            data: row
          });
          continue;
        }

        // Prepare customer data
        const customerData = {
          serial_number: row.serial_number || i + 1,
          name_of_party: row.name_of_party,
          address: row.address || '',
          email: row.email || '',
          proprietor_name: row.proprietor_name || '',
          phone_number: row.phone_number || '',
          link_id: row.link_id || '',
          remarks: row.remarks || '',
          kam: row.kam || '',
          status: 'Active'
        };

        // Create or find customer
        let customer;
        const existingCustomers = await Customer.getAll({ search: row.name_of_party });
        
        if (existingCustomers.length > 0) {
          customer = existingCustomers[0];
        } else {
          customer = await Customer.create(customerData);
        }

        results.customers.success++;

        // Now create bill for this customer
        const billValidation = validateBill(row);
        if (!billValidation.isValid) {
          results.bills.failed++;
          results.bills.errors.push({
            row: i + 1,
            errors: billValidation.errors,
            data: row
          });
          continue;
        }

        const billData = {
          customer_id: customer.id,
          nttn_cap: row.nttn_cap || '',
          nttn_com: row.nttn_com || '',
          active_date: row.active_date || null,
          billing_date: row.billing_date || null,
          termination_date: row.termination_date || null,
          iig_qt_price: parseFloat(row.iig_qt_price) || 0,
          fna_price: parseFloat(row.fna_price) || 0,
          ggc_price: parseFloat(row.ggc_price) || 0,
          cdn_price: parseFloat(row.cdn_price) || 0,
          bdix_price: parseFloat(row.bdix_price) || 0,
          baishan_price: parseFloat(row.baishan_price) || 0,
          total_bill: parseFloat(row.total_bill) || 0,
          total_received: parseFloat(row.total_received) || 0,
          total_due: parseFloat(row.total_due) || 0,
          discount: parseFloat(row.discount) || 0,
          status: 'Active'
        };

        await Bill.create(billData);
        results.bills.success++;
      } catch (error) {
        results.bills.failed++;
        results.bills.errors.push({
          row: i + 1,
          error: error.message,
          data: row
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Import completed. ${results.customers.success} customers and ${results.bills.success} bills imported.`,
      data: results
    });

  } catch (error) {
    console.error('Error uploading customers and bills:', error);
    if (fs.existsSync(req.file?.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to upload data',
      details: error.message
    });
  }
};

module.exports = {
  upload,
  uploadCustomers,
  uploadBills,
  uploadCustomersAndBills,
  exportCustomersExcel,
  exportCustomersCSV,
  exportBillsExcel,
  exportBillsCSV
};
