import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Sidebar from "./components/Sidebar";
import NotificationContainer from "./components/NotificationContainer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ActivityLogs from "./pages/ActivityLogs";
import CompanyReports from "./pages/CompanyReports";
import DataEntryPerformance from "./pages/DataEntryPerformance";
import DataEntry from "./pages/DataEntry";
import Customers from "./pages/Customers";
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import Prospects from "./pages/Prospects";
import Profile from "./pages/Profile";
import "./App.css";

// Protected Route Component
const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Main App Layout with Sidebar
const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar - Always visible on desktop, toggleable on mobile */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile menu button */}
        {!sidebarOpen && (
          <div className="lg:hidden fixed top-4 left-4 z-50">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md bg-gray-800 text-white shadow-lg"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <NotificationContainer />
    </div>
  );
};

// App Routes Component
const AppRoutes = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              {isAdmin() ? <AdminDashboard /> : <Dashboard />}
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/data-entry"
        element={
          <ProtectedRoute requiredPermission="bills:create">
            <AppLayout>
              <DataEntry />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute requiredPermission="customers:read">
            <AppLayout>
              <Customers />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/prospects"
        element={
          <ProtectedRoute requiredPermission="customers:read">
            <AppLayout>
              <Prospects />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/users"
        element={
          <AdminRoute>
            <AppLayout>
              <Users />
            </AppLayout>
          </AdminRoute>
        }
      />

      <Route
        path="/roles"
        element={
          <AdminRoute>
            <AppLayout>
              <Roles />
            </AppLayout>
          </AdminRoute>
        }
      />

      <Route
        path="/activity-logs"
        element={
          <AdminRoute>
            <AppLayout>
              <ActivityLogs />
            </AppLayout>
          </AdminRoute>
        }
      />

      <Route
        path="/reports/company"
        element={
          <ProtectedRoute requiredPermission="reports:read">
            <AppLayout>
              <CompanyReports />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports/performance"
        element={
          <ProtectedRoute requiredPermission="reports:read">
            <AppLayout>
              <DataEntryPerformance />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/register"
        element={
          <AdminRoute>
            <Register />
          </AdminRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                404
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Page not found</p>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
