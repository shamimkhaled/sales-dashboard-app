// Role Service - handles role management API calls
import api from "./api";

export const roleService = {
  // Get all roles
  async getRoles(filters = {}) {
    try {
      // For now, call without query params to avoid 404
      // TODO: Add pagination support when backend implements it
      const response = await api.get("/auth/roles/");
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get all permissions
  async getPermissions() {
    try {
      // Try to get all permissions, handle pagination if present
      let allPermissions = [];
      let nextUrl = "/auth/permissions/";
      let page = 1;

      while (nextUrl && page <= 10) {
        // Limit to 10 pages to prevent infinite loops
        const response = await api.get(nextUrl);

        let permissions = [];
        if (Array.isArray(response)) {
          permissions = response;
        } else if (response?.data && Array.isArray(response.data)) {
          permissions = response.data;
        } else if (response?.results && Array.isArray(response.results)) {
          permissions = response.results;
        }

        allPermissions = [...allPermissions, ...permissions];

        // Check for pagination
        if (response?.next) {
          nextUrl = response.next.replace(api.defaults.baseURL, ""); // Remove base URL
          page++;
        } else {
          nextUrl = null;
        }
      }

      return allPermissions;
    } catch (error) {
      throw error;
    }
  },

  // Get predefined role name choices
  async getRoleChoices() {
    try {
      const response = await api.get("/auth/role-choices/");
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
      const response = await api.post("/auth/roles/", roleData);
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
