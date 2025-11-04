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
          const response = await api.get('/auth/profile');
          setUser(response.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Token verification failed:', error);

          // Try to refresh token
          if (refreshToken) {
            try {
              const refreshResponse = await api.post('/auth/refresh-token', {
                refreshToken
              });

              const { accessToken, refreshToken: newRefreshToken, user: userData } = refreshResponse;

              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

              setUser(userData);
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
      const response = await api.post('/auth/login', {
        email,
        password,
        rememberMe
      });

      const { accessToken, refreshToken, user: userData } = response;

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

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
      const response = await api.post('/auth/register', userData);

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
      const response = await api.put('/auth/profile', profileData);

      setUser(response.user);
      return { success: true, message: response.message };
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
    if (!user || !user.permissions) return false;
    return user.permissions.includes('all') || user.permissions.includes(permission);
  };

  // Check if user has role
  const hasRole = (role) => {
    return user && user.role === role;
  };

  // Check if user is admin or super admin
  const isAdmin = () => {
    return user && ['admin', 'super_admin'].includes(user.role);
  };

  // Check if user is super admin
  const isSuperAdmin = () => {
    return user && user.role === 'super_admin';
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