// controllers/dashboardController.js - Dashboard Controller
const db = require('../config/database');

// Get dashboard overview
const getOverview = async (req, res) => {
  try {
    // Get total customers
    const customerCount = await db.getAsync('SELECT COUNT(*) as count FROM customers WHERE status = "Active"');

    // Get total bills and amounts
    const billStats = await db.getAsync(`
      SELECT
        COUNT(*) as total_bills,
        SUM(total_bill) as total_billed,
        SUM(total_received) as total_received,
        SUM(total_due) as total_due
      FROM bill_records
      WHERE status = 'Active'
    `);

    // Get monthly revenue for current year
    const monthlyRevenue = await db.allAsync(`
      SELECT
        strftime('%Y-%m', billing_date) as month,
        SUM(total_bill) as revenue
      FROM bill_records
      WHERE status = 'Active' AND billing_date >= date('now', 'start of year')
      GROUP BY strftime('%Y-%m', billing_date)
      ORDER BY month
    `);

    // Get collection rate
    const collectionRate = billStats.total_billed > 0
      ? ((billStats.total_received / billStats.total_billed) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        totalCustomers: customerCount.count,
        totalBills: billStats.total_bills,
        totalBilled: billStats.total_billed || 0,
        totalReceived: billStats.total_received || 0,
        totalDue: billStats.total_due || 0,
        collectionRate: parseFloat(collectionRate),
        monthlyRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard overview'
    });
  }
};

// Get top customers by revenue
const getTopCustomers = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const topCustomers = await db.allAsync(`
      SELECT
        c.name_of_party,
        c.serial_number,
        COUNT(br.id) as bill_count,
        SUM(br.total_bill) as total_revenue,
        SUM(br.total_received) as total_received,
        SUM(br.total_due) as total_due
      FROM customers c
      LEFT JOIN bill_records br ON c.id = br.customer_id AND br.status = 'Active'
      WHERE c.status = 'Active'
      GROUP BY c.id, c.name_of_party, c.serial_number
      HAVING total_revenue > 0
      ORDER BY total_revenue DESC
      LIMIT ?
    `, [limit]);

    res.json({
      success: true,
      data: topCustomers
    });
  } catch (error) {
    console.error('Error fetching top customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top customers'
    });
  }
};

// Get revenue by service
const getRevenueByService = async (req, res) => {
  try {
    const revenueByService = await db.allAsync(`
      SELECT
        'IIG/QT' as service,
        SUM(iig_qt_price) as revenue
      FROM bill_records
      WHERE status = 'Active'
      UNION ALL
      SELECT
        'FNA' as service,
        SUM(fna_price) as revenue
      FROM bill_records
      WHERE status = 'Active'
      UNION ALL
      SELECT
        'GGC' as service,
        SUM(ggc_price) as revenue
      FROM bill_records
      WHERE status = 'Active'
      UNION ALL
      SELECT
        'CDN' as service,
        SUM(cdn_price) as revenue
      FROM bill_records
      WHERE status = 'Active'
      UNION ALL
      SELECT
        'BDIX' as service,
        SUM(bdix_price) as revenue
      FROM bill_records
      WHERE status = 'Active'
      UNION ALL
      SELECT
        'Baishan' as service,
        SUM(baishan_price) as revenue
      FROM bill_records
      WHERE status = 'Active'
    `);

    res.json({
      success: true,
      data: revenueByService.filter(item => item.revenue > 0)
    });
  } catch (error) {
    console.error('Error fetching revenue by service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue by service'
    });
  }
};

// Get collection status
const getCollectionStatus = async (req, res) => {
  try {
    const collectionStatus = await db.allAsync(`
      SELECT
        CASE
          WHEN total_due = 0 THEN 'Paid'
          WHEN total_due > 0 AND total_received > 0 THEN 'Partial'
          ELSE 'Unpaid'
        END as status,
        COUNT(*) as count,
        SUM(total_bill) as total_amount
      FROM bill_records
      WHERE status = 'Active'
      GROUP BY
        CASE
          WHEN total_due = 0 THEN 'Paid'
          WHEN total_due > 0 AND total_received > 0 THEN 'Partial'
          ELSE 'Unpaid'
        END
    `);

    res.json({
      success: true,
      data: collectionStatus
    });
  } catch (error) {
    console.error('Error fetching collection status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collection status'
    });
  }
};

// Get customer status distribution
const getCustomerStatus = async (req, res) => {
  try {
    const customerStatus = await db.allAsync(`
      SELECT
        status,
        COUNT(*) as count
      FROM customers
      GROUP BY status
    `);

    res.json({
      success: true,
      data: customerStatus
    });
  } catch (error) {
    console.error('Error fetching customer status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer status'
    });
  }
};

