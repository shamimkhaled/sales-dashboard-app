// Activity Log Service - handles activity logging API calls
import api from './api';

export const activityLogService = {
  // Get activity logs
  async getActivityLogs(filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (filters.user_id) queryParams.append('user_id', filters.user_id);
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.resource) queryParams.append('resource', filters.resource);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.pageSize) queryParams.append('pageSize', filters.pageSize);

      const response = await api.get(`/activity-logs?${queryParams}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get activity log by ID
  async getActivityLogById(id) {
    try {
      const response = await api.get(`/activity-logs/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get activity statistics (admin only)
  async getActivityStats(filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      const response = await api.get(`/activity-logs/stats/summary?${queryParams}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get user activity summary
  async getUserActivitySummary(userId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (filters.days) queryParams.append('days', filters.days);

      const response = await api.get(`/activity-logs/user/${userId}/summary?${queryParams}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Clean old logs (super admin only)
  async cleanOldLogs(daysToKeep = 90) {
    try {
      const response = await api.post('/activity-logs/clean', { daysToKeep });
      return response;
    } catch (error) {
      throw error;
    }
  }
};