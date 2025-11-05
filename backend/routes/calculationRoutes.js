// Calculation Routes for revenue verification and calculations
const express = require('express');
const router = express.Router();
const {
  getRevenueCalculations,
  verifyCalculations,
  getCalculationSummary,
  getMonthlyRevenue,
  getWeeklyRevenue,
  getYearlyRevenue,
  getRevenueByCustomer
} = require('../controllers/calculationController');
const { authenticate, requirePermission, logActivity } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/security');

// All calculation routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /calculations/revenue:
 *   get:
 *     summary: Get revenue calculations
 *     description: Retrieve revenue calculations with optional date and customer filters
 *     tags:
 *       - Calculations
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for revenue calculation (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for revenue calculation (YYYY-MM-DD)
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: integer
 *         description: Filter by specific customer ID
 *     responses:
 *       200:
 *         description: Revenue calculations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:
 *                     type: string
 *                   year:
 *                     type: string
 *                   monthly_revenue:
 *                     type: number
 *                   monthly_received:
 *                     type: number
 *                   monthly_due:
 *                     type: number
 *                   bill_count:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get('/revenue', apiLimiter, requirePermission('bills:read'), logActivity('view_revenue_calculations', 'calculation'), getRevenueCalculations);

/**
 * @swagger
 * /calculations/verify/{billId}:
 *   get:
 *     summary: Verify calculations for a specific bill
 *     description: Cross-check calculations for a specific bill record
 *     tags:
 *       - Calculations
 *     parameters:
 *       - in: path
 *         name: billId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bill ID to verify
 *     responses:
 *       200:
 *         description: Bill calculations verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   customer_id:
 *                     type: integer
 *                   calculated_total:
 *                     type: number
 *                   total_bill:
 *                     type: number
 *                   total_calculation_status:
 *                     type: string
 *                     enum: [Valid, Invalid]
 *                   balance_calculation_status:
 *                     type: string
 *                     enum: [Valid, Invalid]
 *       500:
 *         description: Server error
 */
router.get('/verify/:billId', apiLimiter, requirePermission('bills:read'), logActivity('verify_bill_calculation', 'calculation'), verifyCalculations);

/**
 * @swagger
 * /calculations/verify:
 *   get:
 *     summary: Verify all calculations
 *     description: Cross-check calculations for all bill records
 *     tags:
 *       - Calculations
 *     responses:
 *       200:
 *         description: All bill calculations verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_bills:
 *                       type: integer
 *                     valid_calculations:
 *                       type: integer
 *                     invalid_calculations:
 *                       type: integer
 *                     valid_balances:
 *                       type: integer
 *                     invalid_balances:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/verify', apiLimiter, requirePermission('bills:read'), logActivity('verify_all_calculations', 'calculation'), verifyCalculations);

/**
 * @swagger
 * /calculations/summary:
 *   get:
 *     summary: Get calculation summary
 *     description: Retrieve summary of calculation verification status
 *     tags:
 *       - Calculations
 *     responses:
 *       200:
 *         description: Calculation summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_bills:
 *                   type: integer
 *                 valid_calculations:
 *                   type: integer
 *                 valid_balances:
 *                   type: integer
 *                 invalid_calculations:
 *                   type: integer
 *                 invalid_balances:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.get('/summary', apiLimiter, requirePermission('bills:read'), logActivity('view_calculation_summary', 'calculation'), getCalculationSummary);

/**
 * @swagger
 * /calculations/monthly:
 *   get:
 *     summary: Get monthly revenue breakdown
 *     description: Retrieve monthly revenue data with optional year/month filters
 *     tags:
 *       - Calculations
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by specific year
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Filter by specific month (1-12)
 *     responses:
 *       200:
 *         description: Monthly revenue data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:
 *                     type: string
 *                   total_revenue:
 *                     type: number
 *                   total_received:
 *                     type: number
 *                   total_due:
 *                     type: number
 *                   bill_count:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get('/monthly', apiLimiter, requirePermission('bills:read'), logActivity('view_monthly_revenue', 'calculation'), getMonthlyRevenue);

/**
 * @swagger
 * /calculations/weekly:
 *   get:
 *     summary: Get weekly revenue breakdown
 *     description: Retrieve weekly revenue data with optional year filter
 *     tags:
 *       - Calculations
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by specific year
 *     responses:
 *       200:
 *         description: Weekly revenue data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   week:
 *                     type: string
 *                   total_revenue:
 *                     type: number
 *                   total_received:
 *                     type: number
 *                   total_due:
 *                     type: number
 *                   bill_count:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get('/weekly', apiLimiter, requirePermission('bills:read'), logActivity('view_weekly_revenue', 'calculation'), getWeeklyRevenue);

/**
 * @swagger
 * /calculations/yearly:
 *   get:
 *     summary: Get yearly revenue breakdown
 *     description: Retrieve yearly revenue data
 *     tags:
 *       - Calculations
 *     responses:
 *       200:
 *         description: Yearly revenue data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   year:
 *                     type: string
 *                   total_revenue:
 *                     type: number
 *                   total_received:
 *                     type: number
 *                   total_due:
 *                     type: number
 *                   bill_count:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get('/yearly', apiLimiter, requirePermission('bills:read'), logActivity('view_yearly_revenue', 'calculation'), getYearlyRevenue);

/**
 * @swagger
 * /calculations/by-customer:
 *   get:
 *     summary: Get revenue by customer
 *     description: Retrieve revenue breakdown grouped by customer
 *     tags:
 *       - Calculations
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for revenue calculation (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for revenue calculation (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Revenue by customer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   customer_id:
 *                     type: integer
 *                   customer_name:
 *                     type: string
 *                   total_revenue:
 *                     type: number
 *                   total_received:
 *                     type: number
 *                   total_due:
 *                     type: number
 *                   bill_count:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get('/by-customer', apiLimiter, requirePermission('bills:read'), logActivity('view_revenue_by_customer', 'calculation'), getRevenueByCustomer);

module.exports = router;
