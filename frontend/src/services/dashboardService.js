import axios from 'axios';

const API_BASE_URL = '/api';

const dashboardService = {
  /**
   * Get dashboard KPIs
   * @returns {Promise<Object>} KPI data
   */
  getKPIs: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/kpis/`);
      return response.data || {};
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      throw error;
    }
  },

  /**
   * Get weekly revenue analytics
   * @returns {Promise<Array>} Weekly revenue data
   */
  getWeeklyRevenue: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/weekly-revenue/`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching weekly revenue:', error);
      throw error;
    }
  },

  /**
   * Get monthly revenue analytics
   * @returns {Promise<Array>} Monthly revenue data
   */
  getMonthlyRevenue: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/monthly-revenue/`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
      throw error;
    }
  },

  /**
   * Get yearly revenue analytics
   * @returns {Promise<Array>} Yearly revenue data
   */
  getYearlyRevenue: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/yearly-revenue/`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching yearly revenue:', error);
      throw error;
    }
  },

  /**
   * Get customer-wise revenue analytics
   * @returns {Promise<Array>} Customer-wise revenue data
   */
  getCustomerWiseRevenue: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/customer-wise-revenue/`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching customer-wise revenue:', error);
      throw error;
    }
  },

  /**
   * Get KAM performance analytics
   * @returns {Promise<Array>} KAM performance data
   */
  getKAMPerformance: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/kam-performance/`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching KAM performance:', error);
      throw error;
    }
  },

  /**
   * Get dashboard summary statistics
   * @returns {Promise<Object>} Summary statistics
   */
  getSummary: async () => {
    try {
      const [weekly, monthly, yearly, customerWise] = await Promise.all([
        dashboardService.getWeeklyRevenue(),
        dashboardService.getMonthlyRevenue(),
        dashboardService.getYearlyRevenue(),
        dashboardService.getCustomerWiseRevenue(),
      ]);

      const totalRevenue = monthly.reduce((sum, item) => sum + (item.revenue || 0), 0);
      const totalCustomers = customerWise.length;
      const activeCustomers = customerWise.filter(c => c.status === 'Active').length;
      const collectionRate = customerWise.length > 0
        ? (customerWise.filter(c => c.collectionRate > 0).length / customerWise.length * 100).toFixed(1)
        : 0;

      return {
        totalRevenue,
        totalCustomers,
        activeCustomers,
        collectionRate,
        weeklyData: weekly,
        monthlyData: monthly,
        yearlyData: yearly,
        customerWiseData: customerWise,
      };
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw error;
    }
  },
};

export { dashboardService };
