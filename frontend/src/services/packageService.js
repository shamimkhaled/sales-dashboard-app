// Package Service - handles package API calls
import api from "./api";

export const packageService = {
  // Get all packages
  async getAllPackages(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append("search", params.search);
    if (params.page) queryParams.append("page", params.page);
    if (params.pageSize) queryParams.append("pageSize", params.pageSize);
    if (params.type) queryParams.append("type", params.type);
    const url = `/packages/${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
    return await api.get(url);
  },

  // Create a new package
  async createPackage(data) {
    return await api.post("/packages/", data);
  },

  // Update a package by id
  async updatePackage(id, data) {
    return await api.put(`/packages/${id}/`, data);
  },

  // Delete a package by id
  async deletePackage(id) {
    return await api.delete(`/packages/${id}/`);
  },
};