// Bill Routes
const express = require('express');
const router = express.Router();
const {
  getAllBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
  getBillStats,
  getBillsByCustomer,
  patchBill
} = require('../controllers/billController');

/**
 * @swagger
 * /bills:
 *   get:
 *     summary: Get all bills
 *     description: Retrieve a list of all bills with optional filtering
 *     tags:
 *       - Bills
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
 *         description: List of bills retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bill'
 *       500:
 *         description: Server error
 */
router.get('/', getAllBills);

/**
 * @swagger
 * /bills/stats:
 *   get:
 *     summary: Get bill statistics
 *     description: Retrieve aggregated bill statistics and metrics
 *     tags:
 *       - Bills
 *     responses:
 *       200:
 *         description: Bill statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalBills:
 *                   type: number
 *                 totalReceived:
 *                   type: number
 *                 totalDue:
 *                   type: number
 *                 averageBill:
 *                   type: number
 *                 activeBills:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.get('/stats', getBillStats);

/**
 * @swagger
 * /bills/customer/{customerId}:
 *   get:
 *     summary: Get bills by customer
 *     description: Retrieve all bills for a specific customer
 *     tags:
 *       - Bills
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer bills retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bill'
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
router.get('/customer/:customerId', getBillsByCustomer);

/**
 * @swagger
 * /bills/{id}:
 *   get:
 *     summary: Get bill by ID
 *     description: Retrieve a specific bill by its ID
 *     tags:
 *       - Bills
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bill ID
 *     responses:
 *       200:
 *         description: Bill retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bill'
 *       404:
 *         description: Bill not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getBillById);

/**
 * @swagger
 * /bills:
 *   post:
 *     summary: Create a new bill
 *     description: Create a new bill record for a customer
 *     tags:
 *       - Bills
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 1
 *               nttn_cap:
 *                 type: string
 *                 example: "CAP001"
 *               nttn_com:
 *                 type: string
 *                 example: "COM001"
 *               active_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               billing_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               termination_date:
 *                 type: string
 *                 format: date
 *               iig_qt:
 *                 type: number
 *                 example: 10
 *               iig_qt_price:
 *                 type: number
 *                 example: 5000
 *               fna:
 *                 type: number
 *                 example: 5
 *               fna_price:
 *                 type: number
 *                 example: 3000
 *               ggc:
 *                 type: number
 *                 example: 8
 *               ggc_price:
 *                 type: number
 *                 example: 2000
 *               cdn:
 *                 type: number
 *                 example: 3
 *               cdn_price:
 *                 type: number
 *                 example: 1500
 *               bdix:
 *                 type: number
 *                 example: 2
 *               bdix_price:
 *                 type: number
 *                 example: 1000
 *               baishan:
 *                 type: number
 *                 example: 1
 *               baishan_price:
 *                 type: number
 *                 example: 800
 *               total_bill:
 *                 type: number
 *                 example: 13300
 *               total_received:
 *                 type: number
 *                 example: 10000
 *               total_due:
 *                 type: number
 *                 example: 3300
 *               discount:
 *                 type: number
 *                 example: 0
 *               remarks:
 *                 type: string
 *                 example: "Standard billing"
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Terminated]
 *                 example: "Active"
 *     responses:
 *       201:
 *         description: Bill created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bill'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/', createBill);

/**
 * @swagger
 * /bills/{id}:
 *   put:
 *     summary: Update bill
 *     description: Update an existing bill record
 *     tags:
 *       - Bills
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bill ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nttn_cap:
 *                 type: string
 *               nttn_com:
 *                 type: string
 *               active_date:
 *                 type: string
 *                 format: date
 *               billing_date:
 *                 type: string
 *                 format: date
 *               termination_date:
 *                 type: string
 *                 format: date
 *               iig_qt:
 *                 type: number
 *               iig_qt_price:
 *                 type: number
 *               fna:
 *                 type: number
 *               fna_price:
 *                 type: number
 *               ggc:
 *                 type: number
 *               ggc_price:
 *                 type: number
 *               cdn:
 *                 type: number
 *               cdn_price:
 *                 type: number
 *               bdix:
 *                 type: number
 *               bdix_price:
 *                 type: number
 *               baishan:
 *                 type: number
 *               baishan_price:
 *                 type: number
 *               total_bill:
 *                 type: number
 *               total_received:
 *                 type: number
 *               total_due:
 *                 type: number
 *               discount:
 *                 type: number
 *               remarks:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Terminated]
 *     responses:
 *       200:
 *         description: Bill updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bill'
 *       404:
 *         description: Bill not found
 *       500:
 *         description: Server error
 */
router.put('/:id', updateBill);

/**
 * @swagger
 * /bills/{id}:
 *   patch:
 *     summary: Partially update bill
 *     description: Partially update specific fields of a bill record (PATCH)
 *     tags:
 *       - Bills
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bill ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Only provide fields you want to update
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Terminated]
 *                 example: "Inactive"
 *               total_received:
 *                 type: number
 *                 example: 12000
 *               discount:
 *                 type: number
 *                 example: 500
 *               remarks:
 *                 type: string
 *                 example: "Updated remarks"
 *     responses:
 *       200:
 *         description: Bill partially updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bill'
 *       404:
 *         description: Bill not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', patchBill);

/**
 * @swagger
 * /bills/{id}:
 *   delete:
 *     summary: Delete bill
 *     description: Delete a bill record
 *     tags:
 *       - Bills
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bill ID
 *     responses:
 *       200:
 *         description: Bill deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bill deleted successfully"
 *       404:
 *         description: Bill not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', deleteBill);

module.exports = router;
