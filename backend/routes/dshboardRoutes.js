// routes/dashboardRoutes.js - Dashboard Routes
const express = require('express');
const router = express.Router();
const {
  getOverview,
  getTopCustomers,
  getRevenueByService,
  getCollectionStatus,
  getCustomerStatus
} = require('../controllers/dashboardController');

// GET /api/dashboard/overview - Get dashboard overview
router.get('/overview', getOverview);

// GET /api/dashboard/top-customers - Get top customers by revenue
router.get('/top-customers', getTopCustomers);

// GET /api/dashboard/revenue-by-service - Get revenue breakdown by service
router.get('/revenue-by-service', getRevenueByService);

// GET /api/dashboard/collection-status - Get collection status
router.get('/collection-status', getCollectionStatus);

// GET /api/dashboard/customer-status - Get customer status distribution
router.get('/customer-status', getCustomerStatus);

module.exports = router;