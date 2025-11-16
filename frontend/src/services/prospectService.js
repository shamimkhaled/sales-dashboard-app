// Prospect Service - handles prospect API calls
import api from "./api";

export const prospectService = {
  // Get all prospects
  async getAllProspects(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append("search", params.search);
    if (params.page) queryParams.append("page", params.page);
    if (params.pageSize) queryParams.append("pageSize", params.pageSize);
    if (params.status) queryParams.append("status", params.status);
    if (params.month) queryParams.append("month", params.month);
    if (params.year) queryParams.append("year", params.year);
    if (params.start_date) queryParams.append("start_date", params.start_date);
    if (params.end_date) queryParams.append("end_date", params.end_date);
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
