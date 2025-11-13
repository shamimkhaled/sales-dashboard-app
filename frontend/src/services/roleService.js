// Role Service - handles role management API calls
import api from './api';

export const roleService = {
  // Get all roles
  async getRoles(filters = {}) {
    try {
      // For now, call without query params to avoid 404
      // TODO: Add pagination support when backend implements it
      const response = await api.get('/auth/roles/');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get all permissions
  async getPermissions() {
    try {
      const response = await api.get('/auth/permissions/');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get role by ID
  async getRoleById(id) {
    try {
      const response = await api.get(`/auth/roles/${id}/`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create new role
  async createRole(roleData) {
    try {
      const response = await api.post('/auth/roles/', roleData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update role
  async updateRole(id, roleData) {
    try {
      const response = await api.put(`/auth/roles/${id}/`, roleData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete role
  async deleteRole(id) {
    try {
      const response = await api.delete(`/auth/roles/${id}/`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};
