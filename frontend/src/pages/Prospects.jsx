import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Search, Trash2, X, Edit2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useNotification } from "../context/NotificationContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorAlert from "../components/ErrorAlert";
import Pagination from "../components/Pagination";
import { prospectService } from "../services/prospectService";

const initialForm = {
  name: "",
  company_name: "",
  email: "",
  phone: "",
  address: "",
  potential_revenue: "",
  contact_person: "",
  source: "",
  follow_up_date: "",
  notes: "",
  status: "new",
  sales_person: "",
};

export default function Prospects() {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prospects, setProspects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [prospectToDelete, setProspectToDelete] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProspect, setEditingProspect] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Validate phone number
  const validatePhone = (phone) => {
    if (!phone) return "";
    const phoneRegex = /^[0-9\s\-\+\(\)]{10,}$/;
    if (!phoneRegex.test(phone)) {
      return "Phone must be at least 10 digits and contain only numbers, spaces, dashes, plus, or parentheses";
    }
    return "";
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (formData.phone && validatePhone(formData.phone)) {
      errors.phone = validatePhone(formData.phone);
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Parse validation errors from API response
  const parseValidationErrors = (errorMessage) => {
    const errors = {};
    
    // Try to extract field errors from error message
    // Format: "field_name: error message; another_field: error message"
    if (errorMessage && typeof errorMessage === 'string') {
      const fieldErrorPattern = /(\w+):\s*([^;]+)/g;
      let match;
      while ((match = fieldErrorPattern.exec(errorMessage)) !== null) {
        const fieldName = match[1].trim();
        const errorMsg = match[2].trim();
        errors[fieldName] = errorMsg;
      }
    }
    
    return errors;
  };

  useEffect(() => {
    fetchProspects();
    // eslint-disable-next-line
  }, [currentPage, pageSize, searchTerm]);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await prospectService.getAllProspects({
        page: currentPage,
        pageSize,
        search: searchTerm,
      });
      
      console.log('Prospects API Response:', response);
      
      // Handle Django REST Framework pagination response
      if (response.results) {
        // DRF PageNumberPagination format: { count, next, previous, results }
        console.log('Using DRF format - count:', response.count, 'results length:', response.results.length);
        setProspects(response.results);
        setTotalCount(response.count || 0);
        setTotalPages(Math.ceil((response.count || 0) / pageSize));
      } else if (response.data) {
        console.log('Using data format - data length:', response.data.length);
        setProspects(response.data);
        // Extract pagination info from response
        if (response.pagination) {
          setTotalCount(response.pagination.totalCount || response.pagination.total || 0);
          setTotalPages(response.pagination.totalPages || response.pagination.pages || 0);
        } else if (response.total || response.totalCount) {
          // Pagination info at root level
          setTotalCount(response.total || response.totalCount);
          setTotalPages(response.totalPages || Math.ceil((response.total || response.totalCount) / pageSize));
        } else {
          // No pagination info available
          setTotalCount(response.data.length);
          setTotalPages(Math.ceil(response.data.length / pageSize));
        }
      } else if (Array.isArray(response)) {
        console.log('Using array format - length:', response.length);
        setProspects(response);
        setTotalCount(response.length);
        setTotalPages(Math.ceil(response.length / pageSize));
      }
    } catch (err) {
      console.error('Error fetching prospects:', err);
      setError(err.message || "Failed to fetch prospects");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showError("Please fix the validation errors");
      return;
    }
    try {
      setLoading(true);
      await prospectService.createProspect({
        ...formData,
        potential_revenue: Number(formData.potential_revenue),
      });
      showSuccess("Prospect created successfully");
      setFormData(initialForm);
      setFormErrors({});
      setShowForm(false);
      setCurrentPage(1);
      setSearchTerm("");
    } catch (err) {
      console.error('Create prospect error:', err);
      // Try to parse field-level validation errors
      const errorMessage = err.message || "Failed to create prospect";
      const fieldErrors = parseValidationErrors(errorMessage);
      
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(fieldErrors);
        showError("Please fix the validation errors");
      } else {
        showError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (prospect) => {
    setProspectToDelete(prospect);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!prospectToDelete) return;
    try {
      setLoading(true);
      await prospectService.deleteProspect(prospectToDelete.id);
      showSuccess("Prospect deleted successfully");
      setShowDeleteModal(false);
      setProspectToDelete(null);
      fetchProspects();
    } catch (err) {
      showError(err.message || "Failed to delete prospect");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setProspectToDelete(null);
  };

  const handleEditClick = (prospect) => {
    setEditingProspect(prospect);
    setFormData({
      name: prospect.name || "",
      company_name: prospect.company_name || "",
      email: prospect.email || "",
      phone: prospect.phone || "",
      address: prospect.address || "",
      potential_revenue: prospect.potential_revenue || "",
      contact_person: prospect.contact_person || "",
      source: prospect.source || "",
      follow_up_date: prospect.follow_up_date || "",
      notes: prospect.notes || "",
      status: prospect.status || "new",
      sales_person: prospect.sales_person || "",
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingProspect) return;
    if (!validateForm()) {
      showError("Please fix the validation errors");
      return;
    }
    try {
      setLoading(true);
      await prospectService.updateProspect(editingProspect.id, {
        ...formData,
        potential_revenue: Number(formData.potential_revenue),
      });
      showSuccess("Prospect updated successfully");
      setFormData(initialForm);
      setFormErrors({});
      setShowEditForm(false);
      setEditingProspect(null);
      fetchProspects();
    } catch (err) {
      console.error('Update prospect error:', err);
      // Try to parse field-level validation errors
      const errorMessage = err.message || "Failed to update prospect";
      const fieldErrors = parseValidationErrors(errorMessage);
      
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(fieldErrors);
        showError("Please fix the validation errors");
      } else {
        showError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditCancel = () => {
    setShowEditForm(false);
    setEditingProspect(null);
    setFormData(initialForm);
  };

  if (loading && prospects.length === 0) return <LoadingSpinner />;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-dark-950" : "bg-gray-50"
      }`}
    >
      <div
        className={`sticky top-0 z-40 backdrop-blur-md border-b transition-all duration-300 ${
          isDark
            ? "bg-dark-900/80 border-dark-700"
            : "bg-white/80 border-gold-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1
                className={`text-3xl sm:text-4xl font-serif font-bold ${
                  isDark ? "text-white" : "text-dark-900"
                }`}
              >
                Prospects
              </h1>
              <p
                className={`mt-2 ${
                  isDark ? "text-silver-400" : "text-gray-600"
                }`}
              >
                Manage sales prospects and leads
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(!showForm)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              <span>New Prospect</span>
            </motion.button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-8 rounded-2xl p-6 transition-all duration-300 ${
                isDark
                  ? "bg-dark-800 border border-dark-700"
                  : "bg-white border border-gold-100"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2
                  className={`text-2xl font-serif font-bold ${
                    isDark ? "text-white" : "text-dark-900"
                  }`}
                >
                  New Prospect
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    isDark
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <X size={24} />
                </button>
              </div>
              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none ${
                      formErrors.name
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none ${
                      formErrors.company_name
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.company_name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.company_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none ${
                      formErrors.email
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none ${
                      formErrors.phone
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Potential Revenue
                  </label>
                  <input
                    type="number"
                    name="potential_revenue"
                    value={formData.potential_revenue}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Source
                  </label>
                  <input
                    type="text"
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Follow Up Date
                  </label>
                  <input
                    type="date"
                    name="follow_up_date"
                    value={formData.follow_up_date}
                    onChange={handleInputChange}
                    min={getTodayDate()}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="lost">Lost</option>
                    <option value="won">Won</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sales Person (ID)
                  </label>
                  <input
                    type="number"
                    name="sales_person"
                    value={formData.sales_person}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Create Prospect"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setShowForm(false)}
                    className={`flex-1 px-6 py-2 rounded-lg font-medium ${
                      isDark
                        ? "bg-dark-700 text-gold-400 hover:bg-dark-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Edit Form */}
        <AnimatePresence>
          {showEditForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-8 rounded-2xl p-6 transition-all duration-300 ${
                isDark
                  ? "bg-dark-800 border border-dark-700"
                  : "bg-white border border-gold-100"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2
                  className={`text-2xl font-serif font-bold ${
                    isDark ? "text-white" : "text-dark-900"
                  }`}
                >
                  Edit Prospect
                </h2>
                <button
                  onClick={handleEditCancel}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    isDark
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <X size={24} />
                </button>
              </div>
              <form
                onSubmit={handleEditSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none ${
                      formErrors.name
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none ${
                      formErrors.company_name
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.company_name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.company_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none ${
                      formErrors.email
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none ${
                      formErrors.phone
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Potential Revenue
                  </label>
                  <input
                    type="number"
                    name="potential_revenue"
                    value={formData.potential_revenue}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Source
                  </label>
                  <input
                    type="text"
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Follow Up Date
                  </label>
                  <input
                    type="date"
                    name="follow_up_date"
                    value={formData.follow_up_date}
                    onChange={handleInputChange}
                    min={getTodayDate()}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="lost">Lost</option>
                    <option value="won">Won</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sales Person (ID)
                  </label>
                  <input
                    type="number"
                    name="sales_person"
                    value={formData.sales_person}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                  >
                    {loading ? "Updating..." : "Update Prospect"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleEditCancel}
                    className={`flex-1 px-6 py-2 rounded-lg font-medium ${
                      isDark
                        ? "bg-dark-700 text-gold-400 hover:bg-dark-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div
            className={`flex-1 relative ${
              isDark ? "bg-dark-800" : "bg-white"
            } rounded-lg border ${
              isDark ? "border-dark-700" : "border-gold-200"
            }`}
          >
            <Search
              className={`absolute left-3 top-3 ${
                isDark ? "text-silver-500" : "text-gray-400"
              }`}
              size={20}
            />
            <input
              type="text"
              placeholder="Search prospects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                isDark
                  ? "bg-dark-800 text-white placeholder-silver-500"
                  : "bg-white text-dark-900 placeholder-gray-400"
              }`}
            />
          </div>
        </div>
        {/* Table */}
        <div
          className={`rounded-2xl overflow-hidden ${
            isDark
              ? "bg-dark-800 border border-dark-700"
              : "bg-white border border-gold-100"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={`border-b ${
                    isDark ? "border-dark-700" : "border-gold-100"
                  }`}
                >
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b ${
                      isDark ? "border-dark-700" : "border-gold-100"
                    } hover:${isDark ? "bg-dark-700" : "bg-gold-50"}`}
                  >
                    <td className="px-6 py-4 text-sm font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-sm">{p.company_name}</td>
                    <td className="px-6 py-4 text-sm">{p.email}</td>
                    <td className="px-6 py-4 text-sm">{p.phone}</td>
                    <td className="px-6 py-4 text-sm">{p.status}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEditClick(p)}
                          className={`p-2 rounded-lg ${
                            isDark
                              ? "bg-dark-700 text-blue-400 hover:bg-dark-600"
                              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                          }`}
                          title="Edit prospect"
                        >
                          <Edit2 size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteClick(p)}
                          className={`p-2 rounded-lg ${
                            isDark
                              ? "bg-dark-700 text-red-400 hover:bg-dark-600"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                          title="Delete prospect"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pagination */}
        {prospects.length > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={
                totalPages ||
                Math.ceil((totalCount || prospects.length) / pageSize)
              }
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalCount={totalCount}
            />
          </div>
        )}
        {prospects.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center py-12 rounded-2xl ${
              isDark
                ? "bg-dark-800 border border-dark-700"
                : "bg-white border border-gold-100"
            }`}
          >
            <p
              className={`text-lg ${
                isDark ? "text-silver-400" : "text-gray-600"
              }`}
            >
              No prospects found. Create one to get started!
            </p>
          </motion.div>
        )}
        {/* Delete Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleDeleteCancel}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div
                  className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${
                    isDark
                      ? "bg-dark-800 border border-dark-700"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-center mb-4">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        isDark ? "bg-red-900/30" : "bg-red-100"
                      }`}
                    >
                      <Trash2
                        className={`w-8 h-8 ${
                          isDark ? "text-red-400" : "text-red-600"
                        }`}
                      />
                    </div>
                  </div>
                  <h3
                    className={`text-xl font-bold text-center mb-2 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Delete Prospect
                  </h3>
                  <p
                    className={`text-center mb-6 ${
                      isDark ? "text-silver-400" : "text-gray-600"
                    }`}
                  >
                    Are you sure you want to delete the prospect{" "}
                    <span className="font-semibold text-red-500">
                      "{prospectToDelete?.name}"
                    </span>
                    ? This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDeleteCancel}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium ${
                        isDark
                          ? "bg-dark-700 text-white hover:bg-dark-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDeleteConfirm}
                      className="flex-1 px-4 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
