// Customer Controller
const Customer = require('../models/Customer');

// Get all customers with pagination support
const getAllCustomers = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status,
      page: req.query.page ? parseInt(req.query.page) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize) : 10
    };

    const customers = await Customer.getAll(filters);
    const totalCount = await Customer.getCount({
      search: filters.search,
      status: filters.status
    });

    const totalPages = Math.ceil(totalCount / filters.pageSize);

    res.json({
      success: true,
      data: customers,
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
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customers'
    });
  }
};



// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.getById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer'
    });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    const customer = await Customer.create(customerData);

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create customer'
    });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customerData = req.body;

    const existingCustomer = await Customer.getById(id);
    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const updatedCustomer = await Customer.update(id, customerData);

    res.json({
      success: true,
      data: updatedCustomer,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update customer'
    });
  }
};

// Patch customer (partial update)
const patchCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingCustomer = await Customer.getById(id);
    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Merge existing data with new data (only update provided fields)
    const mergedData = {
      ...existingCustomer,
      ...updateData
    };

    const updatedCustomer = await Customer.update(id, mergedData);

    res.json({
      success: true,
      data: updatedCustomer,
      message: 'Customer partially updated successfully'
    });
  } catch (error) {
    console.error('Error patching customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to patch customer'
    });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCustomer = await Customer.getById(id);
    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    await Customer.delete(id);

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete customer'
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  patchCustomer,
  deleteCustomer
};