// controllers/billController.js - Bill Controller
const Bill = require('../models/Bill');

// Get all bills
const getAllBills = async (req, res) => {
  try {
    const filters = {
      customer_id: req.query.customer_id ? parseInt(req.query.customer_id) : null,
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : null
    };

    const bills = await Bill.getAll(filters);
    res.json({
      success: true,
      data: bills,
      count: bills.length
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bills'
    });
  }
};

// Get bill by ID
const getBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.getById(id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found'
      });
    }

    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bill'
    });
  }
};

// Create new bill
const createBill = async (req, res) => {
  try {
    const billData = req.body;
    const bill = await Bill.create(billData);

    res.status(201).json({
      success: true,
      data: bill,
      message: 'Bill created successfully'
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bill'
    });
  }
};

// Update bill
const updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const billData = req.body;

    const existingBill = await Bill.getById(id);
    if (!existingBill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found'
      });
    }

    const updatedBill = await Bill.update(id, billData);

    res.json({
      success: true,
      data: updatedBill,
      message: 'Bill updated successfully'
    });
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bill'
    });
  }
};

// Delete bill
const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBill = await Bill.getById(id);
    if (!existingBill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found'
      });
    }

    await Bill.delete(id);

    res.json({
      success: true,
      message: 'Bill deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete bill'
    });
  }
};

// Get bill statistics
const getBillStats = async (req, res) => {
  try {
    const stats = await Bill.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching bill stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bill statistics'
    });
  }
};

// Get bills by customer
const getBillsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const bills = await Bill.getByCustomer(customerId);

    res.json({
      success: true,
      data: bills,
      count: bills.length
    });
  } catch (error) {
    console.error('Error fetching bills by customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bills for customer'
    });
  }
};

module.exports = {
  getAllBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
  getBillStats,
  getBillsByCustomer
};