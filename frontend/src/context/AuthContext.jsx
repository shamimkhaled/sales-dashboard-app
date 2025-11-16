// Auth Context for managing authentication state
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (token) {
        try {
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Verify token by getting user profile
          const response = await api.get('/users/me/');
          setUser(response);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Token verification failed:', error);

          // Try to refresh token
          if (refreshToken) {
            try {
              const refreshResponse = await api.post('/auth/refresh/', {
                refresh: refreshToken
              });

              const { access, refresh: newRefreshToken } = refreshResponse;

              localStorage.setItem('accessToken', access);
              localStorage.setItem('refreshToken', newRefreshToken);
              axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

              // Get user profile after refresh
              const profileResponse = await api.get('/users/me/');
              setUser(profileResponse);
              setIsAuthenticated(true);
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              logout();
            }
          } else {
            logout();
          }
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await api.post('/auth/login/', {
        email,
        password,
        rememberMe
      });

      const { access, refresh, user: userData } = response;

      // Store tokens
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  // Register function (for admins)
  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register/', userData);

      return {
        success: true,
        user: response.user,
        message: response.message
      };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Clear axios header
    delete axios.defaults.headers.common['Authorization'];

    setUser(null);
    setIsAuthenticated(false);
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      // Update user profile using the users endpoint with current user ID
      const response = await api.put(`/users/${user.id}/`, profileData);

      setUser(response);
      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Profile update failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Profile update failed'
      };
    }
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!user) return false;

    // Extract role name - handle both string and object format
    const roleName = typeof user.role === 'string' ? user.role : (user.role?.role_name || user.role_name);

    // Super admin has ALL permissions
    if (roleName === 'super_admin') {
      console.log(`Super admin access granted for permission: ${permission}`);
      return true;
    }

    // Admin role has all permissions
    if (roleName === 'admin') {
      console.log(`Admin access granted for permission: ${permission}`);
      return true;
    }

    // Check user permissions array if it exists
    if (user.permissions && Array.isArray(user.permissions)) {
      const hasPermission = user.permissions.includes('all') || user.permissions.includes(permission);
      console.log(`User permissions check for ${permission}:`, hasPermission, user.permissions);
      return hasPermission;
    }

    // Check role permissions if user has a role object with permissions
    if (user.role && user.role.permissions && Array.isArray(user.role.permissions)) {
      const hasPermission = user.role.permissions.includes('all') || user.role.permissions.includes(permission);
      console.log(`Role permissions check for ${permission}:`, hasPermission, user.role.permissions);
      return hasPermission;
    }

    // Fallback: allow basic access for authenticated users
    console.log(`Fallback access for ${permission}:`, isAuthenticated);
    return isAuthenticated;
  };

  // Check if user has role
  const hasRole = (role) => {
    if (!user) return false;
    const roleName = typeof user.role === 'string' ? user.role : user.role_name;
    return roleName === role;
  };

  // Check if user is admin or super admin
  const isAdmin = () => {
    if (!user) return false;
    const roleName = typeof user.role === 'string' ? user.role : (user.role?.role_name || user.role_name);
    const isAdmin = user && ['admin', 'super_admin'].includes(roleName);
    console.log('isAdmin check:', isAdmin, 'role:', roleName);
    return isAdmin;
  };

  // Check if user is super admin
  const isSuperAdmin = () => {
    if (!user) return false;
    const roleName = typeof user.role === 'string' ? user.role : (user.role?.role_name || user.role_name);
    const isSuperAdmin = user && roleName === 'super_admin';
    console.log('isSuperAdmin check:', isSuperAdmin, 'role:', roleName);
    return isSuperAdmin;
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    hasPermission,
    hasRole,
    isAdmin,
    isSuperAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};