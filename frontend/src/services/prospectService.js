// Prospect Service - handles prospect API calls
import api from "./api";

export const prospectService = {
  // Get all prospects
  async getAllProspects(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append("search", params.search);
    if (params.page) queryParams.append("page", params.page);
    if (params.pageSize) queryParams.append("pageSize", params.pageSize);
    const url = `/customers/prospects/${
      queryParams.toString() ? "?" + queryParams.toString() : ""
    }`;
    return await api.get(url);
  },

  // Create a new prospect
  async createProspect(data) {
    return await api.post("/customers/prospects/", data);
  },

  // Update a prospect by id
  async updateProspect(id, data) {
    return await api.put(`/customers/prospects/${id}/`, data);
  },

  // Delete a prospect by id
  async deleteProspect(id) {
    return await api.delete(`/customers/prospects/${id}/`);
  },
};
