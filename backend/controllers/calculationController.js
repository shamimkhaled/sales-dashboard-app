// Calculation Controller for revenue verification and calculations
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');

// Get revenue calculations (monthly, weekly, yearly)
const getRevenueCalculations = async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      customer_id: req.query.customer_id ? parseInt(req.query.customer_id) : null
    };

    // Role-based filtering
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      // Sales people can only see calculations for customers they created
      const customers = await Customer.getAll({ created_by: req.user.id });
      const customerIds = customers.map(c => c.id);
      if (filters.customer_id && !customerIds.includes(filters.customer_id)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view calculations for this customer'
        });
      }
      // If no specific customer, limit to user's customers
      if (!filters.customer_id) {
        filters.customer_ids = customerIds;
      }
    }

    const calculations = await Bill.getRevenueCalculations(filters);

    res.json({
      success: true,
      data: calculations,
      message: 'Revenue calculations retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching revenue calculations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue calculations'
    });
  }
};

// Verify calculations for bills
const verifyCalculations = async (req, res) => {
  try {
    const { billId } = req.params;
    let billIds = [];

    if (billId) {
      // Verify specific bill
      billIds = [parseInt(billId)];
    } else {
      // Verify all bills or filter by user permissions
      const allBills = await Bill.getAll({});
      if (!['super_admin', 'admin'].includes(req.user.role)) {
        // Filter bills by user's customers
        const customers = await Customer.getAll({ created_by: req.user.id });
        const customerIds = customers.map(c => c.id);
        billIds = allBills.filter(bill => customerIds.includes(bill.customer_id)).map(bill => bill.id);
      } else {
        billIds = allBills.map(bill => bill.id);
      }
    }

    const verificationResults = [];
    for (const id of billIds) {
      const result = await Bill.verifyCalculations(id);
      verificationResults.push(...result);
    }

    // Log verification activity
    await AuditLog.logChange(req.user.id, 'verify', 'bills', billId || 'all', null, { verification_performed: true });

    res.json({
      success: true,
      data: verificationResults,
      summary: {
        total_bills: verificationResults.length,
        valid_calculations: verificationResults.filter(r => r.total_calculation_status === 'Valid').length,
        invalid_calculations: verificationResults.filter(r => r.total_calculation_status === 'Invalid').length,
        valid_balances: verificationResults.filter(r => r.balance_calculation_status === 'Valid').length,
        invalid_balances: verificationResults.filter(r => r.balance_calculation_status === 'Invalid').length
      },
      message: 'Calculation verification completed'
    });
  } catch (error) {
    console.error('Error verifying calculations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify calculations'
    });
  }
};

// Get calculation summary
const getCalculationSummary = async (req, res) => {
  try {
    const summary = await Bill.getCalculationSummary();

    res.json({
      success: true,
      data: summary,
      message: 'Calculation summary retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching calculation summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calculation summary'
    });
  }
};

// Get monthly revenue breakdown
const getMonthlyRevenue = async (req, res) => {
  try {
    const { year, month } = req.query;
    let filters = {};

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      filters.start_date = startDate;
      filters.end_date = endDate;
    }

    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
      filters.start_date = startDate;
      filters.end_date = endDate;
    }

    const revenueData = await Bill.getRevenueCalculations(filters);

    // Group by month for better visualization
    const monthlyData = revenueData.reduce((acc, item) => {
      const key = item.month;
      if (!acc[key]) {
        acc[key] = {
          month: item.month,
          total_revenue: 0,
          total_received: 0,
          total_due: 0,
          bill_count: 0
        };
      }
      acc[key].total_revenue += parseFloat(item.monthly_revenue || 0);
      acc[key].total_received += parseFloat(item.monthly_received || 0);
      acc[key].total_due += parseFloat(item.monthly_due || 0);
      acc[key].bill_count += parseInt(item.bill_count || 0);
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(monthlyData),
      message: 'Monthly revenue data retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly revenue data'
    });
  }
};

