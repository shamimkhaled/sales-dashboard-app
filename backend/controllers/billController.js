
const Bill = require('../models/Bill');
const { requirePermission } = require('../middleware/auth');

// Get all bills with pagination support
const getAllBills = async (req, res) => {
  try {
    const filters = {
      customer_id: req.query.customer_id ? parseInt(req.query.customer_id) : null,
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      page: req.query.page ? parseInt(req.query.page) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize) : 10
    };

    const bills = await Bill.getAll(filters);
    const totalCount = await Bill.getCount({
      customer_id: filters.customer_id,
      status: filters.status,
      start_date: filters.start_date,
      end_date: filters.end_date
    });

    const totalPages = Math.ceil(totalCount / filters.pageSize);

    res.json({
      success: true,
      data: bills,
      pagination: {
        currentPage: filters.page,
        pageSize: filters.pageSize,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: filters.page < totalPages,
        hasPrevPage: filters.page > 1
      }
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



// Partial update bill (PATCH)
const patchBill = async (req, res) => {
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

    // Merge existing data with new data (only update provided fields)
    const mergedData = { ...existingBill, ...billData };
    const updatedBill = await Bill.update(id, mergedData);

    res.json({
      success: true,
      data: updatedBill,
      message: 'Bill partially updated successfully'
    });
  } catch (error) {
    console.error('Error patching bill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to patch bill'
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
  getBillsByCustomer,
  patchBill
};