// Get KAM performance analytics
const getKAMPerformance = async (req, res) => {
  try {
    const kamPerformance = await db.allAsync(`
      SELECT
        c.kam,
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT CASE WHEN c.status = 'Active' THEN c.id END) as active_customers,
        SUM(br.total_bill) as total_revenue,
        ROUND(AVG(br.total_bill), 2) as avg_revenue_per_customer,
        SUM(br.total_received) as total_received,
        SUM(br.total_due) as total_due
      FROM customers c
      LEFT JOIN bill_records br ON c.id = br.customer_id AND br.status = 'Active'
      WHERE c.kam IS NOT NULL AND c.kam != ''
      GROUP BY c.kam
      ORDER BY total_revenue DESC
    `);

    res.json({
      success: true,
      data: kamPerformance
    });
  } catch (error) {
    console.error('Error fetching KAM performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KAM performance'
    });
  }
};

// Get weekly revenue analytics
const getWeeklyRevenue = async (req, res) => {
  try {
    const weeklyRevenue = await db.allAsync(`
      SELECT
        strftime('%Y-W%W', billing_date) as week,
        strftime('%Y-%m-%d', billing_date) as date,
        SUM(total_bill) as revenue,
        SUM(total_received) as received,
        SUM(total_due) as due
      FROM bill_records
      WHERE status = 'Active' AND billing_date >= date('now', '-12 weeks')
      GROUP BY strftime('%Y-W%W', billing_date)
      ORDER BY week DESC
    `);

    res.json({
      success: true,
      data: weeklyRevenue || []
    });
  } catch (error) {
    console.error('Error fetching weekly revenue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly revenue'
    });
  }
};

// Get monthly revenue analytics
const getMonthlyRevenue = async (req, res) => {
  try {
    const monthlyRevenue = await db.allAsync(`
      SELECT
        strftime('%Y-%m', billing_date) as month,
        SUM(total_bill) as revenue,
        SUM(total_received) as received,
        SUM(total_due) as due,
        COUNT(*) as bill_count
      FROM bill_records
      WHERE status = 'Active'
      GROUP BY strftime('%Y-%m', billing_date)
      ORDER BY month DESC
    `);

    res.json({
      success: true,
      data: monthlyRevenue || []
    });
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly revenue'
    });
  }
};

// Get yearly revenue analytics
const getYearlyRevenue = async (req, res) => {
  try {
    const yearlyRevenue = await db.allAsync(`
      SELECT
        strftime('%Y', billing_date) as year,
        SUM(total_bill) as revenue,
        SUM(total_received) as received,
        SUM(total_due) as due,
        COUNT(*) as bill_count
      FROM bill_records
      WHERE status = 'Active'
      GROUP BY strftime('%Y', billing_date)
      ORDER BY year DESC
    `);

    res.json({
      success: true,
      data: yearlyRevenue || []
    });
  } catch (error) {
    console.error('Error fetching yearly revenue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch yearly revenue'
    });
  }
};

// Get customer-wise revenue analytics
const getCustomerWiseRevenue = async (req, res) => {
  try {
    const customerWiseRevenue = await db.allAsync(`
      SELECT
        c.id,
        c.name_of_party,
        c.serial_number,
        c.kam,
        c.status,
        COUNT(br.id) as bill_count,
        SUM(br.total_bill) as revenue,
        SUM(br.total_received) as received,
        SUM(br.total_due) as due,
        CASE
          WHEN SUM(br.total_bill) > 0 THEN ROUND((SUM(br.total_received) / SUM(br.total_bill)) * 100, 2)
          ELSE 0
        END as collectionRate
      FROM customers c
      LEFT JOIN bill_records br ON c.id = br.customer_id AND br.status = 'Active'
      WHERE c.status = 'Active'
      GROUP BY c.id, c.name_of_party, c.serial_number, c.kam, c.status
      ORDER BY revenue DESC
    `);

    res.json({
      success: true,
      data: customerWiseRevenue || []
    });
  } catch (error) {
    console.error('Error fetching customer-wise revenue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer-wise revenue'
    });
  }
};

module.exports = {
  getOverview,
  getTopCustomers,
  getRevenueByService,
  getCollectionStatus,
  getCustomerStatus,
  getKAMPerformance,
  getWeeklyRevenue,
  getMonthlyRevenue,
  getYearlyRevenue,
  getCustomerWiseRevenue
};