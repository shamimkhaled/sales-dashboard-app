import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  X,
  TrendingUp,
  Calendar,
  DollarSign,
  Filter,
  FileUp,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorAlert from "../components/ErrorAlert";
import KPICard from "../components/KPICard";
import Pagination from "../components/Pagination";
import { customerService } from "../services/customerService";
import { userService } from "../services/userService";

export default function Customers() {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    address: "",
    assigned_sales_person: user?.id || "",
    status: "Active",
    link_id: "",
  });

  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    inactiveCustomers: 0,
  });

  const [salesUsers, setSalesUsers] = useState([]);

  const getUserName = (userId) => {
    if (!userId) return "-";
    const user = salesUsers.find((u) => u.id === parseInt(userId));
    return user ? user.username || user.email || userId : userId;
  };

  useEffect(() => {
    // Fetch sales users on mount. Customers are fetched by the pagination/search effects below.
    fetchSalesUsers();
  }, []);

  // Reset to page 1 when search term or filter changes. If already on page 1, fetch immediately.
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      return;
    }
    // already on page 1 — fetch with new search/filter
    fetchCustomers();
  }, [searchTerm, filterStatus]);

  // Fetch customers when current page or page size changes
  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerService.getAllCustomers({
        page: currentPage,
        pageSize: pageSize,
        search: searchTerm,
        status: filterStatus === "all" ? null : filterStatus,
      });

      // Django REST Framework pagination returns: {count, next, previous, results}
      const customerData = response.results || response.data || [];
      setCustomers(customerData);

      // Set pagination from DRF response
      if (response.count !== undefined) {
        setTotalCount(response.count);
        const pages = Math.ceil(response.count / pageSize);
        setTotalPages(pages);
      } else if (response.pagination) {
        setTotalCount(response.pagination.totalCount);
        setTotalPages(response.pagination.totalPages);
      }

      // Use stats from API response if available, otherwise calculate from current page
      if (response.stats) {
        setStats({
          totalCustomers: response.stats.totalCustomers,
          activeCustomers: response.stats.activeCustomers,
          inactiveCustomers: response.stats.inactiveCustomers,
        });
      } else {
        // Fallback: Calculate stats from current page data
        const active = customerData.filter((c) => c.status === "Active").length;
        const inactive = customerData.length - active;
        setStats({
          totalCustomers: response.count || customerData.length,
          activeCustomers: active,
          inactiveCustomers: inactive,
        });
      }
    } catch (err) {
      setError(err.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesUsers = async () => {
    try {
      const response = await userService.getUsers();
      // Handle different response formats
      let users = [];
      if (Array.isArray(response)) {
        users = response;
      } else if (response?.data && Array.isArray(response.data)) {
        users = response.data;
      } else if (response?.results && Array.isArray(response.results)) {
        users = response.results;
      }

      // Filter to only show users with sales_manager or sales_person role_name
      const filteredUsers = users.filter(
        (user) =>
          user.role_name === "sales_manager" ||
          user.role_name === "sales_person"
      );
      setSalesUsers(filteredUsers);
    } catch (err) {
      console.error("Error fetching sales users:", err);
      setSalesUsers([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (editingId) {
        // Update existing customer
        const customerData = {
          name: formData.name,
          company_name: formData.company_name,
          email: formData.email || "",
          phone: formData.phone || "",
          address: formData.address || "",
          assigned_sales_person:
            parseInt(formData.assigned_sales_person) || null,
          status: formData.status || "Active",
          link_id: formData.link_id || null,
        };
        console.log("Updating customer:", editingId, customerData);
        const response = await customerService.updateCustomer(
          editingId,
          customerData
        );
        console.log("Update response:", response);
        showSuccess("Customer updated successfully");
        resetForm();
        // Refresh the list by re-fetching
        await fetchCustomers();
      } else {
        // Create new customer
        const customerData = {
          name: formData.name,
          company_name: formData.company_name,
          email: formData.email || "",
          phone: formData.phone || "",
          address: formData.address || "",
          assigned_sales_person:
            parseInt(formData.assigned_sales_person) || null,
          status: formData.status || "Active",
          link_id: formData.link_id || null,
        };
        await customerService.createCustomer(customerData);
        showSuccess("Customer created successfully");
        resetForm();
        // If not on page 1, go to page 1, otherwise refresh current page
        if (currentPage !== 1) {
          setCurrentPage(1); // This will trigger useEffect to fetch
        } else {
          await fetchCustomers(); // Manually refresh if already on page 1
        }
      }
    } catch (err) {
      console.error("Submit error:", err);
      showError(err.message || "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      company_name: "",
      email: "",
      phone: "",
      address: "",
      assigned_sales_person: user?.id || "",
      status: "Active",
      link_id: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (customer) => {
    setFormData(customer);
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      setLoading(true);
      await customerService.deleteCustomer(customerToDelete.id);
      showSuccess("Customer deleted successfully");
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      setCurrentPage(1);
      fetchCustomers();
    } catch (err) {
      showError(err.message || "Failed to delete customer");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCustomerToDelete(null);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("file", file);

      const API_URL = import.meta.env.VITE_API_URL || "/api";
      const response = await fetch(`${API_URL}/customers/import/`, {
        method: "POST",
        body: formDataToSend,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract detailed error message
        let errorMessage = "Import failed";

        if (data.error) {
          errorMessage = data.error;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.details) {
          errorMessage = data.details;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === "object") {
          // Try to extract first error message from object
          const firstKey = Object.keys(data)[0];
          if (firstKey && Array.isArray(data[firstKey])) {
            errorMessage = data[firstKey][0];
          } else if (firstKey && typeof data[firstKey] === "string") {
            errorMessage = data[firstKey];
          }
        }

        throw new Error(errorMessage);
      }

      const successCount = data.success || data.data?.success || 0;
      const failedCount = data.failed || data.data?.failed || 0;
      showSuccess(
        `Customers imported successfully! ${successCount} imported, ${failedCount} failed.`
      );
      if (data.errors && data.errors.length > 0) {
        console.error("Import errors:", data.errors);
      }
      fetchCustomers();
    } catch (err) {
      showError(err.message || "Failed to import customers");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || "/api";

      // Fetch all customers data
      const response = await fetch(`${API_URL}/customers/?page_size=10000`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch customers data");
      }

      const data = await response.json();
      const customersData = data.results || data.data || [];

      // Define CSV headers matching backend fields
      const headers = [
        "id",
        "name",
        "company_name",
        "email",
        "phone",
        "address",
        // "potential_revenue",
        "calculated_monthly_revenue",
        "assigned_sales_person",
        "assigned_sales_person_details",
        "status",
        "link_id",
        "created_at",
        "updated_at",
      ];

      // Convert customers data to CSV rows
      const rows = customersData.map((customer) => [
        customer.id || "",
        customer.name || "",
        customer.company_name || "",
        customer.email || "",
        customer.phone || "",
        customer.address || "",
        // customer.potential_revenue || "",
        customer.calculated_monthly_revenue || "",
        customer.assigned_sales_person || "",
        customer.assigned_sales_person_details || "",
        customer.status || "",
        customer.link_id || "",
        customer.created_at || "",
        customer.updated_at || "",
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => {
              // Escape quotes and wrap in quotes if contains comma or quotes
              const cellStr = String(cell);
              if (
                cellStr.includes(",") ||
                cellStr.includes('"') ||
                cellStr.includes("\n")
              ) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(",")
        ),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers.csv";
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess("Customers exported successfully as CSV");
    } catch (err) {
      showError(err.message || "Failed to export customers");
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for the customers list search input.
  // Search will match Name, Company, Email, Phone, and KAM (assigned sales person).
  // Also respect the status filter (all / Active / Inactive) from the dropdown.
  const filteredCustomers = React.useMemo(() => {
    const term = (searchTerm || "").toString().trim().toLowerCase();

    return customers.filter((c) => {
      // Apply status filter first
      if (filterStatus && filterStatus !== "all") {
        const statusVal = (c.status || "").toString();
        if (statusVal !== filterStatus) return false;
      }

      // If no search term, include the record (status already applied)
      if (!term) return true;

      const name = (c.name || "").toString().toLowerCase();
      const company = (c.company_name || "").toString().toLowerCase();
      const email = (c.email || "").toString().toLowerCase();
      const phone = (c.phone || "").toString().toLowerCase();
      // getUserName may return username or email; use it for KAM search
      const kam = (getUserName(c.assigned_sales_person) || "")
        .toString()
        .toLowerCase();

      return (
        name.includes(term) ||
        company.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        kam.includes(term)
      );
    });
  }, [customers, searchTerm, salesUsers, filterStatus]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading && customers.length === 0) return <LoadingSpinner />;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-dark-950" : "bg-gray-50"
      }`}
    >
      {/* Header */}
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
                Customers
              </h1>
              <p
                className={`mt-2 ${
                  isDark ? "text-silver-400" : "text-gray-600"
                }`}
              >
                Manage customer information and details
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {hasPermission("customers:import") && (
                <label className="relative cursor-pointer px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl">
                  <FileUp size={20} />
                  <span>Import</span>
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              )}
              {hasPermission("customers:export") && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
                >
                  <Download size={20} />
                  <span>Export</span>
                </motion.button>
              )}
              {hasPermission("customers:update") && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
                >
                  <Plus size={20} />
                  <span>New Customer</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-lg ${
              isDark
                ? "bg-green-900/30 border border-green-700 text-green-400"
                : "bg-green-100 border border-green-300 text-green-700"
            }`}
          >
            {success}
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <motion.div variants={itemVariants}>
            <KPICard
              title="Total Customers"
              value={stats.totalCustomers}
              icon={Users}
              color="blue"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Active Customers"
              value={stats.activeCustomers}
              icon={TrendingUp}
              color="green"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Inactive Customers"
              value={stats.inactiveCustomers}
              icon={Calendar}
              color="red"
            />
          </motion.div>
        </motion.div>

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
                  {editingId ? "Edit Customer" : "New Customer"}
                </h2>
                <button
                  onClick={resetForm}
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
                {/* Name */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-silver-300" : "text-gray-700"
                    }`}
                  >
                    Name of Party *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                    } focus:outline-none`}
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-silver-300" : "text-gray-700"
                    }`}
                  >
                    Proprietor Name *
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                    } focus:outline-none`}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-silver-300" : "text-gray-700"
                    }`}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                    } focus:outline-none`}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-silver-300" : "text-gray-700"
                    }`}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+880 XXXXXXXXXX"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                    } focus:outline-none`}
                  />
                </div>

                {/* Potential and calculated monthly revenue fields removed from form */}

                {/* KAM (Assigned Sales Person - select from roles) */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-silver-300" : "text-gray-700"
                    }`}
                  >
                    KAM *
                  </label>
                  <select
                    name="assigned_sales_person"
                    value={formData.assigned_sales_person}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                    } focus:outline-none`}
                  >
                    <option value="">Select a KAM</option>
                    {salesUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username || user.email}
                      </option>
                    ))}
                  </select>
                  <p
                    className={`text-xs mt-1 ${
                      isDark ? "text-silver-400" : "text-gray-500"
                    }`}
                  >
                    Select the Key Account Manager (Sales Manager or Sales
                    Person)
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-silver-300" : "text-gray-700"
                    }`}
                  >
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                    } focus:outline-none`}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Link ID */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-silver-300" : "text-gray-700"
                    }`}
                  >
                    Link ID
                  </label>
                  <input
                    type="text"
                    name="link_id"
                    value={formData.link_id}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                    } focus:outline-none`}
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-silver-300" : "text-gray-700"
                    }`}
                  >
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                    } focus:outline-none`}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="md:col-span-2 flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={loading}
                    className={`flex-1 px-6 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl`}
                  >
                    {loading
                      ? "Saving..."
                      : editingId
                      ? "Update Customer"
                      : "Create Customer"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={resetForm}
                    className={`flex-1 px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
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

        {/* Search and Filter - Hidden when editing */}
        {!editingId && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div
              className={`flex-1 relative ${
                isDark ? "bg-dark-800" : "bg-white"
              } rounded-lg border transition-all duration-300 ${
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
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg transition-all duration-300 ${
                  isDark
                    ? "bg-dark-800 text-white placeholder-silver-500 focus:outline-none"
                    : "bg-white text-dark-900 placeholder-gray-400 focus:outline-none"
                }`}
              />
            </div>

            <div
              className={`relative ${
                isDark ? "bg-dark-800" : "bg-white"
              } rounded-lg border transition-all duration-300 ${
                isDark ? "border-dark-700" : "border-gold-200"
              }`}
            >
              <Filter
                className={`absolute left-3 top-3 ${
                  isDark ? "text-silver-500" : "text-gray-400"
                }`}
                size={20}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`pl-10 pr-4 py-2 rounded-lg transition-all duration-300 ${
                  isDark
                    ? "bg-dark-800 text-white focus:outline-none"
                    : "bg-white text-dark-900 focus:outline-none"
                }`}
              >
                <option value="all">All Customers</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}

        {/* Customers Table - Hidden when editing */}
        {!editingId && (
          <>
            <div
              className={`rounded-2xl overflow-hidden transition-all duration-300 ${
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
                      <th
                        className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDark ? "text-silver-300" : "text-gray-700"
                        }`}
                      >
                        Name of Party
                      </th>
                      <th
                        className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDark ? "text-silver-300" : "text-gray-700"
                        }`}
                      >
                        Proprietor Name
                      </th>
                      <th
                        className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDark ? "text-silver-300" : "text-gray-700"
                        }`}
                      >
                        Email
                      </th>
                      <th
                        className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDark ? "text-silver-300" : "text-gray-700"
                        }`}
                      >
                        Phone
                      </th>
                      <th
                        className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDark ? "text-silver-300" : "text-gray-700"
                        }`}
                      >
                        KAM
                      </th>
                      <th
                        className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDark ? "text-silver-300" : "text-gray-700"
                        }`}
                      >
                        Status
                      </th>
                      <th
                        className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDark ? "text-silver-300" : "text-gray-700"
                        }`}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={isDark ? "bg-dark-800" : "bg-white"}>
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className={`border-b transition-colors duration-300 hover:${
                          isDark ? "bg-dark-700" : "bg-gold-50"
                        } ${isDark ? "border-dark-700" : "border-gold-100"}`}
                      >
                        <td
                          className={`px-6 py-4 text-sm font-medium ${
                            isDark ? "text-white" : "text-dark-900"
                          }`}
                        >
                          {customer.name}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm font-medium ${
                            isDark ? "text-white" : "text-dark-900"
                          }`}
                        >
                          {customer.company_name}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            isDark ? "text-silver-300" : "text-gray-700"
                          }`}
                        >
                          {customer.email || "-"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            isDark ? "text-silver-300" : "text-gray-700"
                          }`}
                        >
                          {customer.phone || "-"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            isDark ? "text-silver-300" : "text-gray-700"
                          }`}
                        >
                          {getUserName(customer.assigned_sales_person)}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            isDark ? "text-silver-300" : "text-gray-700"
                          }`}
                        >
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              customer.status === "Active"
                                ? isDark
                                  ? "bg-green-900/40 text-green-300"
                                  : "bg-green-100 text-green-800"
                                : isDark
                                ? "bg-red-900/40 text-red-300"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {customer.status || "-"}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm`}>
                          <div className="flex items-center space-x-2">
                            {hasPermission("customers:update") && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleEdit(customer)}
                                className={`p-2 rounded-lg transition-all ${
                                  isDark
                                    ? "bg-dark-700 text-blue-400 hover:bg-dark-600"
                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                }`}
                              >
                                <Edit2 size={16} />
                              </motion.button>
                            )}
                            {hasPermission("customers:update") && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDeleteClick(customer)}
                                className={`p-2 rounded-lg transition-all ${
                                  isDark
                                    ? "bg-dark-700 text-red-400 hover:bg-dark-600"
                                    : "bg-red-50 text-red-600 hover:bg-red-100"
                                }`}
                              >
                                <Trash2 size={16} />
                              </motion.button>
                            )}
                            {!hasPermission("customers:update") && (
                              <span
                                className={`text-xs ${
                                  isDark ? "text-gray-500" : "text-gray-400"
                                }`}
                              >
                                No actions
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {filteredCustomers.length > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  totalCount={totalCount}
                />
              </div>
            )}

            {filteredCustomers.length === 0 && !loading && (
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
                  No customers found. Create one to get started!
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDeleteCancel}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
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
                {/* Warning Icon */}
                <div className="flex items-center justify-center mb-4">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      isDark ? "bg-red-900/30" : "bg-red-100"
                    }`}
                  >
                    <AlertTriangle
                      className={`w-8 h-8 ${
                        isDark ? "text-red-400" : "text-red-600"
                      }`}
                    />
                  </div>
                </div>

                {/* Title */}
                <h3
                  className={`text-xl font-bold text-center mb-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Delete Customer
                </h3>

                {/* Message */}
                <p
                  className={`text-center mb-6 ${
                    isDark ? "text-silver-400" : "text-gray-600"
                  }`}
                >
                  Are you sure you want to delete the customer{" "}
                  <span className="font-semibold text-red-500">
                    "{customerToDelete?.name_of_party}"
                  </span>
                  ? This action cannot be undone.
                </p>

                {/* Buttons */}
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeleteCancel}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
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
                    className="flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-300 bg-red-600 text-white hover:bg-red-700"
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
  );
}
