// routes/uploadRoutes.js - Upload Routes
const express = require('express');
const router = express.Router();
const { upload, uploadCustomers, uploadBills } = require('../controllers/uploadController');

// POST /api/upload/customers - Upload customers from Excel/CSV
router.post('/customers', upload.single('file'), uploadCustomers);

// POST /api/upload/bills - Upload bills from Excel/CSV
router.post('/bills', upload.single('file'), uploadBills);

module.exports = router;