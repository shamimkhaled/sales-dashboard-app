// routes/dashboardRoutes.js - Dashboard Routes
const express = require('express');
const router = express.Router();
const {
  getOverview,
  getTopCustomers,
  getRevenueByService,
  getCollectionStatus,
  getCustomerStatus,
  getKAMPerformance,
  getWeeklyRevenue,
  getMonthlyRevenue,
  getYearlyRevenue,
  getCustomerWiseRevenue
} = require('../controllers/dashboardController');

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: Get dashboard overview
 *     description: Retrieve main dashboard KPIs and metrics
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCustomers:
 *                   type: integer
 *                   example: 25
 *                 totalBills:
 *                   type: number
 *                   example: 150000
 *                 totalReceived:
 *                   type: number
 *                   example: 120000
 *                 totalDue:
 *                   type: number
 *                   example: 30000
 *                 activeBills:
 *                   type: integer
 *                   example: 20
 *                 collectionRate:
 *                   type: number
 *                   example: 80
 *       500:
 *         description: Server error
 */
router.get('/overview', getOverview);

/**
 * @swagger
 * /dashboard/top-customers:
 *   get:
 *     summary: Get top customers by revenue
 *     description: Retrieve top performing customers by revenue
 *     tags:
 *       - Dashboard
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top customers to retrieve
 *     responses:
 *       200:
 *         description: Top customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name_of_party:
 *                     type: string
 *                   total_revenue:
 *                     type: number
 *                   total_received:
 *                     type: number
 *                   total_due:
 *                     type: number
 *       500:
 *         description: Server error
 */
router.get('/top-customers', getTopCustomers);

/**
 * @swagger
 * /dashboard/revenue-by-service:
 *   get:
 *     summary: Get revenue breakdown by service
 *     description: Retrieve revenue distribution across different services
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Revenue by service retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   service:
 *                     type: string
 *                     example: "IIG-QT"
 *                   revenue:
 *                     type: number
 *                   percentage:
 *                     type: number
 *       500:
 *         description: Server error
 */
router.get('/revenue-by-service', getRevenueByService);

/**
 * @swagger
 * /dashboard/collection-status:
 *   get:
 *     summary: Get collection status
 *     description: Retrieve payment collection status overview
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Collection status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalBilled:
 *                   type: number
 *                 totalCollected:
 *                   type: number
 *                 totalOutstanding:
 *                   type: number
 *                 collectionPercentage:
 *                   type: number
 *                 pendingBills:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.get('/collection-status', getCollectionStatus);

/**
 * @swagger
 * /dashboard/customer-status:
 *   get:
 *     summary: Get customer status distribution
 *     description: Retrieve distribution of customers by status
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Customer status distribution retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 active:
 *                   type: integer
 *                 inactive:
 *                   type: integer
 *                 suspended:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.get('/customer-status', getCustomerStatus);

/**
 * @swagger
 * /dashboard/kam-performance:
 *   get:
 *     summary: Get KAM performance analytics
 *     description: Retrieve performance metrics for each KAM (Key Account Manager)
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: KAM performance data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   kam:
 *                     type: string
 *                     example: "Ahmed Khan"
 *                   total_customers:
 *                     type: integer
 *                     example: 15
 *                   active_customers:
 *                     type: integer
 *                     example: 12
 *                   total_revenue:
 *                     type: number
 *                     example: 450000
 *                   avg_revenue_per_customer:
 *                     type: number
 *                     example: 30000
 *                   total_received:
 *                     type: number
 *                     example: 380000
 *                   total_due:
 *                     type: number
 *                     example: 70000
 *       500:
 *         description: Server error
 */
router.get('/kam-performance', getKAMPerformance);

/**
 * @swagger
 * /dashboard/weekly-revenue:
 *   get:
 *     summary: Get weekly revenue analytics
 *     description: Retrieve revenue data grouped by week
 *     tags:
 *       - Dashboard
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
 *                     example: "2025-W44"
 *                   date:
 *                     type: string
 *                     example: "2025-11-03"
 *                   revenue:
 *                     type: number
 *                   received:
 *                     type: number
 *                   due:
 *                     type: number
 *       500:
 *         description: Server error
 */
router.get('/weekly-revenue', getWeeklyRevenue);

/**
 * @swagger
 * /dashboard/monthly-revenue:
 *   get:
 *     summary: Get monthly revenue analytics
 *     description: Retrieve revenue data grouped by month
 *     tags:
 *       - Dashboard
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
 *                     example: "2025-11"
 *                   revenue:
 *                     type: number
 *                   received:
 *                     type: number
 *                   due:
 *                     type: number
 *                   bill_count:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get('/monthly-revenue', getMonthlyRevenue);

/**
 * @swagger
 * /dashboard/yearly-revenue:
 *   get:
 *     summary: Get yearly revenue analytics
 *     description: Retrieve revenue data grouped by year
 *     tags:
 *       - Dashboard
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
 *                     example: "2025"
 *                   revenue:
 *                     type: number
 *                   received:
 *                     type: number
 *                   due:
 *                     type: number
 *                   bill_count:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get('/yearly-revenue', getYearlyRevenue);

/**
 * @swagger
 * /dashboard/customer-wise-revenue:
 *   get:
 *     summary: Get customer-wise revenue analytics
 *     description: Retrieve revenue data broken down by customer
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Customer-wise revenue data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name_of_party:
 *                     type: string
 *                   serial_number:
 *                     type: string
 *                   kam:
 *                     type: string
 *                   status:
 *                     type: string
 *                   leaveDate:
 *                     type: string
 *                   bill_count:
 *                     type: integer
 *                   revenue:
 *                     type: number
 *                   received:
 *                     type: number
 *                   due:
 *                     type: number
 *                   collectionRate:
 *                     type: number
 *       500:
 *         description: Server error
 */
router.get('/customer-wise-revenue', getCustomerWiseRevenue);

module.exports = router;
