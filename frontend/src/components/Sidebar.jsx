// Sidebar Component to replace Navbar
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Moon,
  Sun,
  LayoutDashboard,
  FileText,
  Users,
  UserPlus,
  BarChart3,
  Activity,
  LogOut,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import KTLLogo from './KTLLogo';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, hasPermission, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [reportsOpen, setReportsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Base navigation items for all users
  const baseNavItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      permission: null // Dashboard is always visible to authenticated users
    },
    {
      name: 'Bill Entry',
      path: '/data-entry',
      icon: FileText,
      permission: 'bills:create' // Changed from bills:write to bills:create
    },
    {
      name: 'Customers',
      path: '/customers',
      icon: Users,
      permission: 'customers:read'
    }
  ];

  // Admin-only navigation items
  const adminNavItems = [
    {
      name: 'User Management',
      path: '/users',
      icon: UserPlus,
      permission: 'users:read'
    },
    {
      name: 'Activity Logs',
      path: '/activity-logs',
      icon: Activity,
      permission: 'logs:read'
    }
  ];

  // Reports submenu
  const reportsItems = [
    {
      name: 'Company Reports',
      path: '/reports/company',
      permission: 'reports:read'
    },
    {
      name: 'Data Entry Performance',
      path: '/reports/performance',
      permission: 'reports:read'
    }
  ];

  // Filter navigation items based on permissions
  const visibleNavItems = baseNavItems.filter(item =>
    !item.permission || hasPermission(item.permission) || hasPermission('all')
  );

  const visibleAdminItems = isAdmin() ? adminNavItems.filter(item =>
    !item.permission || hasPermission(item.permission) || hasPermission('all')
  ) : [];

  const visibleReportsItems = reportsItems.filter(item =>
    !item.permission || hasPermission(item.permission) || hasPermission('all')
  );

  const NavItem = ({ item, isSubmenu = false }) => (
    <Link
      to={item.path}
      onClick={() => setIsOpen(false)}
      className={`flex items-center px-3 sm:px-4 py-3 rounded-lg font-medium transition-all duration-300 group ${
        isActive(item.path)
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:text-white shadow-lg'
          : isDark
          ? 'text-gray-300 hover:text-gray-300'
          : 'text-gray-700 hover:text-gray-700'
      } ${isSubmenu ? 'ml-4 sm:ml-6 text-sm' : ''}`}
    >
      <item.icon className={`h-5 w-5 mr-3 ${isActive(item.path) ? 'text-white' : ''}`} />
      <span className={`text-sm sm:text-base ${!isActive(item.path) ? 'group-hover:underline' : ''}`}>{item.name}</span>
    </Link>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={isOpen || isDesktop ? 'open' : 'closed'}
        variants={{
          open: { x: 0 },
          closed: { x: '-100%' }
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed left-0 top-0 z-50 h-screen w-64 shadow-xl lg:sticky lg:z-auto lg:h-screen lg:w-64 ${
          isDark ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-gray-200'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-8 border-b border-gray-200 dark:border-gray-700">
              <Link to="/dashboard" className="flex flex-col items-center space-y-2 group flex-1">
                <img 
                  src="https://kloud.com.bd/netband/assets/img/logo/kloud-logo1.png" 
                  alt="Kloud Logo" 
                  className="h-12 w-auto object-contain"
                />
                <div className={`font-bold text-sm text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Sales Dashboard
                </div>
              </Link>

            {/* Close button for mobile */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium text-sm sm:text-base">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm sm:text-base font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {user?.username}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 sm:px-4 py-4 space-y-2 overflow-y-auto">
            {/* Main Navigation */}
            {visibleNavItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}

            {/* Reports Section */}
            {visibleReportsItems.length > 0 && (
              <div>
                <button
                  onClick={() => setReportsOpen(!reportsOpen)}
                  className={`flex items-center w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 group ${
                    isDark
                      ? 'text-gray-300 hover:text-gray-300'
                      : 'text-gray-700 hover:text-gray-700'
                  }`}
                >
                  <BarChart3 className="h-5 w-5 mr-3" />
                  <span className="group-hover:underline">Reports</span>
                  {reportsOpen ? (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </button>

                {reportsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-6 mt-2 space-y-1"
                  >
                    {visibleReportsItems.map((item) => (
                      <NavItem key={item.path} item={{ ...item, icon: BarChart3 }} isSubmenu />
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* Admin Navigation */}
            {visibleAdminItems.length > 0 && (
              <>
                <div className="pt-4">
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Administration
                    </h3>
                  </div>
                  {visibleAdminItems.map((item) => (
                    <NavItem key={item.path} item={item} />
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`flex items-center w-full px-4 py-2 rounded-lg font-medium transition-all duration-300 group ${
                isDark
                  ? 'text-gray-300 hover:text-gray-300'
                  : 'text-gray-700 hover:text-gray-700'
              }`}
            >
              {isDark ? <Sun className="h-5 w-5 mr-3" /> : <Moon className="h-5 w-5 mr-3" />}
              <span className="group-hover:underline">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {/* Settings (placeholder) */}
            <Link
              to="/settings"
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 group ${
                isActive('/settings')
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:text-white shadow-lg'
                  : isDark
                  ? 'text-gray-300 hover:text-gray-300'
                  : 'text-gray-700 hover:text-gray-700'
              }`}
            >
              <Settings className="h-5 w-5 mr-3" />
              <span className={`${!isActive('/settings') ? 'group-hover:underline' : ''}`}>Settings</span>
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`flex items-center w-full px-4 py-2 rounded-lg font-medium transition-all duration-300 group ${
                isDark
                  ? 'text-gray-300 hover:text-gray-300'
                  : 'text-gray-700 hover:text-gray-700'
              }`}
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span className="group-hover:underline">Logout</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}