/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users with optional filtering (admin only)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [super_admin, admin, user]
 *         description: Filter by role
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *       403:
 *         description: Insufficient permissions
 */

// User Management Routes
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize, logActivity } = require('../middleware/auth');
const { apiLimiter, validateRegister, validateUserUpdate, handleValidationErrors } = require('../middleware/security');

// All user routes require authentication
router.use(authenticate);

// Get all users (admin only)
router.get('/',
  authorize('super_admin', 'admin'),
  apiLimiter,
  logActivity('view_users', 'user'),
  userController.getUsers
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create new user
 *     description: Create a new user account (admin only)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: User already exists
 */

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user
 *     description: Update an existing user account
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [super_admin, admin, user]
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Delete a user account (admin only)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Insufficient permissions
 */

/**
 * @swagger
 * /users/roles/all:
 *   get:
 *     summary: Get all roles
 *     description: Retrieve all available user roles (admin only)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 */

/**
 * @swagger
 * /users/{id}/permissions:
 *   get:
 *     summary: Get user permissions
 *     description: Retrieve permissions for a specific user
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 */

// Get user by ID
router.get('/:id',
  apiLimiter,
  logActivity('view_user', 'user'),
  userController.getUserById
);

// Create user (admin only)
router.post('/',
  authorize('super_admin', 'admin'),
  apiLimiter,
  validateRegister,
  handleValidationErrors,
  logActivity('create_user', 'user'),
  userController.createUser
);

// Update user
router.put('/:id',
  apiLimiter,
  validateUserUpdate,
  handleValidationErrors,
  logActivity('update_user', 'user'),
  userController.updateUser
);

// Delete user (admin only)
router.delete('/:id',
  authorize('super_admin', 'admin'),
  apiLimiter,
  logActivity('delete_user', 'user'),
  userController.deleteUser
);

// Get all roles (admin only)
router.get('/roles/all',
  authorize('super_admin', 'admin'),
  userController.getRoles
);

// Get user permissions
router.get('/:id/permissions',
  apiLimiter,
  userController.getUserPermissions
);

module.exports = router;