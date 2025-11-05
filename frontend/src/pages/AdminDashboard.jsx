// Admin Dashboard Component
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, Activity, BarChart3, Shield, AlertTriangle,
  TrendingUp, Calendar, CheckCircle, XCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import KPICard from '../components/KPICard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';

const AdminDashboard = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalActivities: 0,
    recentActivities: [],
    userRoles: {},
    systemHealth: 'good'
  });

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data - replace with actual API calls
      setStats({
        totalUsers: 25,
        activeUsers: 22,
        totalActivities: 1247,
        recentActivities: [
          { id: 1, action: 'User Login', user: 'john_doe', timestamp: '2024-01-15 10:30:00' },
          { id: 2, action: 'Bill Created', user: 'admin', timestamp: '2024-01-15 09:45:00' },
          { id: 3, action: 'Customer Updated', user: 'manager', timestamp: '2024-01-15 09:15:00' },
          { id: 4, action: 'User Registered', user: 'admin', timestamp: '2024-01-15 08:30:00' },
        ],
        userRoles: {
          super_admin: 1,
          admin: 3,
          user: 21
        },
        systemHealth: 'good'
      });
    } catch (err) {
      setError('Failed to fetch admin statistics');
    } finally {
      setLoading(false);
    }
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
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-md border-b transition-all duration-300 ${
        isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Admin Dashboard
              </h1>
              <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                System administration and user management overview
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                stats.systemHealth === 'good'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : stats.systemHealth === 'warning'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                System: {stats.systemHealth === 'good' ? 'Healthy' : stats.systemHealth === 'warning' ? 'Warning' : 'Critical'}
              </div>
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
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              color="blue"
              trend="up"
              trendValue="+5.2%"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Active Users"
              value={stats.activeUsers}
              icon={CheckCircle}
              color="green"
              trend="up"
              trendValue="+3.1%"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Total Activities"
              value={stats.totalActivities.toLocaleString()}
              icon={Activity}
              color="purple"
              trend="up"
              trendValue="+12.8%"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="System Health"
              value={stats.systemHealth === 'good' ? 'Good' : 'Issues'}
              icon={stats.systemHealth === 'good' ? CheckCircle : AlertTriangle}
              color={stats.systemHealth === 'good' ? 'green' : 'red'}
            />
          </motion.div>
        </motion.div>

        {/* User Roles Distribution */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          <motion.div
            variants={itemVariants}
            className={`rounded-2xl p-6 transition-all duration-300 ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              User Roles Distribution
            </h3>
            <div className="space-y-4">
              {Object.entries(stats.userRoles).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      role === 'super_admin' ? 'bg-red-500' :
                      role === 'admin' ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    <span className={`capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Activities */}
          <motion.div
            variants={itemVariants}
            className={`rounded-2xl p-6 transition-all duration-300 ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Recent Activities
            </h3>
            <div className="space-y-3">
              {stats.recentActivities.map((activity) => (
                <div key={activity.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  isDark ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {activity.action}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      by {activity.user}
                    </p>
                  </div>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={itemVariants}
          className={`rounded-2xl p-6 transition-all duration-300 ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          <h3 className={`text-lg font-semibold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-300 ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}>
              <UserPlus size={20} />
              <span>Add User</span>
            </button>
            <button className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-300 ${
              isDark
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}>
              <BarChart3 size={20} />
              <span>View Reports</span>
            </button>
            <button className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-300 ${
              isDark
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}>
              <Activity size={20} />
              <span>Activity Logs</span>
            </button>
            <button className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-300 ${
              isDark
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}>
              <Shield size={20} />
              <span>System Settings</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;