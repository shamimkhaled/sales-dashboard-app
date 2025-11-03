// routes/billRoutes.js - Bill Routes
const express = require('express');
const router = express.Router();
const {
  getAllBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
  getBillStats,
  getBillsByCustomer
} = require('../controllers/billController');

// GET /api/bills - Get all bills
router.get('/', getAllBills);

// GET /api/bills/stats - Get bill statistics
router.get('/stats', getBillStats);

// GET /api/bills/customer/:customerId - Get bills by customer
router.get('/customer/:customerId', getBillsByCustomer);

// GET /api/bills/:id - Get bill by ID
router.get('/:id', getBillById);

// POST /api/bills - Create new bill
router.post('/', createBill);

// PUT /api/bills/:id - Update bill
router.put('/:id', updateBill);

// DELETE /api/bills/:id - Delete bill
router.delete('/:id', deleteBill);

module.exports = router;