// Get weekly revenue breakdown
const getWeeklyRevenue = async (req, res) => {
  try {
    const { year } = req.query;
    let filters = {};

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      filters.start_date = startDate;
      filters.end_date = endDate;
    }

    const revenueData = await Bill.getRevenueCalculations(filters);

    // Group by week for better visualization
    const weeklyData = revenueData.reduce((acc, item) => {
      const key = item.week;
      if (!acc[key]) {
        acc[key] = {
          week: item.week,
          total_revenue: 0,
          total_received: 0,
          total_due: 0,
          bill_count: 0
        };
      }
      acc[key].total_revenue += parseFloat(item.monthly_revenue || 0);
      acc[key].total_received += parseFloat(item.monthly_received || 0);
      acc[key].total_due += parseFloat(item.monthly_due || 0);
      acc[key].bill_count += parseInt(item.bill_count || 0);
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(weeklyData),
      message: 'Weekly revenue data retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching weekly revenue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly revenue data'
    });
  }
};

// Get yearly revenue breakdown
const getYearlyRevenue = async (req, res) => {
  try {
    const revenueData = await Bill.getRevenueCalculations({});

    // Group by year for better visualization
    const yearlyData = revenueData.reduce((acc, item) => {
      const key = item.year;
      if (!acc[key]) {
        acc[key] = {
          year: item.year,
          total_revenue: 0,
          total_received: 0,
          total_due: 0,
          bill_count: 0
        };
      }
      acc[key].total_revenue += parseFloat(item.monthly_revenue || 0);
      acc[key].total_received += parseFloat(item.monthly_received || 0);
      acc[key].total_due += parseFloat(item.monthly_due || 0);
      acc[key].bill_count += parseInt(item.bill_count || 0);
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(yearlyData),
      message: 'Yearly revenue data retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching yearly revenue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch yearly revenue data'
    });
  }
};

// Get revenue by customer
const getRevenueByCustomer = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let filters = {};

    if (start_date && end_date) {
      filters.start_date = start_date;
      filters.end_date = end_date;
    }

    // Get all bills with customer info
    const bills = await Bill.getAll({});

    // Calculate revenue by customer
    const customerRevenue = {};

    for (const bill of bills) {
      if (!customerRevenue[bill.customer_id]) {
        // Get customer details
        const customer = await Customer.getById(bill.customer_id);
        if (customer) {
          customerRevenue[bill.customer_id] = {
            customer_id: bill.customer_id,
            customer_name: customer.name_of_party,
            total_revenue: 0,
            total_received: 0,
            total_due: 0,
            bill_count: 0
          };
        }
      }

      if (customerRevenue[bill.customer_id]) {
        customerRevenue[bill.customer_id].total_revenue += parseFloat(bill.total_bill || 0);
        customerRevenue[bill.customer_id].total_received += parseFloat(bill.total_received || 0);
        customerRevenue[bill.customer_id].total_due += parseFloat(bill.total_due || 0);
        customerRevenue[bill.customer_id].bill_count += 1;
      }
    }

    // Filter by user permissions if not admin
    let filteredRevenue = Object.values(customerRevenue);
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      const customers = await Customer.getAll({ created_by: req.user.id });
      const customerIds = customers.map(c => c.id);
      filteredRevenue = filteredRevenue.filter(r => customerIds.includes(r.customer_id));
    }

    // Sort by total revenue descending
    filteredRevenue.sort((a, b) => b.total_revenue - a.total_revenue);

    res.json({
      success: true,
      data: filteredRevenue,
      message: 'Revenue by customer retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching revenue by customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue by customer'
    });
  }
};

module.exports = {
  getRevenueCalculations,
  verifyCalculations,
  getCalculationSummary,
  getMonthlyRevenue,
  getWeeklyRevenue,
  getYearlyRevenue,
  getRevenueByCustomer
};
