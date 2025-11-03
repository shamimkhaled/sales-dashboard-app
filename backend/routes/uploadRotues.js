// routes/uploadRoutes.js - Upload Routes with Export
const express = require('express');
const router = express.Router();
const {
  upload,
  uploadCustomers,
  uploadBills,
  uploadCustomersAndBills,
  exportCustomersExcel,
  exportCustomersCSV,
  exportBillsExcel,
  exportBillsCSV
} = require('../controllers/uploadController');

/**
 * @swagger
 * /upload/customers:
 *   post:
 *     summary: Upload customers from Excel/CSV
 *     description: Import customer data from an Excel or CSV file with validation
 *     tags:
 *       - Upload
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel (.xlsx) or CSV file containing customer data
 *     responses:
 *       200:
 *         description: Customers imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     errors:
 *                       type: array
 *       400:
 *         description: Invalid file format or missing required fields
 *       500:
 *         description: Server error
 */
router.post('/customers', upload.single('file'), uploadCustomers);

/**
 * @swagger
 * /upload/bills:
 *   post:
 *     summary: Upload bills from Excel/CSV
 *     description: Import bill data from an Excel or CSV file with validation
 *     tags:
 *       - Upload
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel (.xlsx) or CSV file containing bill data
 *     responses:
 *       200:
 *         description: Bills imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid file format or missing required fields
 *       500:
 *         description: Server error
 */
router.post('/bills', upload.single('file'), uploadBills);

/**
 * @swagger
 * /upload/import:
 *   post:
 *     summary: Upload and import both customers and bills from Excel/CSV
 *     description: Import customer and bill data from a single Excel or CSV file. Creates customers and associated bills in one operation.
 *     tags:
 *       - Upload
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel (.xlsx) or CSV file containing customer and bill data
 *     responses:
 *       200:
 *         description: Customers and bills imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid file format or missing required fields
 *       500:
 *         description: Server error
 */
router.post('/import', upload.single('file'), uploadCustomersAndBills);

/**
 * @swagger
 * /upload/export/customers/excel:
 *   get:
 *     summary: Export customers to Excel
 *     description: Export all customers or filtered customers to Excel format
 *     tags:
 *       - Export
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, Suspended]
 *         description: Filter by customer status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by customer name or email
 *     responses:
 *       200:
 *         description: Excel file with customers
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No customers found
 *       500:
 *         description: Server error
 */
router.get('/export/customers/excel', exportCustomersExcel);

/**
 * @swagger
 * /upload/export/customers/csv:
 *   get:
 *     summary: Export customers to CSV
 *     description: Export all customers or filtered customers to CSV format
 *     tags:
 *       - Export
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, Suspended]
 *         description: Filter by customer status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by customer name or email
 *     responses:
 *       200:
 *         description: CSV file with customers
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       404:
 *         description: No customers found
 *       500:
 *         description: Server error
 */
router.get('/export/customers/csv', exportCustomersCSV);

/**
 * @swagger
 * /upload/export/bills/excel:
 *   get:
 *     summary: Export bills to Excel
 *     description: Export all bills or filtered bills to Excel format
 *     tags:
 *       - Export
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, Terminated]
 *         description: Filter by bill status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *     responses:
 *       200:
 *         description: Excel file with bills
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No bills found
 *       500:
 *         description: Server error
 */
router.get('/export/bills/excel', exportBillsExcel);

/**
 * @swagger
 * /upload/export/bills/csv:
 *   get:
 *     summary: Export bills to CSV
 *     description: Export all bills or filtered bills to CSV format
 *     tags:
 *       - Export
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, Terminated]
 *         description: Filter by bill status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *     responses:
 *       200:
 *         description: CSV file with bills
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       404:
 *         description: No bills found
 *       500:
 *         description: Server error
 */
router.get('/export/bills/csv', exportBillsCSV);

module.exports = router;
