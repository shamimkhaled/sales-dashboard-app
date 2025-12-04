import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  Plus,
  Grid,
  List,
  Search,
  X,
  Edit2,
  Trash2,
  Eye,
  FileUp,
  FileDown,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorAlert from "../components/ErrorAlert";
import Pagination from "../components/Pagination";
import { billService } from "../services/billService";
import { customerService } from "../services/customerService";
import { packageService } from "../services/packageService";

// TODO: Future RBAC Implementation
// - Add role-based access control for different user types (super admin, admin, user)
// - Implement menu access restrictions based on user roles
// - Add authentication middleware to protect routes
// - Create user management system with role assignment
// - Add audit logging for data modifications
// - Implement permission-based UI component visibility

export default function DataEntry() {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { hasPermission } = useAuth();
  const [viewMode, setViewMode] = useState("table");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("");
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fileType, setFileType] = useState("excel");
  const [expandedRow, setExpandedRow] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingBill, setViewingBill] = useState(null);
  const [selectedCustomerType, setSelectedCustomerType] = useState("");
  const [formCustomerTypeFilter, setFormCustomerTypeFilter] = useState("");
  const [packages, setPackages] = useState([]);
  const [bandwidthPackageRows, setBandwidthPackageRows] = useState([
    { id: 1, packageId: "", mbps: "", unitPrice: "", total: "" }
  ]);
  const [channelPartnerPackageRows, setChannelPartnerPackageRows] = useState([
    { id: 1, packageId: "", mbps: "", unitPrice: "", total: "", kloudPercent: "", clientPercent: "" }
  ]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [formData, setFormData] = useState({
    customer_id: "",
    type: "",
    nttn_cap: "",
    nttn_com: "",
    active_date: "",
    billing_date: "",
    termination_date: "",
    connection_type: "",
    connected_pop: "",
    iig_qt: "",
    iig_qt_price: "",
    igt_qt_total: "",
    fna: "",
    fna_price: "",
    fna_total: "",
    ggc: "",
    ggc_price: "",
    ggc_total: "",
    cdn: "",
    cdn_price: "",
    cdn_total: "",
    bdix: "",
    bdix_price: "",
    bdix_total: "",
    baishan: "",
    baishan_price: "",
    baishan_total: "",
    total_bill: "",
    total_received: "",
    total_due: "",
    discount: "",
    remarks: "",
    status: "Active",
  });

  useEffect(() => {
    fetchBills();
  }, [currentPage, pageSize, searchTerm, statusFilter, monthFilter]);

  useEffect(() => {
    fetchCustomers();
    fetchSalesUsers();
    fetchPackages();
  }, []);

  // Helper function to format customer type for display
  const formatCustomerType = (type) => {
    const typeMap = {
      'soho': 'Home/SOHO',
      'bw': 'Bandwidth',
      'channel_partner': 'Channel Partner'
    };
    return typeMap[type] || type;
  };

  const fetchSalesUsers = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "/api";
      const response = await fetch(`${API_URL}/customers/kam/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch KAM list");
      }

      const data = await response.json();
      let users = [];
      if (Array.isArray(data)) {
        users = data;
      } else if (data?.data && Array.isArray(data.data)) {
        users = data.data;
      } else if (data?.results && Array.isArray(data.results)) {
        users = data.results;
      }
      setSalesUsers(users);
    } catch (err) {
      console.error("Failed to fetch sales users:", err);
      setSalesUsers([]);
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        page_size: pageSize,
        search: searchTerm,
      };

      // If month or status filter is applied, fetch all data for client-side filtering
      const hasClientFilter = monthFilter || statusFilter;
      if (hasClientFilter) {
        params.page_size = 10000; // Large number to get all data
        params.page = 1;
      }

      console.log("Fetching bills with params:", params);
      const response = await billService.getAllBills(params);

      // Handle Django REST Framework paginated response
      let billsData = [];
      let totalCountValue = 0;

      if (Array.isArray(response)) {
        billsData = response;
        totalCountValue = response.length;
      } else if (response && Array.isArray(response.results)) {
        // DRF paginated response format: {count, next, previous, results}
        billsData = response.results;
        totalCountValue = response.count || 0;
      } else if (response && Array.isArray(response.data)) {
        billsData = response.data;
        if (response.pagination) {
          totalCountValue =
            response.pagination.totalCount || response.pagination.total || 0;
        } else {
          totalCountValue = response.data.length;
        }
      } else {
        billsData = [];
        console.warn("Unexpected bills response format:", response);
      }

      // Apply client-side filtering for month and status if needed
      if (hasClientFilter) {
        billsData = billsData.filter((bill) => {
          // Month filter
          let monthMatch = true;
          if (monthFilter) {
            if (!bill.billing_date) return false;
            const date = new Date(bill.billing_date);
            const billMonth = (date.getMonth() + 1).toString().padStart(2, "0");
            monthMatch = billMonth === monthFilter;
          }

          // Status filter
          const statusMatch = !statusFilter || bill.status === statusFilter;

          return monthMatch && statusMatch;
        });
        totalCountValue = billsData.length;
      }

      // Apply pagination for client-side filtered data
      if (hasClientFilter) {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        setBills(billsData.slice(startIndex, endIndex));
      } else {
        setBills(billsData);
      }

      setTotalCount(totalCountValue);
      setTotalPages(Math.ceil(totalCountValue / pageSize));
    } catch (err) {
      setError(err.message || "Failed to fetch bills");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customerService.getAllCustomers();
      // Handle Django REST Framework paginated response
      if (Array.isArray(response)) {
        setCustomers(response);
      } else if (response && Array.isArray(response.results)) {
        // DRF paginated response format
        setCustomers(response.results);
      } else if (response && Array.isArray(response.data)) {
        setCustomers(response.data);
      } else {
        setCustomers([]);
        console.warn("Unexpected customers response format:", response);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setCustomers([]); // Set empty array on error
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await packageService.getAllPackages({ type: 'bw' });
      // Handle Django REST Framework paginated response
      if (Array.isArray(response)) {
        setPackages(response);
      } else if (response && Array.isArray(response.results)) {
        setPackages(response.results);
      } else if (response && Array.isArray(response.data)) {
        setPackages(response.data);
      } else {
        setPackages([]);
        console.warn("Unexpected packages response format:", response);
      }
    } catch (err) {
      console.error("Failed to fetch packages:", err);
      setPackages([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If form customer type filter is changed
    if (name === 'form_customer_type_filter') {
      setFormCustomerTypeFilter(value);
      // Reset customer selection when customer type changes
      setFormData((prev) => ({
        ...prev,
        customer_id: "",
        kam_name: ""
      }));
      setSelectedCustomerType("");
      return;
    }
    
    // If customer is selected, find their type and KAM name
    if (name === 'customer_id' && value) {
      const selectedCustomer = customers.find(c => c.id === parseInt(value));
      
      if (selectedCustomer) {
        setSelectedCustomerType(selectedCustomer.customer_type || "");
        
        // Get KAM name from salesUsers using kam_id
        const kamId = selectedCustomer.kam_id || selectedCustomer.assigned_sales_person || selectedCustomer.kam;
        
        let kamName = "";
        if (kamId) {
          const kamUser = salesUsers.find(u => u.id === parseInt(kamId));
          kamName = kamUser?.kam_name || kamUser?.name || kamUser?.username || "";
        }
        
        // Auto-populate KAM name from customer data
        setFormData((prev) => ({
          ...prev,
          customer_id: value,
          kam_name: kamName
        }));
        return; // Return early since we've already updated formData
      }
    }
    
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Calculate totals
      if (name === 'iig_qt' || name === 'iig_qt_price') {
        newData.igt_qt_total = (parseFloat(newData.iig_qt) || 0) * (parseFloat(newData.iig_qt_price) || 0);
      }
      if (name === 'fna' || name === 'fna_price') {
        newData.fna_total = (parseFloat(newData.fna) || 0) * (parseFloat(newData.fna_price) || 0);
      }
      if (name === 'ggc' || name === 'ggc_price') {
        newData.ggc_total = (parseFloat(newData.ggc) || 0) * (parseFloat(newData.ggc_price) || 0);
      }
      if (name === 'cdn' || name === 'cdn_price') {
        newData.cdn_total = (parseFloat(newData.cdn) || 0) * (parseFloat(newData.cdn_price) || 0);
      }
      if (name === 'bdix' || name === 'bdix_price') {
        newData.bdix_total = (parseFloat(newData.bdix) || 0) * (parseFloat(newData.bdix_price) || 0);
      }
      if (name === 'baishan' || name === 'baishan_price') {
        newData.baishan_total = (parseFloat(newData.baishan) || 0) * (parseFloat(newData.baishan_price) || 0);
      }

      return newData;
    });
  };

  // Handle bandwidth package row changes
  const handleBandwidthPackageChange = (rowId, field, value) => {
    setBandwidthPackageRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const updatedRow = { ...row, [field]: value };
          // Calculate total when mbps or unitPrice changes
          if (field === "mbps" || field === "unitPrice") {
            const mbps = parseFloat(field === "mbps" ? value : row.mbps) || 0;
            const unitPrice = parseFloat(field === "unitPrice" ? value : row.unitPrice) || 0;
            updatedRow.total = (mbps * unitPrice).toFixed(2);
          }
          return updatedRow;
        }
        return row;
      })
    );
  };

  // Add new bandwidth package row
  const addBandwidthPackageRow = () => {
    const newId = Math.max(...bandwidthPackageRows.map((r) => r.id), 0) + 1;
    setBandwidthPackageRows((prev) => [
      ...prev,
      { id: newId, packageId: "", mbps: "", unitPrice: "", total: "" }
    ]);
  };

  // Remove bandwidth package row
  const removeBandwidthPackageRow = (rowId) => {
    if (bandwidthPackageRows.length > 1) {
      setBandwidthPackageRows((prev) => prev.filter((row) => row.id !== rowId));
    }
  };

  // Handle channel partner package row changes
  const handleChannelPartnerPackageChange = (rowId, field, value) => {
    setChannelPartnerPackageRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const updatedRow = { ...row, [field]: value };
          // Calculate total when mbps or unitPrice changes
          if (field === "mbps" || field === "unitPrice") {
            const mbps = parseFloat(field === "mbps" ? value : row.mbps) || 0;
            const unitPrice = parseFloat(field === "unitPrice" ? value : row.unitPrice) || 0;
            updatedRow.total = (mbps * unitPrice).toFixed(2);
          }
          // Calculate complementary percentage when kloudPercent or clientPercent changes
          if (field === "kloudPercent") {
            const kloud = parseFloat(value) || 0;
            updatedRow.clientPercent = kloud > 0 ? (100 - kloud).toFixed(2) : "";
          }
          if (field === "clientPercent") {
            const client = parseFloat(value) || 0;
            updatedRow.kloudPercent = client > 0 ? (100 - client).toFixed(2) : "";
          }
          return updatedRow;
        }
        return row;
      })
    );
  };

  // Add new channel partner package row
  const addChannelPartnerPackageRow = () => {
    const newId = Math.max(...channelPartnerPackageRows.map((r) => r.id), 0) + 1;
    setChannelPartnerPackageRows((prev) => [
      ...prev,
      { id: newId, packageId: "", mbps: "", unitPrice: "", total: "", kloudPercent: "", clientPercent: "" }
    ]);
  };

  // Remove channel partner package row
  const removeChannelPartnerPackageRow = (rowId) => {
    if (channelPartnerPackageRows.length > 1) {
      setChannelPartnerPackageRows((prev) => prev.filter((row) => row.id !== rowId));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setValidationErrors({});
      setError(null);

      // Filter out only the bill-specific fields (exclude customer fields from joins)
      const billData = {
        customer: parseInt(formData.customer_id) || null,
        type: formData.type || "",
        nttn_cap: formData.nttn_cap || "",
        nttn_com: formData.nttn_com || "",
        active_date: formData.active_date || null,
        billing_date: formData.billing_date || null,
        termination_date: formData.termination_date || null,
        iig_qt: parseFloat(formData.iig_qt) || 0,
        iig_qt_price: parseFloat(formData.iig_qt_price) || 0,
        igt_qt_total: parseFloat(formData.igt_qt_total) || 0,
        fna: parseFloat(formData.fna) || 0,
        fna_price: parseFloat(formData.fna_price) || 0,
        fna_total: parseFloat(formData.fna_total) || 0,
        ggc: parseFloat(formData.ggc) || 0,
        ggc_price: parseFloat(formData.ggc_price) || 0,
        ggc_total: parseFloat(formData.ggc_total) || 0,
        cdn: parseFloat(formData.cdn) || 0,
        cdn_price: parseFloat(formData.cdn_price) || 0,
        cdn_total: parseFloat(formData.cdn_total) || 0,
        bdix: parseFloat(formData.bdix) || 0,
        bdix_price: parseFloat(formData.bdix_price) || 0,
        bdix_total: parseFloat(formData.bdix_total) || 0,
        baishan: parseFloat(formData.baishan) || 0,
        baishan_price: parseFloat(formData.baishan_price) || 0,
        baishan_total: parseFloat(formData.baishan_total) || 0,
        total_bill: parseFloat(formData.total_bill) || 0,
        total_received: parseFloat(formData.total_received) || 0,
        total_due: parseFloat(formData.total_due) || 0,
        discount: parseFloat(formData.discount) || 0,
        remarks: formData.remarks || "",
        status: formData.status || "Active",
      };

      if (editingId) {
        await billService.updateBill(editingId, billData);
        showSuccess("Bill updated successfully");
      } else {
        await billService.createBill(billData);
        showSuccess("Bill created successfully");
      }
      resetForm();
      setCurrentPage(1);
      fetchBills();
    } catch (err) {
      console.error("Submit error:", err);

      let errorMessage = err.message || "Failed to save bill";

      // Check if we have validation errors from the API
      if (
        err.validationErrors &&
        Object.keys(err.validationErrors).length > 0
      ) {
        setValidationErrors(err.validationErrors);
        errorMessage = "Please fix the validation errors below";
        showError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: "",
      type: "",
      nttn_cap: "",
      nttn_com: "",
      active_date: "",
      billing_date: "",
      termination_date: "",
      connection_type: "",
      connected_pop: "",
      iig_qt: "",
      iig_qt_price: "",
      igt_qt_total: "",
      fna: "",
      fna_price: "",
      fna_total: "",
      ggc: "",
      ggc_price: "",
      ggc_total: "",
      cdn: "",
      cdn_price: "",
      cdn_total: "",
      bdix: "",
      bdix_price: "",
      bdix_total: "",
      baishan: "",
      baishan_price: "",
      baishan_total: "",
      total_bill: "",
      total_received: "",
      total_due: "",
      discount: "",
      remarks: "",
      status: "Active",
    });
    setEditingId(null);
    setShowForm(false);
    setFormCustomerTypeFilter("");
    setSelectedCustomerType("");
    setBandwidthPackageRows([
      { id: 1, packageId: "", mbps: "", unitPrice: "", total: "" }
    ]);
    setChannelPartnerPackageRows([
      { id: 1, packageId: "", mbps: "", unitPrice: "", total: "", kloudPercent: "", clientPercent: "" }
    ]);
  };

  const handleEdit = (bill) => {
    // Ensure customer_id is set correctly - handle both object and ID formats
    const customerIdValue =
      typeof bill.customer === "object" && bill.customer !== null
        ? bill.customer.id
        : bill.customer || bill.customer_id;

    setFormData({
      ...bill,
      customer_id: customerIdValue,
      type: bill.type || "",
      igt_qt_total: bill.igt_qt_total || "",
      fna_total: bill.fna_total || "",
      ggc_total: bill.ggc_total || "",
      cdn_total: bill.cdn_total || "",
      bdix_total: bill.bdix_total || "",
      baishan_total: bill.baishan_total || "",
    });
    setEditingId(bill.id);
    setShowForm(true);
  };

  const handleDeleteClick = (bill) => {
    setBillToDelete(bill);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!billToDelete || !billToDelete.id) {
      setError("Invalid bill record");
      setShowDeleteModal(false);
      return;
    }

    try {
      setShowDeleteModal(false);
      setBillToDelete(null);

      // Delete the bill
      await billService.deleteBill(billToDelete.id);

      // Show success notification
      showSuccess("Bill record has been deleted successfully");

      // Force refresh by updating the bills state immediately
      setBills((prevBills) =>
        prevBills.filter((bill) => bill.id !== billToDelete.id)
      );

      // Update total count
      setTotalCount((prevCount) => prevCount - 1);

      // Recalculate total pages
      const newTotalPages = Math.ceil((totalCount - 1) / pageSize);
      setTotalPages(newTotalPages);

      // If current page is now beyond total pages, go to last page
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else {
        // Refresh the current page data
        fetchBills();
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete bill");
      // Refresh on error to ensure data consistency
      fetchBills();
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setBillToDelete(null);
  };

  const handleViewClick = (bill) => {
    setViewingBill(bill);
    setShowViewModal(true);
  };

  const handleViewClose = () => {
    setShowViewModal(false);
    setViewingBill(null);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      const formDataToSend = new FormData();
      formDataToSend.append("file", file);

      const API_URL = import.meta.env.VITE_API_URL || "/api";
      const response = await fetch(`${API_URL}/bills/import/`, {
        method: "POST",
        body: formDataToSend,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      // Check content type to handle HTML error responses
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // If response is HTML (error page), extract error message
        const text = await response.text();
        if (!response.ok) {
          throw new Error(
            `Import failed: ${response.status} ${response.statusText}`
          );
        }
        data = {};
      }

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
        } else if (typeof data === "object" && Object.keys(data).length > 0) {
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

      // Handle success response
      const customersSuccess =
        data.data?.customers?.success || data.customers?.success || 0;
      const billsSuccess =
        data.data?.bills?.success || data.bills?.success || 0;
      const customersFailed =
        data.data?.customers?.failed || data.customers?.failed || 0;
      const billsFailed = data.data?.bills?.failed || data.bills?.failed || 0;

      showSuccess(
        `Import successful! ${customersSuccess} customers and ${billsSuccess} bills imported.${
          customersFailed > 0 || billsFailed > 0
            ? ` (${customersFailed} customers and ${billsFailed} bills failed)`
            : ""
        }`
      );

      if (data.errors && data.errors.length > 0) {
        console.error("Import errors:", data.errors);
      }

      setCurrentPage(1);
      fetchBills();
      fetchCustomers();
    } catch (err) {
      console.error("Import error:", err);
      showError(err.message || "Failed to import data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || "/api";

      // Fetch all bills data
      const response = await fetch(`${API_URL}/bills/?page_size=10000`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bills data");
      }

      const data = await response.json();
      const billsData = data.results || data.data || [];

      // Define CSV headers matching backend fields
      const headers = [
        "id",
        "customer",
        "customer_details",
        "nttn_cap",
        "nttn_com",
        "active_date",
        "billing_date",
        "termination_date",
        "iig_qt",
        "iig_qt_price",
        "fna",
        "fna_price",
        "ggc",
        "ggc_price",
        "cdn",
        "cdn_price",
        "bdix",
        "bdix_price",
        "baishan",
        "baishan_price",
        "total_bill",
        "total_received",
        "total_due",
        "discount",
        "status",
        "remarks",
        "created_at",
        "updated_at",
      ];

      // Convert bills data to CSV rows
      const rows = billsData.map((bill) => [
        bill.id || "",
        bill.customer || "",
        bill.customer_details || "",
        bill.nttn_cap || "",
        bill.nttn_com || "",
        bill.active_date || "",
        bill.billing_date || "",
        bill.termination_date || "",
        bill.iig_qt || "",
        bill.iig_qt_price || "",
        bill.fna || "",
        bill.fna_price || "",
        bill.ggc || "",
        bill.ggc_price || "",
        bill.cdn || "",
        bill.cdn_price || "",
        bill.bdix || "",
        bill.bdix_price || "",
        bill.baishan || "",
        bill.baishan_price || "",
        bill.total_bill || "",
        bill.total_received || "",
        bill.total_due || "",
        bill.discount || "",
        bill.status || "",
        bill.remarks || "",
        bill.created_at || "",
        bill.updated_at || "",
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
      a.download = "bills.csv";
      a.click();
      window.URL.revokeObjectURL(url);

      setSuccess("Bills exported successfully as CSV");
    } catch (err) {
      setError(err.message || "Failed to export bills");
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || `Customer #${customerId}`;
  };

  const getCustomerDetails = (bill) => {
    // If customer_details is already populated from backend, use it
    if (bill.customer_details) {
      return bill.customer_details;
    }

    // Fallback: find customer from customers array using customer_id
    const customerId = bill.customer || bill.customer_id;
    if (customerId) {
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        return {
          id: customer.id,
          name: customer.name,
          company_name: customer.company_name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        };
      }
    }

    // Return empty object if no customer found
    return {
      name: "N/A",
      company_name: "-",
      email: "-",
      phone: "-",
      address: "-",
    };
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const getFieldClassName = (fieldName) => {
    const hasError = validationErrors[fieldName];
    return `w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
      hasError
        ? isDark
          ? "bg-dark-700 border-red-500 text-white focus:border-red-500"
          : "bg-white border-red-500 text-dark-900 focus:border-red-500"
        : isDark
        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
    } focus:outline-none`;
  };

  const renderFieldError = (fieldName) => {
    if (validationErrors[fieldName]) {
      return (
        <p className="text-red-500 text-xs mt-1">
          {validationErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading && bills.length === 0) return <LoadingSpinner />;

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${
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
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1
                className={`text-3xl sm:text-4xl font-serif font-bold ${
                  isDark ? "text-white" : "text-dark-900"
                }`}
              >
                Bill Records
              </h1>
              <p
                className={`mt-2 ${
                  isDark ? "text-silver-400" : "text-gray-600"
                }`}
              >
                Manage billing records with complete customer information
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {hasPermission("bills:import") && (
                <label className="relative cursor-pointer px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg">
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
              {hasPermission("bills:export") && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg"
                >
                  <FileDown size={20} />
                  <span>Export CSV</span>
                </motion.button>
              )}
              {hasPermission("bills:create") && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg"
                >
                  <Plus size={20} />
                  <span>New Bill</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="h-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <ErrorAlert message={error} onClose={() => setError(null)} />
          )}
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

          {/* Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`mb-8 rounded-2xl transition-all duration-300 overflow-hidden ${
                  isDark
                    ? "bg-dark-800 border border-dark-700"
                    : "bg-white border border-gold-100"
                }`}
              >
                <div
                  className={`sticky top-0 z-10 p-4 sm:p-6 pb-3 sm:pb-4 ${
                    isDark ? "bg-dark-800" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className={`text-xl sm:text-2xl font-serif font-bold ${
                        isDark ? "text-white" : "text-dark-900"
                      }`}
                    >
                      {editingId ? "Edit Bill" : "New Bill Record"}
                    </h2>
                    <button
                      onClick={resetForm}
                      className="p-2 rounded-lg transition-all bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-md"
                    >
                      <X size={20} className="sm:w-6 sm:h-6" />
                    </button>
                  </div>
                </div>

                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-4 sm:space-y-6"
                  >
                    {/* Entitlement Information */}
                    <div>
                      <h3 className={`text-lg font-semibold mb-4 pb-2 border-b ${
                        isDark ? "text-blue-400 border-dark-600" : "text-blue-600 border-gray-300"
                      }`}>
                        Entitlement Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Customer Type Filter - First Field */}
                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 ${
                              isDark ? "text-silver-300" : "text-gray-700"
                            }`}
                          >
                            Customer Type <span className="text-red-500">*</span>
                          </label>
                          {editingId !== null ? (
                            <input
                              type="text"
                              value={selectedCustomerType ? formatCustomerType(selectedCustomerType) : ""}
                              readOnly
                              disabled
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 cursor-not-allowed opacity-75 ${
                                isDark
                                  ? "bg-dark-700 border-dark-600 text-white"
                                  : "bg-gray-100 border-gold-200 text-dark-900"
                              } focus:outline-none`}
                            />
                          ) : (
                            <select
                              name="form_customer_type_filter"
                              value={formCustomerTypeFilter}
                              onChange={handleInputChange}
                              required
                              style={{
                                color: isDark ? '#ffffff' : '#1a1a1a',
                                backgroundColor: isDark ? '#1f2937' : '#ffffff'
                              }}
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                isDark
                                  ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                                  : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none`}
                            >
                              <option value="">Select Customer Type</option>
                              <option value="bw">Bandwidth</option>
                              <option value="channel_partner">Channel Partner</option>
                              <option value="soho">Home/SOHO</option>
                            </select>
                          )}
                        </div>

                        {/* Customer Name - Second Field (Filtered by customer type) */}
                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 ${
                              isDark ? "text-silver-300" : "text-gray-700"
                            }`}
                          >
                            Customer Name
                            {!editingId && formCustomerTypeFilter && (() => {
                              const filteredCustomers = customers.filter(c => c.customer_type === formCustomerTypeFilter);
                              return (
                                <span className={`ml-2 text-xs ${
                                  isDark ? "text-blue-400" : "text-blue-600"
                                }`}>
                                  ({filteredCustomers.length} available)
                                </span>
                              );
                            })()}
                          </label>
                          {editingId !== null ? (
                            <input
                              type="text"
                              value={
                                formData.customer_id && Array.isArray(customers)
                                  ? (() => {
                                      const customer = customers.find(
                                        (c) =>
                                          c.id === parseInt(formData.customer_id)
                                      );
                                      return customer
                                        ? (customer.customer_name || customer.name || "")
                                        : "";
                                    })()
                                  : ""
                              }
                              readOnly
                              disabled
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 cursor-not-allowed opacity-75 ${
                                isDark
                                  ? "bg-dark-700 border-dark-600 text-white"
                                  : "bg-gray-100 border-gold-200 text-dark-900"
                              } focus:outline-none`}
                            />
                          ) : (
                            <select
                              name="customer_id"
                              value={formData.customer_id}
                              onChange={handleInputChange}
                              required
                              disabled={!formCustomerTypeFilter}
                              style={{
                                color: isDark ? '#ffffff' : '#1a1a1a',
                                backgroundColor: isDark ? '#1f2937' : '#ffffff'
                              }}
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                validationErrors.customer_id
                                  ? isDark
                                    ? "bg-dark-700 border-red-500 text-white focus:border-red-500"
                                    : "bg-white border-red-500 text-dark-900 focus:border-red-500"
                                  : isDark
                                  ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                                  : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <option value="">
                                {formCustomerTypeFilter ? "Select Customer" : "Select customer type first"}
                              </option>
                              {formCustomerTypeFilter && Array.isArray(customers) && customers.length > 0 ? (
                                customers
                                  .filter(customer => customer.customer_type === formCustomerTypeFilter)
                                  .map((customer) => (
                                    <option 
                                      key={customer.id} 
                                      value={customer.id}
                                    >
                                      {customer.customer_name || customer.name || 'Unnamed Customer'}
                                    </option>
                                  ))
                              ) : formCustomerTypeFilter ? (
                                <option value="" disabled>No customers available for this type</option>
                              ) : null}
                            </select>
                          )}
                          {validationErrors.customer_id && (
                            <p className="text-red-500 text-xs mt-1">
                              {validationErrors.customer_id}
                            </p>
                          )}
                        </div>

                        {/* Display Selected Customer Company Name */}
                        {formData.customer_id && (
                          <div>
                            <label
                              className={`block text-sm font-medium mb-2 ${
                                isDark ? "text-silver-300" : "text-gray-700"
                              }`}
                            >
                              Company Name
                            </label>
                            <input
                              type="text"
                              value={
                                Array.isArray(customers)
                                  ? (() => {
                                      const customer = customers.find(
                                        (c) => c.id === parseInt(formData.customer_id)
                                      );
                                      return customer ? (customer.company_name || "") : "";
                                    })()
                                  : ""
                              }
                              readOnly
                              disabled
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 cursor-not-allowed opacity-75 ${
                                isDark
                                  ? "bg-dark-700 border-dark-600 text-white"
                                  : "bg-gray-100 border-gold-200 text-dark-900"
                              } focus:outline-none`}
                            />
                          </div>
                        )}

                        {/* KAM Name */}
                        {formData.customer_id && (
                          <div>
                            <label
                              className={`block text-sm font-medium mb-2 ${
                                isDark ? "text-silver-300" : "text-gray-700"
                              }`}
                            >
                              KAM Name
                            </label>
                            <input
                              type="text"
                              name="kam_name"
                              value={formData.kam_name}
                              readOnly
                              disabled
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 cursor-not-allowed opacity-75 ${
                                isDark
                                  ? "bg-dark-700 border-dark-600 text-white"
                                  : "bg-gray-100 border-gold-200 text-dark-900"
                              } focus:outline-none`}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bandwidth Specific Fields */}
                    {selectedCustomerType === "bw" && (
                      <div>
                        <h3 className={`text-lg font-semibold mb-4 pb-2 border-b ${
                          isDark ? "text-blue-400 border-dark-600" : "text-blue-600 border-gray-300"
                        }`}>
                          Bandwidth Information
                        </h3>

                        {/* Network Fields - Right below the title */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        
                          {/* NTTN */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              NTTN
                            </label>
                            <input
                              type="text"
                              name="nttn_com"
                              value={formData.nttn_com}
                              onChange={handleInputChange}
                              className={getFieldClassName("nttn_com")}
                            />
                            {renderFieldError("nttn_com")}
                          </div>

                          {/* Link/SCR ID */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              Link/SCR ID
                            </label>
                            <input
                              type="text"
                              name="link_scr_id"
                              value={formData.link_scr_id}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                isDark ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500" : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none`}
                            />
                          </div>

                          {/* NTTN Capacity */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              NTTN Capacity
                            </label>
                            <input
                              type="text"
                              name="nttn_cap"
                              value={formData.nttn_cap}
                              onChange={handleInputChange}
                              className={getFieldClassName("nttn_cap")}
                            />
                            {renderFieldError("nttn_cap")}
                          </div>

                          {/* NTTN USES */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              NTTN USES
                            </label>
                            <input
                              type="text"
                              name="nttn_uses"
                              value={formData.nttn_uses}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                isDark ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500" : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none`}
                            />
                          </div>
                        </div>

                        {/* Dynamic Package Rows */}
                        <div className="mb-6">
                          <label className={`block text-sm font-medium mb-3 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Package Details
                          </label>
                          <div className="space-y-3">
                            {bandwidthPackageRows.map((row, index) => (
                              <div key={row.id} className="flex flex-wrap items-center gap-3">
                                {/* Package Name Dropdown */}
                                <div className="flex-1 min-w-[150px]">
                                  <select
                                    value={row.packageId}
                                    onChange={(e) => handleBandwidthPackageChange(row.id, "packageId", e.target.value)}
                                    style={{
                                      color: isDark ? '#ffffff' : '#1a1a1a',
                                      backgroundColor: isDark ? '#1f2937' : '#ffffff'
                                    }}
                                    className={`w-full px-3 py-2 rounded-lg border transition-all duration-300 ${
                                      isDark
                                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                                    } focus:outline-none`}
                                  >
                                    <option value="">Package Name</option>
                                    {packages.filter(pkg => pkg.package_type === 'bw').map((pkg) => (
                                      <option key={pkg.id} value={pkg.id}>
                                        {pkg.package_name || pkg.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Mbps */}
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isDark ? "text-silver-300" : "text-gray-700"}`}>Mbps</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={row.mbps}
                                    onChange={(e) => handleBandwidthPackageChange(row.id, "mbps", e.target.value)}
                                    className={`w-20 px-3 py-2 rounded-lg border transition-all duration-300 ${
                                      isDark
                                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                                    } focus:outline-none`}
                                  />
                                </div>

                                {/* Unit Price */}
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isDark ? "text-silver-300" : "text-gray-700"}`}>Unit Price</span>
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    step="0.01"
                                    value={row.unitPrice}
                                    onChange={(e) => handleBandwidthPackageChange(row.id, "unitPrice", e.target.value)}
                                    className={`w-24 px-3 py-2 rounded-lg border transition-all duration-300 ${
                                      isDark
                                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                                    } focus:outline-none`}
                                  />
                                </div>

                                {/* Total */}
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isDark ? "text-silver-300" : "text-gray-700"}`}>Total</span>
                                  <input
                                    type="text"
                                    placeholder="0.00"
                                    value={row.total}
                                    readOnly
                                    className={`w-24 px-3 py-2 rounded-lg border transition-all duration-300 cursor-not-allowed ${
                                      isDark
                                        ? "bg-dark-800 border-dark-600 text-white"
                                        : "bg-gray-100 border-gold-200 text-dark-900"
                                    } focus:outline-none`}
                                  />
                                </div>

                                {/* Add/Remove Buttons */}
                                <div className="flex gap-2">
                                  {index === bandwidthPackageRows.length - 1 && (
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={addBandwidthPackageRow}
                                      className="px-3 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md"
                                    >
                                      <Plus size={18} />
                                    </motion.button>
                                  )}
                                  {bandwidthPackageRows.length > 1 && (
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => removeBandwidthPackageRow(row.id)}
                                      className="px-3 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md"
                                    >
                                      <Trash2 size={18} />
                                    </motion.button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Channel Specific Fields */}
                    {selectedCustomerType === "channel_partner" && (
                      <div>
                        <h3 className={`text-lg font-semibold mb-4 pb-2 border-b ${
                          isDark ? "text-blue-400 border-dark-600" : "text-blue-600 border-gray-300"
                        }`}>
                          Channel Partner Information
                        </h3>
                        
                        {/* Network Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          {/* NTTN */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              NTTN
                            </label>
                            <input
                              type="text"
                              name="nttn_com"
                              value={formData.nttn_com}
                              onChange={handleInputChange}
                              className={getFieldClassName("nttn_com")}
                            />
                            {renderFieldError("nttn_com")}
                          </div>

                          {/* NTTN Capacity */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              NTTN Capacity
                            </label>
                            <input
                              type="text"
                              name="nttn_cap"
                              value={formData.nttn_cap}
                              onChange={handleInputChange}
                              className={getFieldClassName("nttn_cap")}
                            />
                            {renderFieldError("nttn_cap")}
                          </div>

                          {/* Link/SRC ID */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              Link/SRC ID
                            </label>
                            <input
                              type="text"
                              name="link_src_id"
                              value={formData.link_src_id}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                isDark ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500" : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none`}
                            />
                          </div>
                        </div>

                        {/* Dynamic Package Rows */}
                        <div className="mb-6">
                          <label className={`block text-sm font-medium mb-3 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Package Details
                          </label>
                          <div className="space-y-3">
                            {channelPartnerPackageRows.map((row, index) => (
                              <div key={row.id} className="flex flex-wrap items-center gap-3">
                                {/* Package Name Dropdown */}
                                <div className="flex-1 min-w-[150px]">
                                  <select
                                    value={row.packageId}
                                    onChange={(e) => handleChannelPartnerPackageChange(row.id, "packageId", e.target.value)}
                                    style={{
                                      color: isDark ? '#ffffff' : '#1a1a1a',
                                      backgroundColor: isDark ? '#1f2937' : '#ffffff'
                                    }}
                                    className={`w-full px-3 py-2 rounded-lg border transition-all duration-300 ${
                                      isDark
                                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                                    } focus:outline-none`}
                                  >
                                    <option value="">Package Name</option>
                                    {packages.filter(pkg => pkg.package_type === 'channel_partner').map((pkg) => (
                                      <option key={pkg.id} value={pkg.id}>
                                        {pkg.package_name || pkg.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Mbps */}
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isDark ? "text-silver-300" : "text-gray-700"}`}>Mbps</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={row.mbps}
                                    onChange={(e) => handleChannelPartnerPackageChange(row.id, "mbps", e.target.value)}
                                    className={`w-20 px-3 py-2 rounded-lg border transition-all duration-300 ${
                                      isDark
                                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                                    } focus:outline-none`}
                                  />
                                </div>

                                {/* Unit Price */}
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isDark ? "text-silver-300" : "text-gray-700"}`}>Unit Price</span>
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    step="0.01"
                                    value={row.unitPrice}
                                    onChange={(e) => handleChannelPartnerPackageChange(row.id, "unitPrice", e.target.value)}
                                    className={`w-24 px-3 py-2 rounded-lg border transition-all duration-300 ${
                                      isDark
                                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                                    } focus:outline-none`}
                                  />
                                </div>

        

                                {/* Client % */}
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isDark ? "text-silver-300" : "text-gray-700"}`}>Client %</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={row.clientPercent}
                                    onChange={(e) => handleChannelPartnerPackageChange(row.id, "clientPercent", e.target.value)}
                                    className={`w-20 px-3 py-2 rounded-lg border transition-all duration-300 ${
                                      isDark
                                        ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                                        : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                                    } focus:outline-none`}
                                  />
                                </div>

                                {/* Total */}
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isDark ? "text-silver-300" : "text-gray-700"}`}>Total</span>
                                  <input
                                    type="text"
                                    placeholder="0.00"
                                    value={row.total}
                                    readOnly
                                    className={`w-24 px-3 py-2 rounded-lg border transition-all duration-300 cursor-not-allowed ${
                                      isDark
                                        ? "bg-dark-800 border-dark-600 text-white"
                                        : "bg-gray-100 border-gold-200 text-dark-900"
                                    } focus:outline-none`}
                                  />
                                </div>

                                {/* Add/Remove Buttons */}
                                <div className="flex gap-2">
                                  {index === channelPartnerPackageRows.length - 1 && (
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={addChannelPartnerPackageRow}
                                      className="px-3 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md"
                                    >
                                      <Plus size={18} />
                                    </motion.button>
                                  )}
                                  {channelPartnerPackageRows.length > 1 && (
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => removeChannelPartnerPackageRow(row.id)}
                                      className="px-3 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md"
                                    >
                                      <Trash2 size={18} />
                                    </motion.button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Home/SOHO Specific Fields */}
                    {selectedCustomerType === "soho" && (
                      <div>
                        <h3 className={`text-lg font-semibold mb-4 pb-2 border-b ${
                          isDark ? "text-blue-400 border-dark-600" : "text-blue-600 border-gray-300"
                        }`}>
                          Home/SOHO Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Type of Client */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              Type of Client
                            </label>
                            <select
                              name="client_type"
                              value={formData.client_type}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                isDark ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500" : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none`}
                            >
                              <option value="">Select Type</option>
                              <option value="Home">Home</option>
                              <option value="Office">Office</option>
                            </select>
                          </div>

                          {/* Type of Connection */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              Type of Connection
                            </label>
                            <select
                              name="connection_type"
                              value={formData.connection_type}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                isDark ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500" : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none`}
                            >
                              <option value="">Select Type</option>
                              <option value="pppoe">pppoe</option>
                              <option value="static">static</option>
                            </select>
                          </div>

                          {/* Connected POP */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              Connected POP
                            </label>
                            <input
                              type="text"
                              name="connected_pop"
                              value={formData.connected_pop}
                              onChange={handleInputChange}
                              placeholder="Banani"
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                isDark ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500" : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none`}
                            />
                          </div>

                          {/* User ID */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              User ID
                            </label>
                            <input
                              type="text"
                              name="user_id"
                              value={formData.user_id}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                isDark ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500" : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none`}
                            />
                          </div>

                          {/* Package */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              Package
                            </label>
                            <input
                              type="text"
                              name="package_name"
                              value={formData.package_name}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                isDark ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500" : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none`}
                            />
                          </div>

                          {/* Activation Date */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              Activation Date
                            </label>
                            <input
                              type="date"
                              name="active_date"
                              value={formData.active_date}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                                isDark ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500" : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                              } focus:outline-none`}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Remarks - Common for all customer types */}
                    {selectedCustomerType && (
                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            isDark ? "text-silver-300" : "text-gray-700"
                          }`}
                        >
                          Remarks
                        </label>
                        <textarea
                          name="remarks"
                          value={formData.remarks}
                          onChange={handleInputChange}
                          rows="3"
                          placeholder="Enter any additional notes or comments"
                          className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                            isDark
                              ? "bg-dark-700 border-dark-600 text-white focus:border-gold-500"
                              : "bg-white border-gold-200 text-dark-900 focus:border-gold-500"
                          } focus:outline-none`}
                        />
                      </div>
                    )}

                    {/* Form Actions */}
                    <div className="flex gap-3 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={loading}
                        className={`flex-1 px-6 py-2 rounded-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl disabled:opacity-50`}
                      >
                        {loading
                          ? "Saving..."
                          : editingId
                          ? "Update Bill"
                          : "Create Bill"}
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search and View Toggle - Hidden when editing */}
          {!editingId && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
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
                  placeholder="Search by customer, NTTN CAP..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
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
                <select
                  value={customerTypeFilter}
                  onChange={(e) => {
                    setCustomerTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-4 py-2 pr-8 rounded-lg transition-all duration-300 appearance-none ${
                    isDark
                      ? "bg-dark-800 text-white focus:outline-none"
                      : "bg-white text-dark-900 focus:outline-none"
                  }`}
                >
                  <option value="" disabled selected>Select Customer Type</option>
                  <option value="Bandwidth">Bandwidth</option>
                  <option value="Channel">Channel</option>
                  <option value="Home/SOHO">Home/SOHO</option>
                </select>
              </div>

              <div
                className={`relative ${
                  isDark ? "bg-dark-800" : "bg-white"
                } rounded-lg border transition-all duration-300 ${
                  isDark ? "border-dark-700" : "border-gold-200"
                }`}
              >
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-4 py-2 pr-8 rounded-lg transition-all duration-300 appearance-none ${
                    isDark
                      ? "bg-dark-800 text-white focus:outline-none"
                      : "bg-white text-dark-900 focus:outline-none"
                  }`}
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div
                className={`relative ${
                  isDark ? "bg-dark-800" : "bg-white"
                } rounded-lg border transition-all duration-300 ${
                  isDark ? "border-dark-700" : "border-gold-200"
                }`}
              >
                <select
                  value={monthFilter}
                  onChange={(e) => {
                    setMonthFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-4 py-2 pr-8 rounded-lg transition-all duration-300 appearance-none ${
                    isDark
                      ? "bg-dark-800 text-white focus:outline-none"
                      : "bg-white text-dark-900 focus:outline-none"
                  }`}
                >
                  <option value="">All Months</option>
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    viewMode === "table"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                      : isDark
                      ? "bg-dark-800 text-silver-400 hover:text-blue-400"
                      : "bg-gray-200 text-gray-600 hover:text-blue-600"
                  }`}
                >
                  <List size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode("card")}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    viewMode === "card"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                      : isDark
                      ? "bg-dark-800 text-silver-400 hover:text-blue-400"
                      : "bg-gray-200 text-gray-600 hover:text-blue-600"
                  }`}
                >
                  <Grid size={20} />
                </motion.button>
              </div>
            </div>
          )}

          {/* Table View - Hidden when editing */}
          {!editingId && viewMode === "table" && (
            <motion.div
              key={`table-${currentPage}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                isDark
                  ? "bg-dark-800 border border-dark-700"
                  : "bg-white border border-gold-100"
              }`}
            >
              {/* Constrain list to its own scrollable area */}
              <div className="overflow-x-auto overflow-y-auto max-w-full max-h-[65vh]">
                <table className="min-w-[1200px] text-xs sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-white dark:bg-dark-800">
                    <tr
                      className={`border-b ${
                        isDark ? "border-dark-700" : "border-gold-100"
                      }`}
                    >
                      {/* Bandwidth specific columns */}
                      {customerTypeFilter === "Bandwidth" && (
                        <>
                          <th
                            className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                              isDark ? "text-silver-300" : "text-gray-700"
                            }`}
                          >
                            Customer Name
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            NTTN
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Link/SCR ID
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            NTTN Capacity
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            NTTN Uses
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Package Name
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Packages (Mbps)
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Price (Unit)
                          </th>
                        </>
                      )}
                      
                      {/* Channel specific columns */}
                      {customerTypeFilter === "Channel" && (
                        <>
                          <th
                            className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                              isDark ? "text-silver-300" : "text-gray-700"
                            }`}
                          >
                            Customer Name
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            NTTN
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            NTTN Capacity
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Link/SRC ID
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Package Name
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Price (Unit)
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Client %
                          </th>
                        </>
                      )}
                      
                      {/* Home/SOHO specific columns */}
                      {customerTypeFilter === "Home/SOHO" && (
                        <>
                          <th
                            className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                              isDark ? "text-silver-300" : "text-gray-700"
                            }`}
                          >
                            Customer Name
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Type of Client
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Type of BW
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Type of Connection
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Connected POP
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            User ID
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Package
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Addresses
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Contact No
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Activation Date
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            KAM
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                            Remarks
                          </th>
                        </>
                      )}
                      
                      {/* Actions column - only show when customer type is selected */}
                      {customerTypeFilter && (
                        <th
                          className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                            isDark ? "text-silver-300" : "text-gray-700"
                          }`}
                        >
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className={isDark ? "bg-dark-800" : "bg-white"}>
                    {customerTypeFilter && bills.map((bill, index) => (
                      <tr
                        key={bill.id}
                        className={`border-b transition-colors duration-300 hover:${
                          isDark ? "bg-dark-700" : "bg-gray-50"
                        } ${isDark ? "border-dark-700" : "border-gray-100"}`}
                      >
                        {/* Bandwidth specific columns */}
                        {customerTypeFilter === "Bandwidth" && (
                          <>
                            <td
                              className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                                isDark ? "text-gray-100" : "text-gray-900"
                              }`}
                            >
                              {getCustomerDetails(bill).name || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.nttn_com || bill.nttn_company || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.link_scr_id || bill.bill_number || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.nttn_cap || bill.nttn_capacity || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.nttn_uses || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.details && bill.details.length > 0 
                                ? bill.details.map(d => d.package_name).filter(Boolean).join(", ") || "-"
                                : bill.package_name || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.details && bill.details.length > 0 
                                ? bill.details.map(d => d.mbps).filter(Boolean).join(", ") || "-"
                                : bill.mbps || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm text-right whitespace-nowrap ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                              {bill.details && bill.details.length > 0 
                                ? bill.details.map(d => d.unit_price?.toLocaleString()).filter(Boolean).join(", ") || "0"
                                : bill.unit_price?.toLocaleString() || "0"}
                            </td>
                          </>
                        )}
                        
                        {/* Channel specific columns */}
                        {customerTypeFilter === "Channel" && (
                          <>
                            <td
                              className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                                isDark ? "text-gray-100" : "text-gray-900"
                              }`}
                            >
                              {getCustomerDetails(bill).name || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.nttn_com || bill.nttn_company || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.nttn_cap || bill.nttn_capacity || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.link_src_id || bill.bill_number || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.details && bill.details.length > 0 
                                ? bill.details.map(d => d.package_name).filter(Boolean).join(", ") || "-"
                                : bill.package_name || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm text-right whitespace-nowrap ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                              {bill.details && bill.details.length > 0 
                                ? bill.details.map(d => d.unit_price?.toLocaleString()).filter(Boolean).join(", ") || "0"
                                : bill.unit_price?.toLocaleString() || "0"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.details && bill.details.length > 0 
                                ? bill.details.map(d => d.custom_mac_percentage_share || d.client_percentage).filter(Boolean).join(", ") || "-"
                                : bill.client_percentage || "-"}
                            </td>
                          </>
                        )}
                        
                        {/* Home/SOHO specific columns */}
                        {customerTypeFilter === "Home/SOHO" && (
                          <>
                            <td
                              className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                                isDark ? "text-gray-100" : "text-gray-900"
                              }`}
                            >
                              {getCustomerDetails(bill).name || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.client_type || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.type || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.connection_type || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.connected_pop || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.user_id || bill.bill_number || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.package_name || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm max-w-xs truncate ${isDark ? "text-silver-300" : "text-gray-700"}`} title={getCustomerDetails(bill).address || "-"}>
                              {getCustomerDetails(bill).address || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {getCustomerDetails(bill).phone || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-400" : "text-gray-600"}`}>
                              {bill.active_date ? new Date(bill.active_date).toLocaleDateString() : "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {getCustomerDetails(bill).kam_name || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm max-w-xs truncate ${isDark ? "text-silver-300" : "text-gray-700"}`} title={bill.remarks || "-"}>
                              {bill.remarks || "-"}
                            </td>
                          </>
                        )}
                        
                        {/* Default columns when no specific type is selected */}
                        {!customerTypeFilter && (
                          <>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap`}>
                              <button
                                onClick={() => handleViewClick(bill)}
                                className={`font-medium underline decoration-dotted underline-offset-2 transition-colors duration-200 hover:no-underline ${
                                  isDark 
                                    ? "text-blue-400 hover:text-blue-300" 
                                    : "text-blue-600 hover:text-blue-700"
                                }`}
                              >
                                {bill.bill_number || "-"}
                              </button>
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-400" : "text-gray-600"}`}>
                              {bill.active_date ? new Date(bill.active_date).toLocaleDateString() : "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                              {bill.total_bill?.toLocaleString() || "0"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.nttn_com || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.nttn_cap || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.type || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.connection_type || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.connected_pop || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-400" : "text-gray-600"}`}>
                              {bill.billing_date ? new Date(bill.billing_date).toLocaleDateString() : "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm max-w-xs truncate ${isDark ? "text-silver-300" : "text-gray-700"}`} title={bill.remarks || "-"}>
                              {bill.remarks || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.created_by_details?.username || bill.created_by || "-"}
                            </td>
                            <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${isDark ? "text-silver-300" : "text-gray-700"}`}>
                              {bill.updated_by_details?.username || bill.updated_by || "-"}
                            </td>
                          </>
                        )}
                        
                        {/* Actions Column - Always visible */}
                        <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm`}>
                          <div className="flex items-center space-x-1">
                            {hasPermission("bills:update") && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleEdit(bill)}
                                className={`p-1 sm:p-2 rounded-lg transition-all ${
                                  isDark
                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500"
                                    : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500"
                                }`}
                              >
                                <Edit2 size={14} />
                              </motion.button>
                            )}
                            {hasPermission("bills:update") && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDeleteClick(bill)}
                                className={`p-1 sm:p-2 rounded-lg transition-all ${
                                  isDark
                                    ? "bg-dark-700 text-red-400 hover:bg-dark-600"
                                    : "bg-red-50 text-red-600 hover:bg-red-100"
                                }`}
                              >
                                <Trash2 size={14} />
                              </motion.button>
                            )}
                            {!hasPermission("bills:update") && (
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
            </motion.div>
          )}

          {/* Pagination */}
          {!editingId && viewMode === "table" && bills.length > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalCount={totalCount}
              />
            </div>
          )}

          {/* Grid View - Hidden when editing */}
          {!editingId && viewMode === "card" && (
            <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-max"
              >
                {bills.map((bill) => (
                  <motion.div
                    key={bill.id}
                    variants={itemVariants}
                    className={`rounded-2xl p-6 transition-all duration-300 ${
                      isDark
                        ? "bg-dark-800 border border-dark-700 hover:border-blue-500"
                        : "bg-white border border-gray-100 hover:border-blue-500"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3
                          className={`text-lg font-semibold ${
                            isDark ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          {getCustomerDetails(bill).name}
                        </h3>
                        <p
                          className={`text-sm ${
                            isDark ? "text-silver-400" : "text-gray-600"
                          }`}
                        >
                          Company: {getCustomerDetails(bill).company_name}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          bill.status === "Active"
                            ? isDark
                              ? "bg-green-900/30 text-green-400"
                              : "bg-green-100 text-green-700"
                            : isDark
                            ? "bg-red-900/30 text-red-400"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {bill.status}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="space-y-3 mb-4">
                      {/* Contact Info */}
                      {getCustomerDetails(bill).phone &&
                        getCustomerDetails(bill).phone !== "-" && (
                          <div>
                            <p
                              className={`text-xs font-medium ${
                                isDark ? "text-silver-400" : "text-gray-600"
                              }`}
                            >
                              Phone
                            </p>
                            <p
                              className={`text-sm ${
                                isDark ? "text-silver-300" : "text-gray-700"
                              }`}
                            >
                              {getCustomerDetails(bill).phone}
                            </p>
                          </div>
                        )}

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-2">
                        {bill.active_date && (
                          <div>
                            <p
                              className={`text-xs font-medium ${
                                isDark ? "text-silver-400" : "text-gray-600"
                              }`}
                            >
                              Active
                            </p>
                            <p
                              className={`text-sm ${
                                isDark ? "text-silver-300" : "text-gray-700"
                              }`}
                            >
                              {new Date(bill.active_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {bill.billing_date && (
                          <div>
                            <p
                              className={`text-xs font-medium ${
                                isDark ? "text-silver-400" : "text-gray-600"
                              }`}
                            >
                              Billing
                            </p>
                            <p
                              className={`text-sm ${
                                isDark ? "text-silver-300" : "text-gray-700"
                              }`}
                            >
                              {new Date(bill.billing_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Financial Summary */}
                      <div
                        className={`rounded-lg p-3 ${
                          isDark ? "bg-dark-700" : "bg-blue-50"
                        }`}
                      >
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p
                              className={`text-xs font-medium ${
                                isDark ? "text-silver-400" : "text-gray-600"
                              }`}
                            >
                              Total Bill
                            </p>
                            <p
                              className={`text-sm font-semibold ${
                                isDark ? "text-blue-400" : "text-blue-600"
                              }`}
                            >
                              {bill.total_bill?.toLocaleString() || "0"}
                            </p>
                          </div>
                          <div>
                            <p
                              className={`text-xs font-medium ${
                                isDark ? "text-silver-400" : "text-gray-600"
                              }`}
                            >
                              Received
                            </p>
                            <p
                              className={`text-sm font-semibold ${
                                isDark ? "text-green-400" : "text-green-600"
                              }`}
                            >
                              {bill.total_received?.toLocaleString() || "0"}
                            </p>
                          </div>
                          <div>
                            <p
                              className={`text-xs font-medium ${
                                isDark ? "text-silver-400" : "text-gray-600"
                              }`}
                            >
                              Due
                            </p>
                            <p
                              className={`text-sm font-semibold ${
                                isDark ? "text-red-400" : "text-red-600"
                              }`}
                            >
                              {bill.total_due?.toLocaleString() || "0"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Services */}
                      {(bill.iig_qt_price > 0 ||
                        bill.fna_price > 0 ||
                        bill.ggc_price > 0 ||
                        bill.cdn_price > 0 ||
                        bill.bdix_price > 0 ||
                        bill.baishan_price > 0) && (
                        <div>
                          <p
                            className={`text-xs font-medium mb-2 ${
                              isDark ? "text-silver-400" : "text-gray-600"
                            }`}
                          >
                            Services
                          </p>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {bill.iig_qt_price > 0 && (
                              <span
                                className={`${
                                  isDark ? "text-silver-300" : "text-gray-700"
                                }`}
                              >
                                IIG-QT: {bill.iig_qt_price}
                              </span>
                            )}
                            {bill.fna_price > 0 && (
                              <span
                                className={`${
                                  isDark ? "text-silver-300" : "text-gray-700"
                                }`}
                              >
                                FNA: {bill.fna_price}
                              </span>
                            )}
                            {bill.ggc_price > 0 && (
                              <span
                                className={`${
                                  isDark ? "text-silver-300" : "text-gray-700"
                                }`}
                              >
                                GGC: {bill.ggc_price}
                              </span>
                            )}
                            {bill.cdn_price > 0 && (
                              <span
                                className={`${
                                  isDark ? "text-silver-300" : "text-gray-700"
                                }`}
                              >
                                CDN: {bill.cdn_price}
                              </span>
                            )}
                            {bill.bdix_price > 0 && (
                              <span
                                className={`${
                                  isDark ? "text-silver-300" : "text-gray-700"
                                }`}
                              >
                                BDIX: {bill.bdix_price}
                              </span>
                            )}
                            {bill.baishan_price > 0 && (
                              <span
                                className={`${
                                  isDark ? "text-silver-300" : "text-gray-700"
                                }`}
                              >
                                BAISHAN: {bill.baishan_price}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer - Actions */}
                    <div
                      className="flex items-center space-x-2 pt-4 border-t"
                      style={{
                        borderColor: isDark
                          ? "rgb(55, 65, 81)"
                          : "rgb(229, 231, 235)",
                      }}
                    >
                      {hasPermission("bills:update") && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEdit(bill)}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-all text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-md"
                        >
                          <Edit2 size={14} />
                          <span>Edit</span>
                        </motion.button>
                      )}
                      {hasPermission("bills:update") && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteClick(bill)}
                          className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-all text-sm ${
                            isDark
                              ? "bg-dark-700 text-red-400 hover:bg-dark-600"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </motion.button>
                      )}
                      {!hasPermission("bills:update") && (
                        <div
                          className={`flex-1 text-center text-xs ${
                            isDark ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          No actions available
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {/* Pagination for Card View */}
          {!editingId && viewMode === "card" && bills.length > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalCount={totalCount}
              />
            </div>
          )}

          {!editingId && bills.length === 0 && (
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
                No bills found. Select Customer Type or create one to get started!
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {showViewModal && viewingBill && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleViewClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className={`w-full max-w-4xl rounded-2xl p-6 shadow-2xl ${
                  isDark
                    ? "bg-dark-800 border border-dark-700"
                    : "bg-white border border-gray-200"
                } max-h-[90vh] overflow-y-auto`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className={`text-2xl font-serif font-bold ${
                      isDark ? "text-white" : "text-dark-900"
                    }`}
                  >
                    Bill Details
                  </h3>
                  <button
                    onClick={handleViewClose}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      isDark
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Bill Number - Featured */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <div className={`p-4 rounded-lg ${
                      isDark ? "bg-blue-900/20 border border-blue-800" : "bg-blue-50 border border-blue-200"
                    }`}>
                      <label className="block text-sm font-medium mb-1">
                        Bill Number
                      </label>
                      <p
                        className={`text-lg font-semibold ${
                          isDark ? "text-blue-400" : "text-blue-600"
                        }`}
                      >
                        {viewingBill.bill_number || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <h4
                      className={`text-lg font-semibold mb-3 ${
                        isDark ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      Customer Information
                    </h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Customer Name
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {getCustomerDetails(viewingBill).name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Company Name
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {getCustomerDetails(viewingBill).company_name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {getCustomerDetails(viewingBill).email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Phone
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {getCustomerDetails(viewingBill).phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Address
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {getCustomerDetails(viewingBill).address || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      KAM
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {(() => {
                        const customer = customers.find(
                          (c) =>
                            c.id ===
                            (viewingBill.customer || viewingBill.customer_id)
                        );
                        return (
                          customer?.assigned_sales_person_details?.username ||
                          "N/A"
                        );
                      })()}
                    </p>
                  </div>

                  {/* NTTN Information */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <h4
                      className={`text-lg font-semibold mb-3 mt-4 ${
                        isDark ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      NTTN Information
                    </h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      NTTN CAP
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.nttn_cap || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      NTTN COM
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.nttn_com || "N/A"}
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <h4
                      className={`text-lg font-semibold mb-3 mt-4 ${
                        isDark ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      Dates
                    </h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Active Date 
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.active_date
                        ? new Date(viewingBill.active_date).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Billing Date
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.billing_date
                        ? new Date(
                            viewingBill.billing_date
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>

                  {/* <div>
                    <label className="block text-sm font-medium mb-1">
                      Termination Date
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.termination_date
                        ? new Date(
                            viewingBill.termination_date
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div> */}

                  {/* Services */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <h4
                      className={`text-lg font-semibold mb-3 mt-4 ${
                        isDark ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      Services
                    </h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      IIG-QT
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.iig_qt || "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      IIG-QT Price
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.iig_qt_price
                        ? `BDT ${viewingBill.iig_qt_price}`
                        : "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      FNA
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.fna || "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      FNA Price
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.fna_price
                        ? `BDT ${viewingBill.fna_price}`
                        : "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      GGC
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.ggc || "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      GGC Price
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.ggc_price
                        ? `BDT ${viewingBill.ggc_price}`
                        : "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      CDN
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.cdn || "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      CDN Price
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.cdn_price
                        ? `BDT ${viewingBill.cdn_price}`
                        : "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      BDIX
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.bdix || "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      BDIX Price
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.bdix_price
                        ? `BDT ${viewingBill.bdix_price}`
                        : "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      BAISHAN
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.baishan || "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      BAISHAN Price
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.baishan_price
                        ? `BDT ${viewingBill.baishan_price}`
                        : "0"}
                    </p>
                  </div>

                  {/* Financial Summary */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <h4
                      className={`text-lg font-semibold mb-3 mt-4 ${
                        isDark ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      Financial Summary
                    </h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Total Bill
                    </label>
                    <p
                      className={`text-sm font-semibold ${
                        isDark ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      {viewingBill.total_bill
                        ? `BDT ${viewingBill.total_bill.toLocaleString()}`
                        : "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Total Received
                    </label>
                    <p
                      className={`text-sm font-semibold ${
                        isDark ? "text-green-400" : "text-green-600"
                      }`}
                    >
                      {viewingBill.total_received
                        ? `BDT ${viewingBill.total_received.toLocaleString()}`
                        : "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Total Due
                    </label>
                    <p
                      className={`text-sm font-semibold ${
                        isDark ? "text-red-400" : "text-red-600"
                      }`}
                    >
                      {viewingBill.total_due
                        ? `BDT ${viewingBill.total_due.toLocaleString()}`
                        : "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Discount
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.discount
                        ? `BDT ${viewingBill.discount.toLocaleString()}`
                        : "0"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Status
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.status || "N/A"}
                    </p>
                  </div>

                  {/* Remarks */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium mb-1">
                      Remarks
                    </label>
                    <p
                      className={`text-sm ${
                        isDark ? "text-silver-400" : "text-gray-600"
                      }`}
                    >
                      {viewingBill.remarks || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleViewClose}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      isDark
                        ? "bg-dark-700 text-gold-400 hover:bg-dark-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                  Delete Bill Record
                </h3>

                {/* Message */}
                <p
                  className={`text-center mb-6 ${
                    isDark ? "text-silver-400" : "text-gray-600"
                  }`}
                >
                  Are you sure you want to delete the bill record for{" "}
                  <span className="font-semibold text-red-500">
                    "
                    {billToDelete
                      ? getCustomerDetails(billToDelete).name
                      : "Unknown"}
                    "
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
