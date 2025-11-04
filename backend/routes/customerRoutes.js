// Customer Routes
const express = require('express');
const router = express.Router();
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  patchCustomer,
  deleteCustomer
} = require('../controllers/customerController');
const { authenticate, requirePermission, logActivity } = require('../middleware/auth');
const { apiLimiter, validateCustomer, handleValidationErrors } = require('../middleware/security');

// All customer routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Get all customers
 *     description: Retrieve a list of all customers with optional filtering
 *     tags:
 *       - Customers
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
 *         description: List of customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Customer'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', apiLimiter, requirePermission('customers:read'), logActivity('view_customers', 'customer'), getAllCustomers);

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     description: Retrieve a specific customer by their ID
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.get('/:id', apiLimiter, requirePermission('customers:read'), logActivity('view_customer', 'customer'), getCustomerById);

/**
 * @swagger
 * /customers:
 *   post:
 *     summary: Create a new customer
 *     description: Create a new customer record. Note - serial_number is auto-generated
 *     tags:
 *       - Customers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name_of_party
 *             properties:
 *               name_of_party:
 *                 type: string
 *                 example: "ABC Corporation"
 *               address:
 *                 type: string
 *                 example: "123 Business St"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "contact@abc.com"
 *               proprietor_name:
 *                 type: string
 *                 example: "John Doe"
 *               phone_number:
 *                 type: string
 *                 example: "+8801712345678"
 *               link_id:
 *                 type: string
 *                 example: "LINK001"
 *               remarks:
 *                 type: string
 *                 example: "Premium client"
 *               kam:
 *                 type: string
 *                 example: "Account Manager Name"
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Suspended]
 *                 example: "Active"
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.post('/', apiLimiter, requirePermission('customers:write'), validateCustomer, handleValidationErrors, logActivity('create_customer', 'customer'), createCustomer);

/**
 * @swagger
 * /customers/{id}:
 *   put:
 *     summary: Update customer
 *     description: Update an existing customer record
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name_of_party:
 *                 type: string
 *               address:
 *                 type: string
 *               email:
 *                 type: string
 *               proprietor_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               link_id:
 *                 type: string
 *               remarks:
 *                 type: string
 *               kam:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Suspended]
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
router.put('/:id', apiLimiter, requirePermission('customers:write'), validateCustomer, handleValidationErrors, logActivity('update_customer', 'customer'), updateCustomer);

/**
 * @swagger
 * /customers/{id}:
 *   patch:
 *     summary: Partially update customer
 *     description: Partially update specific fields of a customer record (PATCH)
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Only provide fields you want to update
 *             properties:
 *               name_of_party:
 *                 type: string
 *                 example: "Updated Company Name"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "newemail@company.com"
 *               phone_number:
 *                 type: string
 *                 example: "+8801987654321"
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Suspended]
 *                 example: "Inactive"
 *               remarks:
 *                 type: string
 *                 example: "Updated remarks"
 *     responses:
 *       200:
 *         description: Customer partially updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', apiLimiter, requirePermission('customers:write'), logActivity('patch_customer', 'customer'), patchCustomer);

router.put('/:id', apiLimiter, requirePermission('customers:write'), validateCustomer, handleValidationErrors, logActivity('update_customer', 'customer'), updateCustomer);

/**
 * @swagger
 * /customers/{id}:
 *   delete:
 *     summary: Delete customer
 *     description: Delete a customer record
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Customer deleted successfully"
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', apiLimiter, requirePermission('customers:write'), logActivity('delete_customer', 'customer'), deleteCustomer);

module.exports = router;