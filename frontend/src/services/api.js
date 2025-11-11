import axios from 'axios';

const API_URL = '/api';  // Use proxy in development, relative path in production

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response.data; // Return data directly
  },
  (error) => {
    console.error('API Error:', error);

    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const data = error.response.data;
      let message = 'Server error';
      
      // Try to extract detailed error message
      if (data?.error) {
        message = data.error;
      } else if (data?.message) {
        message = data.message;
      } else if (data?.detail) {
        message = data.detail;
      } else if (data?.errors) {
        // Handle validation errors
        if (Array.isArray(data.errors)) {
          message = data.errors.map(e => e.message || e).join(', ');
        } else if (typeof data.errors === 'object') {
          message = Object.entries(data.errors)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('; ');
        }
      }
      
      // Include status code for debugging
      const statusCode = error.response.status;
      const fullMessage = `${message} (${statusCode})`;
      throw new Error(fullMessage);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error - please check your connection');
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

export default api;