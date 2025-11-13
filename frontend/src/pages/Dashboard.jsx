import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  DollarSign, Users, TrendingUp, Calendar,
  Download, Filter, RefreshCw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import KPICard from '../components/KPICard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { dashboardService } from '../services/dashboardService';

export default function Dashboard() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('month');
  
  // KPI Data
  const [kpiData, setKpiData] = useState({
    totalRevenue: 0,
    totalRevenueChange: 0,
    totalCustomers: 0,
    totalCustomersChange: 0,
    activeCustomers: 0,
    activeCustomersChange: 0,
    collectionRate: 0,
    collectionRateChange: 0,
  });

  // Chart Data
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [customerWiseData, setCustomerWiseData] = useState([]);
  const [kamPerformanceData, setKamPerformanceData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics data
      const [kpiRes, weeklyRes, monthlyRes, yearlyRes, customerWiseRes, kamRes] = await Promise.all([
        dashboardService.getKPIs(),
        dashboardService.getWeeklyRevenue(),
        dashboardService.getMonthlyRevenue(),
        dashboardService.getYearlyRevenue(),
        dashboardService.getCustomerWiseRevenue(),
        dashboardService.getKAMPerformance(),
      ]);

      const kpis = kpiRes.data || kpiRes;
      const weekly = weeklyRes.data || weeklyRes;
      const monthly = monthlyRes.data || monthlyRes;
      const yearly = yearlyRes.data || yearlyRes;
      const customerWise = customerWiseRes.data || customerWiseRes;
      const kamPerformance = kamRes.data || kamRes;

      setKpiData({
        totalRevenue: kpis.total_revenue || 0,
        totalRevenueChange: kpis.total_revenue_change || 0,
        totalCustomers: kpis.total_customers || 0,
        totalCustomersChange: kpis.total_customers_change || 0,
        activeCustomers: kpis.active_customers || 0,
        activeCustomersChange: kpis.active_customers_change || 0,
        collectionRate: kpis.collection_rate || 0,
        collectionRateChange: kpis.collection_rate_change || 0,
      });

      setWeeklyData(weekly);
      setMonthlyData(monthly);
      setYearlyData(yearly);
      setCustomerWiseData(customerWise);
      setKamPerformanceData(kamPerformance);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const chartColors = {
    primary: isDark ? '#d4af37' : '#d4af37',
    secondary: isDark ? '#00a8e8' : '#0066cc',
    success: isDark ? '#10b981' : '#10b981',
    warning: isDark ? '#f59e0b' : '#f59e0b',
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-dark-950' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`sticky top-16 z-40 backdrop-blur-md border-b transition-all duration-300 ${
        isDark
          ? 'bg-dark-900/80 border-dark-700'
          : 'bg-white/80 border-gold-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-serif font-bold ${
                isDark ? 'text-white' : 'text-dark-900'
              }`}>
                Sales Dashboard
              </h1>
              <p className={`mt-2 ${isDark ? 'text-silver-400' : 'text-gray-600'}`}>
                ISP Company Revenue Analytics & Insights
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchDashboardData}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  isDark
                    ? 'bg-dark-800 text-gold-400 hover:bg-dark-700'
                    : 'bg-gold-50 text-gold-600 hover:bg-gold-100'
                }`}
              >
                <RefreshCw size={20} />
              </motion.button>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 border ${
                  isDark
                    ? 'bg-dark-800 border-dark-700 text-gold-400 hover:border-gold-500'
                    : 'bg-white border-gold-200 text-gold-600 hover:border-gold-400'
                }`}
              >
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        {/* KPI Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <motion.div variants={itemVariants}>
            <KPICard
              title="Total Revenue"
              value={`৳${kpiData.totalRevenue?.toLocaleString()}`}
              icon={DollarSign}
              color="gold"
              trend={kpiData.totalRevenueChange >= 0 ? "up" : "down"}
              trendValue={`${kpiData.totalRevenueChange >= 0 ? '+' : ''}${kpiData.totalRevenueChange}%`}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Total Customers"
              value={kpiData.totalCustomers}
              icon={Users}
              color="blue"
              trend={kpiData.totalCustomersChange >= 0 ? "up" : "down"}
              trendValue={`${kpiData.totalCustomersChange >= 0 ? '+' : ''}${kpiData.totalCustomersChange}%`}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Active Customers"
              value={kpiData.activeCustomers}
              icon={TrendingUp}
              color="green"
              trend={kpiData.activeCustomersChange >= 0 ? "up" : "down"}
              trendValue={`${kpiData.activeCustomersChange >= 0 ? '+' : ''}${kpiData.activeCustomersChange}%`}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Collection Rate"
              value={`${kpiData.collectionRate}%`}
              icon={Calendar}
              color="purple"
              trend={kpiData.collectionRateChange >= 0 ? "up" : "down"}
              trendValue={`${kpiData.collectionRateChange >= 0 ? '+' : ''}${kpiData.collectionRateChange}%`}
            />
          </motion.div>
        </motion.div>

        {/* Charts Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          {/* Weekly Revenue Chart */}
          <motion.div
            variants={itemVariants}
            className={`rounded-2xl p-6 transition-all duration-300 ${
              isDark
                ? 'bg-dark-800 border border-dark-700'
                : 'bg-white border border-gold-100'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-dark-900'
            }`}>
              Weekly Revenue
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: isDark ? '#d4af37' : '#d4af37' }}
                />
                <Area type="monotone" dataKey="revenue" stroke={chartColors.primary} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Monthly Revenue Chart */}
          <motion.div
            variants={itemVariants}
            className={`rounded-2xl p-6 transition-all duration-300 ${
              isDark
                ? 'bg-dark-800 border border-dark-700'
                : 'bg-white border border-gold-100'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-dark-900'
            }`}>
              Monthly Revenue
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: isDark ? '#d4af37' : '#d4af37' }}
                />
                <Bar dataKey="revenue" fill={chartColors.primary} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Yearly Revenue Chart */}
          <motion.div
            variants={itemVariants}
            className={`rounded-2xl p-6 transition-all duration-300 ${
              isDark
                ? 'bg-dark-800 border border-dark-700'
                : 'bg-white border border-gold-100'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-dark-900'
            }`}>
              Yearly Revenue
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: isDark ? '#d4af37' : '#d4af37' }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke={chartColors.primary} strokeWidth={2} dot={{ fill: chartColors.primary }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Customer Distribution */}
          <motion.div
            variants={itemVariants}
            className={`rounded-2xl p-6 transition-all duration-300 ${
              isDark
                ? 'bg-dark-800 border border-dark-700'
                : 'bg-white border border-gold-100'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-dark-900'
            }`}>
              Customer Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: kpiData.activeCustomers },
                    { name: 'Inactive', value: kpiData.totalCustomers - kpiData.activeCustomers },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill={chartColors.success} />
                  <Cell fill={chartColors.warning} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* KAM Performance Chart */}
          <motion.div
            variants={itemVariants}
            className={`rounded-2xl p-6 transition-all duration-300 ${
              isDark
                ? 'bg-dark-800 border border-dark-700'
                : 'bg-white border border-gold-100'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-dark-900'
            }`}>
              KAM Performance
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kamPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="kam" stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: isDark ? '#d4af37' : '#d4af37' }}
                />
                <Legend />
                <Bar dataKey="totalRevenue" fill={chartColors.primary} name="Revenue" radius={[8, 8, 0, 0]} />
                <Bar dataKey="customers" fill={chartColors.secondary} name="Customers" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* Customer Wise Revenue Table */}
        <motion.div
          variants={itemVariants}
          className={`rounded-2xl p-6 transition-all duration-300 ${
            isDark
              ? 'bg-dark-800 border border-dark-700'
              : 'bg-white border border-gold-100'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-dark-900'
            }`}>
              Top Customers by Revenue
            </h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                isDark
                  ? 'bg-dark-700 text-gold-400 hover:bg-dark-600'
                  : 'bg-gold-50 text-gold-600 hover:bg-gold-100'
              }`}
            >
              <Download size={18} />
              <span>Export</span>
            </motion.button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-dark-700' : 'border-gold-100'}`}>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>Customer Name</th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>Join Date</th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>Status</th>
                  <th className={`px-4 py-3 text-right text-sm font-semibold ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>Revenue</th>
                  <th className={`px-4 py-3 text-right text-sm font-semibold ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>Collection Rate</th>
                </tr>
              </thead>
              <tbody>
                {customerWiseData.slice(0, 10).map((customer, idx) => (
                  <tr
                    key={idx}
                    className={`border-b transition-colors duration-300 hover:${isDark ? 'bg-dark-700' : 'bg-gold-50'} ${
                      isDark ? 'border-dark-700' : 'border-gold-100'
                    }`}
                  >
                    <td className={`px-4 py-3 text-sm ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>{customer.customerName}</td>
                    <td className={`px-4 py-3 text-sm ${
                      isDark ? 'text-silver-400' : 'text-gray-600'
                    }`}>{new Date(customer.joinDate).toLocaleDateString()}</td>
                    <td className={`px-4 py-3 text-sm`}>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        customer.leaveDate
                          ? isDark
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-red-100 text-red-700'
                          : isDark
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {customer.leaveDate ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right ${
                      isDark ? 'text-gold-400' : 'text-gold-600'
                    }`}>৳{customer.totalRevenue?.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm text-right ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>{(customer.collectionRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

         {/* KAM Performance Table */}
         <motion.div
           variants={itemVariants}
           className={`rounded-2xl p-6 transition-all duration-300 ${
             isDark
               ? 'bg-dark-800 border border-dark-700'
               : 'bg-white border border-gold-100'
           }`}
         >
           <div className="flex items-center justify-between mb-6">
             <h3 className={`text-lg font-semibold ${
               isDark ? 'text-white' : 'text-dark-900'
             }`}>
               KAM Performance Summary
             </h3>
           </div>

           <div className="overflow-x-auto">
             <table className="w-full">
               <thead>
                 <tr className={`border-b ${isDark ? 'border-dark-700' : 'border-gold-100'}`}>
                   <th className={`px-4 py-3 text-left text-sm font-semibold ${
                     isDark ? 'text-silver-300' : 'text-gray-700'
                   }`}>KAM Name</th>
                   <th className={`px-4 py-3 text-center text-sm font-semibold ${
                     isDark ? 'text-silver-300' : 'text-gray-700'
                   }`}>Total Customers</th>
                   <th className={`px-4 py-3 text-center text-sm font-semibold ${
                     isDark ? 'text-silver-300' : 'text-gray-700'
                   }`}>Active Customers</th>
                   <th className={`px-4 py-3 text-right text-sm font-semibold ${
                     isDark ? 'text-silver-300' : 'text-gray-700'
                   }`}>Total Revenue</th>
                   <th className={`px-4 py-3 text-right text-sm font-semibold ${
                     isDark ? 'text-silver-300' : 'text-gray-700'
                   }`}>Avg Revenue/Customer</th>
                 </tr>
               </thead>
               <tbody>
                 {kamPerformanceData.map((kam, idx) => (
                   <tr
                     key={idx}
                     className={`border-b transition-colors duration-300 hover:${isDark ? 'bg-dark-700' : 'bg-gold-50'} ${
                       isDark ? 'border-dark-700' : 'border-gold-100'
                     }`}
                   >
                     <td className={`px-4 py-3 text-sm font-medium ${
                       isDark ? 'text-gold-400' : 'text-gold-600'
                     }`}>{kam.kam}</td>
                     <td className={`px-4 py-3 text-sm text-center ${
                       isDark ? 'text-silver-300' : 'text-gray-700'
                     }`}>{kam.customers}</td>
                     <td className={`px-4 py-3 text-sm text-center ${
                       isDark ? 'text-green-400' : 'text-green-600'
                     }`}>{kam.activeCustomers}</td>
                     <td className={`px-4 py-3 text-sm font-semibold text-right ${
                       isDark ? 'text-gold-400' : 'text-gold-600'
                     }`}>৳{kam.totalRevenue?.toLocaleString()}</td>
                     <td className={`px-4 py-3 text-sm text-right ${
                       isDark ? 'text-silver-300' : 'text-gray-700'
                     }`}>৳{(kam.totalRevenue / kam.customers).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </motion.div>

        </motion.div>
      </div>
    </div>
  );
}