// Prospect Controller
const Prospect = require('../models/Prospect');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const { validationResult } = require('express-validator');

// Get all prospects with pagination and filtering
const getAllProspects = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status,
      source: req.query.source,
      created_by: req.query.created_by || req.user.id, // Default to current user if not admin
      follow_up_date_from: req.query.follow_up_date_from,
      follow_up_date_to: req.query.follow_up_date_to,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 10
    };

    // Role-based filtering
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      filters.created_by = req.user.id; // Sales people can only see their own prospects
    }

    const prospects = await Prospect.getAll(filters);
    const totalCount = await Prospect.getCount(filters);

    res.json({
      success: true,
      data: prospects,
      pagination: {
        currentPage: filters.page,
        pageSize: filters.pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / filters.pageSize),
        hasNextPage: filters.page < Math.ceil(totalCount / filters.pageSize),
        hasPrevPage: filters.page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching prospects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prospects'
    });
  }
};

// Get prospect by ID
const getProspectById = async (req, res) => {
  try {
    const { id } = req.params;
    const prospect = await Prospect.getById(id);

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found'
      });
    }

    // Check permissions
    if (!['super_admin', 'admin'].includes(req.user.role) && prospect.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    res.json({
      success: true,
      data: prospect
    });
  } catch (error) {
    console.error('Error fetching prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prospect'
    });
  }
};

// Create new prospect
const createProspect = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const prospectData = req.body;

    // Auto-calculate potential revenue if not provided
    if (!prospectData.potential_revenue && prospectData.connection_type) {
      // Simple auto-calculation based on connection type
      const revenueMap = {
        'Fiber': 15000,
        'Wireless': 8000,
        'Cable': 12000,
        'Satellite': 10000
      };
      prospectData.potential_revenue = revenueMap[prospectData.connection_type] || 10000;
    }

    const prospect = await Prospect.create(prospectData, req.user.id);

    // Log the creation
    await AuditLog.logChange(req.user.id, 'create', 'prospects', prospect.id, null, prospectData);

    res.status(201).json({
      success: true,
      data: prospect,
      message: 'Prospect created successfully'
    });
  } catch (error) {
    console.error('Error creating prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create prospect'
    });
  }
};

// Update prospect
const updateProspect = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Get existing prospect for audit trail
    const existingProspect = await Prospect.getById(id);
    if (!existingProspect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found'
      });
    }

    // Check permissions
    if (!['super_admin', 'admin'].includes(req.user.role) && existingProspect.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const updatedProspect = await Prospect.update(id, updateData);

    // Log the update
    await AuditLog.logChange(req.user.id, 'update', 'prospects', id, existingProspect, updateData);

    res.json({
      success: true,
      data: updatedProspect,
      message: 'Prospect updated successfully'
    });
  } catch (error) {
    console.error('Error updating prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prospect'
    });
  }
};

// Delete prospect
const deleteProspect = async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing prospect for audit trail
    const existingProspect = await Prospect.getById(id);
    if (!existingProspect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found'
      });
    }

    // Check permissions
    if (!['super_admin', 'admin'].includes(req.user.role) && existingProspect.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    await Prospect.delete(id);

    // Log the deletion
    await AuditLog.logChange(req.user.id, 'delete', 'prospects', id, existingProspect, null);

    res.json({
      success: true,
      message: 'Prospect deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete prospect'
    });
  }
};

// Convert prospect to customer
const convertToCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing prospect
    const existingProspect = await Prospect.getById(id);
    if (!existingProspect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found'
      });
    }

    // Check permissions
    if (!['super_admin', 'admin', 'sales_person'].includes(req.user.role) && existingProspect.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const result = await Prospect.convertToCustomer(id, req.body, req.user.id);

    // Log the conversion
    await AuditLog.logChange(req.user.id, 'convert', 'prospects', id, existingProspect, { converted_to_customer: result.customer.id });

    res.json({
      success: true,
      data: result,
      message: 'Prospect converted to customer successfully'
    });
  } catch (error) {
    console.error('Error converting prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert prospect'
    });
  }
};

// Get prospect statistics
const getProspectStats = async (req, res) => {
  try {
    const stats = await Prospect.getStats();

    // Add additional stats for current user if not admin
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      const userProspects = await Prospect.getByCreator(req.user.id);
      stats.my_prospects = userProspects.length;
      stats.my_converted = userProspects.filter(p => p.status === 'Converted').length;
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching prospect stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prospect statistics'
    });
  }
};

// Get overdue follow-ups
const getOverdueFollowUps = async (req, res) => {
  try {
    let followUps = await Prospect.getOverdueFollowUps();

    // Filter by user permissions
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      followUps = followUps.filter(p => p.created_by === req.user.id);
    }

    res.json({
      success: true,
      data: followUps,
      count: followUps.length
    });
  } catch (error) {
    console.error('Error fetching overdue follow-ups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue follow-ups'
    });
  }
};

// Get prospects by potential revenue range
const getProspectsByRevenue = async (req, res) => {
  try {
    const { min, max } = req.query;
    const prospects = await Prospect.getByRevenueRange(
      min ? parseFloat(min) : 0,
      max ? parseFloat(max) : null
    );

    // Filter by user permissions
    let filteredProspects = prospects;
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      filteredProspects = prospects.filter(p => p.created_by === req.user.id);
    }

    res.json({
      success: true,
      data: filteredProspects,
      count: filteredProspects.length
    });
  } catch (error) {
    console.error('Error fetching prospects by revenue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prospects by revenue'
    });
  }
};

module.exports = {
  getAllProspects,
  getProspectById,
  createProspect,
  updateProspect,
  deleteProspect,
  convertToCustomer,
  getProspectStats,
  getOverdueFollowUps,
  getProspectsByRevenue
};
