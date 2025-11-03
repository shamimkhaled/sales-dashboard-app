// controllers/customerController.js - Customer Controller
const Customer = require('../models/Customer');

// Get all customers
const getAllCustomers = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : null
    };

    const customers = await Customer.getAll(filters);
    res.json({
      success: true,
      data: customers,
      count: customers.length
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
  deleteCustomer
};