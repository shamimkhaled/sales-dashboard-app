// Prospect Routes
const express = require('express');
const router = express.Router();
const {
  getAllProspects,
  getProspectById,
  createProspect,
  updateProspect,
  deleteProspect,
  convertToCustomer,
  getProspectStats,
  getOverdueFollowUps,
  getProspectsByRevenue
} = require('../controllers/prospectController');
const { authenticate, requirePermission, logActivity } = require('../middleware/auth');
const { apiLimiter, handleValidationErrors } = require('../middleware/security');
const { validateProspectData } = require('../middleware/validation');

// All prospect routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /prospects:
 *   get:
 *     summary: Get all prospects
 *     description: Retrieve a list of all prospects with optional filtering
 *     tags:
 *       - Prospects
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by prospect name, company, email, or phone
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [New, Contacted, Qualified, Lost, Converted]
 *         description: Filter by prospect status
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [Website, Referral, Cold Call, Other]
 *         description: Filter by prospect source
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of prospects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Prospect'
 *       500:
 *         description: Server error
 */
router.get('/', apiLimiter, requirePermission('prospects:read'), logActivity('view_prospects', 'prospect'), getAllProspects);

/**
 * @swagger
 * /prospects/stats:
 *   get:
 *     summary: Get prospect statistics
 *     description: Retrieve aggregated prospect statistics
 *     tags:
 *       - Prospects
 *     responses:
 *       200:
 *         description: Prospect statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_prospects:
 *                   type: number
 *                 new_prospects:
 *                   type: integer
 *                 contacted_prospects:
 *                   type: integer
 *                 qualified_prospects:
 *                   type: integer
 *                 converted_prospects:
 *                   type: integer
 *                 lost_prospects:
 *                   type: integer
 *                 total_potential_revenue:
 *                   type: number
 *                 avg_potential_revenue:
 *                   type: number
 *       500:
 *         description: Server error
 */
router.get('/stats', apiLimiter, requirePermission('prospects:read'), logActivity('view_prospect_stats', 'prospect'), getProspectStats);

/**
 * @swagger
 * /prospects/overdue-followups:
 *   get:
 *     summary: Get overdue follow-ups
 *     description: Retrieve prospects with overdue follow-up dates
 *     tags:
 *       - Prospects
 *     responses:
 *       200:
 *         description: Overdue follow-ups retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Prospect'
 *       500:
 *         description: Server error
 */
router.get('/overdue-followups', apiLimiter, requirePermission('prospects:read'), logActivity('view_overdue_followups', 'prospect'), getOverdueFollowUps);

/**
 * @swagger
 * /prospects/by-revenue:
 *   get:
 *     summary: Get prospects by revenue range
 *     description: Retrieve prospects filtered by potential revenue range
 *     tags:
 *       - Prospects
 *     parameters:
 *       - in: query
 *         name: min
 *         schema:
 *           type: number
 *         description: Minimum potential revenue
 *       - in: query
 *         name: max
 *         schema:
 *           type: number
 *         description: Maximum potential revenue
 *     responses:
 *       200:
 *         description: Prospects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Prospect'
 *       500:
 *         description: Server error
 */
router.get('/by-revenue', apiLimiter, requirePermission('prospects:read'), logActivity('view_prospects_by_revenue', 'prospect'), getProspectsByRevenue);

/**
 * @swagger
 * /prospects/{id}:
 *   get:
 *     summary: Get prospect by ID
 *     description: Retrieve a specific prospect by their ID
 *     tags:
 *       - Prospects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Prospect ID
 *     responses:
 *       200:
 *         description: Prospect retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prospect'
 *       404:
 *         description: Prospect not found
 *       500:
 *         description: Server error
 */
router.get('/:id', apiLimiter, requirePermission('prospects:read'), logActivity('view_prospect', 'prospect'), getProspectById);

/**
 * @swagger
 * /prospects:
 *   post:
 *     summary: Create a new prospect
 *     description: Create a new prospect record
 *     tags:
 *       - Prospects
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prospect_name
 *             properties:
 *               prospect_name:
 *                 type: string
 *                 example: "John Smith"
 *               company_name:
 *                 type: string
 *                 example: "Tech Solutions Inc"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@techsolutions.com"
 *               phone_number:
 *                 type: string
 *                 example: "+8801712345678"
 *               address:
 *                 type: string
 *                 example: "123 Business Ave, Dhaka"
 *               potential_revenue:
 *                 type: number
 *                 example: 15000
 *               contact_person_name:
 *                 type: string
 *                 example: "Jane Doe"
 *               source:
 *                 type: string
 *                 enum: [Website, Referral, Cold Call, Other]
 *                 example: "Website"
 *               follow_up_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-02-15"
 *               notes:
 *                 type: string
 *                 example: "Interested in fiber connection"
 *               status:
 *                 type: string
 *                 enum: [New, Contacted, Qualified, Lost, Converted]
 *                 example: "New"
 *               connection_type:
 *                 type: string
 *                 example: "Fiber"
 *               area:
 *                 type: string
 *                 example: "Dhaka North"
 *     responses:
 *       201:
 *         description: Prospect created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prospect'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/', apiLimiter, requirePermission('prospects:write'), validateProspectData, logActivity('create_prospect', 'prospect'), createProspect);

/**
 * @swagger
 * /prospects/{id}:
 *   put:
 *     summary: Update prospect
 *     description: Update an existing prospect record
 *     tags:
 *       - Prospects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Prospect ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prospect_name:
 *                 type: string
 *               company_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               address:
 *                 type: string
 *               potential_revenue:
 *                 type: number
 *               contact_person_name:
 *                 type: string
 *               source:
 *                 type: string
 *               follow_up_date:
 *                 type: string
 *               notes:
 *                 type: string
 *               status:
 *                 type: string
 *               connection_type:
 *                 type: string
 *               area:
 *                 type: string
 *     responses:
 *       200:
 *         description: Prospect updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prospect'
 *       404:
 *         description: Prospect not found
 *       500:
 *         description: Server error
 */
router.put('/:id', apiLimiter, requirePermission('prospects:write'), validateProspectData, logActivity('update_prospect', 'prospect'), updateProspect);

/**
 * @swagger
 * /prospects/{id}/convert:
 *   post:
 *     summary: Convert prospect to customer
 *     description: Convert a prospect to a customer and create customer record
 *     tags:
 *       - Prospects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Prospect ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Optional additional customer data
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: "Converted from prospect"
 *     responses:
 *       200:
 *         description: Prospect converted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prospect:
 *                   $ref: '#/components/schemas/Prospect'
 *                 customer:
 *                   $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Prospect not found
 *       500:
 *         description: Server error
 */
router.post('/:id/convert', apiLimiter, requirePermission('prospects:write'), logActivity('convert_prospect', 'prospect'), convertToCustomer);

/**
 * @swagger
 * /prospects/{id}:
 *   delete:
 *     summary: Delete prospect
 *     description: Delete a prospect record
 *     tags:
 *       - Prospects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Prospect ID
 *     responses:
 *       200:
 *         description: Prospect deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Prospect deleted successfully"
 *       404:
 *         description: Prospect not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', apiLimiter, requirePermission('prospects:write'), logActivity('delete_prospect', 'prospect'), deleteProspect);

module.exports = router;
