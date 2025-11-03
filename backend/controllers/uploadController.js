// controllers/uploadController.js - Upload Controller
const multer = require('multer');
const XLSX = require('xlsx');
const Papa = require('papaparse');
const path = require('path');
const fs = require('fs');
const Customer = require('../models/Customer');
const Bill = require('../models/Bill');

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
      'application/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  }
});

// Upload customers from Excel/CSV
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

    if (fileExt === '.csv') {
      // Parse CSV
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true
      });
      data = parsed.data;
    } else {
      // Parse Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    // Process and validate data
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // Map columns (assuming standard column names)
        const customerData = {
          serial_number: row.serial_number || row['Serial Number'] || row['S.No'] || i + 1,
          name_of_party: row.name_of_party || row['Name of Party'] || row['Customer Name'] || row.name,
          address: row.address || row['Address'] || '',
          email: row.email || row['Email'] || '',
          proprietor_name: row.proprietor_name || row['Proprietor Name'] || '',
          phone_number: row.phone_number || row['Phone Number'] || row.phone || '',
          link_id: row.link_id || row['Link ID'] || '',
          remarks: row.remarks || row['Remarks'] || '',
          kam: row.kam || row['KAM'] || row['Account Manager'] || '',
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
    res.status(500).json({
      success: false,
      error: 'Failed to upload customers'
    });
  }
};

// Upload bills from Excel/CSV
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

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // Find customer by serial number or name
        let customerId = null;
        if (row.customer_id) {
          customerId = row.customer_id;
        } else if (row.serial_number) {
          const customer = await Customer.getAll({ search: row.serial_number });
          if (customer.length > 0) {
            customerId = customer[0].id;
          }
        }

        if (!customerId) {
          throw new Error('Customer not found. Please ensure customer exists or provide customer_id.');
        }

        const billData = {
          customer_id: customerId,
          nttn_cap: row.nttn_cap || row['NTTN CAP'] || '',
          nttn_com: row.nttn_com || row['NTTN COM'] || '',
          active_date: row.active_date || row['Active Date'] || row.activation_date,
          billing_date: row.billing_date || row['Billing Date'] || row.date,
          termination_date: row.termination_date || row['Termination Date'] || null,
          iig_qt_price: parseFloat(row.iig_qt_price || row['IIG/QT Price'] || 0),
          fna_price: parseFloat(row.fna_price || row['FNA Price'] || 0),
          ggc_price: parseFloat(row.ggc_price || row['GGC Price'] || 0),
          cdn_price: parseFloat(row.cdn_price || row['CDN Price'] || 0),
          bdix_price: parseFloat(row.bdix_price || row['BDIX Price'] || 0),
          baishan_price: parseFloat(row.baishan_price || row['Baishan Price'] || 0),
          total_bill: parseFloat(row.total_bill || row['Total Bill'] || 0),
          total_received: parseFloat(row.total_received || row['Total Received'] || 0),
          total_due: parseFloat(row.total_due || row['Total Due'] || 0),
          discount: parseFloat(row.discount || row['Discount'] || 0),
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
    res.status(500).json({
      success: false,
      error: 'Failed to upload bills'
    });
  }
};

module.exports = {
  upload,
  uploadCustomers,
  uploadBills
};