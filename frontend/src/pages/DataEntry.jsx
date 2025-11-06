import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Download, Plus, Grid, List, Search,
  X, Edit2, Trash2, Eye, FileUp, FileDown, ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import Pagination from '../components/Pagination';
import { billService } from '../services/billService';
import { customerService } from '../services/customerService';

// TODO: Future RBAC Implementation
// - Add role-based access control for different user types (super admin, admin, user)
// - Implement menu access restrictions based on user roles
// - Add authentication middleware to protect routes
// - Create user management system with role assignment
// - Add audit logging for data modifications
// - Implement permission-based UI component visibility

export default function DataEntry() {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState('table');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fileType, setFileType] = useState('excel');
  const [expandedRow, setExpandedRow] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [formData, setFormData] = useState({
    customer_id: '',
    nttn_cap: '',
    nttn_com: '',
    active_date: '',
    billing_date: '',
    termination_date: '',
    iig_qt: '',
    iig_qt_price: '',
    fna: '',
    fna_price: '',
    ggc: '',
    ggc_price: '',
    cdn: '',
    cdn_price: '',
    bdix: '',
    bdix_price: '',
    baishan: '',
    baishan_price: '',
    total_bill: '',
    total_received: '',
    total_due: '',
    discount: '',
    remarks: '',
    status: 'Active',
  });

  useEffect(() => {
    fetchBills();
    fetchCustomers();
  }, [currentPage, pageSize, searchTerm]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await billService.getAllBills({
        page: currentPage,
        pageSize: pageSize,
        search: searchTerm
      });
      
      if (response.data) {
        setBills(response.data);
        if (response.pagination) {
          setTotalCount(response.pagination.totalCount);
          setTotalPages(response.pagination.totalPages);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customerService.getAllCustomers();
      setCustomers(response.data || response);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingId) {
        await billService.updateBill(editingId, formData);
        setSuccess('Bill updated successfully');
      } else {
        await billService.createBill(formData);
        setSuccess('Bill created successfully');
      }
      resetForm();
      setCurrentPage(1);
      fetchBills();
    } catch (err) {
      setError(err.message || 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      nttn_cap: '',
      nttn_com: '',
      active_date: '',
      billing_date: '',
      termination_date: '',
      iig_qt: '',
      iig_qt_price: '',
      fna: '',
      fna_price: '',
      ggc: '',
      ggc_price: '',
      cdn: '',
      cdn_price: '',
      bdix: '',
      bdix_price: '',
      baishan: '',
      baishan_price: '',
      total_bill: '',
      total_received: '',
      total_due: '',
      discount: '',
      remarks: '',
      status: 'Active',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (bill) => {
    setFormData(bill);
    setEditingId(bill.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        setLoading(true);
        await billService.deleteBill(id);
        setSuccess('Bill deleted successfully');
        setCurrentPage(1);
        fetchBills();
      } catch (err) {
        setError(err.message || 'Failed to delete bill');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);

      const response = await fetch('http://localhost:5000/api/upload/import', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Import failed');
      }
      
      const result = await response.json();
      setSuccess(`Import successful! ${result.data.customers.success} customers and ${result.data.bills.success} bills imported.`);
      setCurrentPage(1);
      fetchBills();
      fetchCustomers();
    } catch (err) {
      setError(err.message || 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const endpoint = fileType === 'excel'
        ? 'http://localhost:5000/api/upload/export/bills/excel'
        : 'http://localhost:5000/api/upload/export/bills/csv';

      const response = await fetch(endpoint);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // TODO: Future Enhancement - Make filename dynamic based on current month/year
      // const currentDate = new Date();
      // const monthYear = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      a.download = fileType === 'excel' ? 'Sales-Pannel-Oct.2025.xlsx' : 'bills.csv';
      a.click();
      setSuccess('Bills exported successfully');
    } catch (err) {
      setError(err.message || 'Failed to export bills');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name_of_party || `Customer #${customerId}`;
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
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
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-dark-950' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-md border-b transition-all duration-300 ${
        isDark
          ? 'bg-dark-900/80 border-dark-700'
          : 'bg-white/80 border-gold-100'
      }`}>
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-serif font-bold ${
                isDark ? 'text-white' : 'text-dark-900'
              }`}>
                Bill Records
              </h1>
              <p className={`mt-2 ${isDark ? 'text-silver-400' : 'text-gray-600'}`}>
                Manage billing records with complete customer information
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowForm(!showForm)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  isDark
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Plus size={20} />
                <span>New Bill</span>
              </motion.button>

              <div className="flex items-center space-x-2">
                <label className={`relative cursor-pointer px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                  isDark
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}>
                  <FileUp size={20} />
                  <span>Import</span>
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>

                <div className="relative group">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      isDark
                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <FileDown size={20} />
                    <span>Export</span>
                  </motion.button>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className={`absolute right-0 mt-2 w-32 rounded-lg shadow-lg hidden group-hover:block ${
                      isDark ? 'bg-dark-800 border border-dark-700' : 'bg-white border border-gold-200'
                    }`}
                  >
                    <button
                      onClick={() => { setFileType('excel'); handleExport(); }}
                      className={`w-full text-left px-4 py-2 text-sm rounded-t-lg transition-colors ${
                        isDark ? 'hover:bg-dark-700' : 'hover:bg-gold-50'
                      }`}
                    >
                      Export as Excel
                    </button>
                    <button
                      onClick={() => { setFileType('csv'); handleExport(); }}
                      className={`w-full text-left px-4 py-2 text-sm rounded-b-lg transition-colors ${
                        isDark ? 'hover:bg-dark-700' : 'hover:bg-gold-50'
                      }`}
                    >
                      Export as CSV
                    </button>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-hidden">
          {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-lg ${
              isDark
                ? 'bg-green-900/30 border border-green-700 text-green-400'
                : 'bg-green-100 border border-green-300 text-green-700'
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
              className={`mb-8 rounded-2xl p-6 transition-all duration-300 ${
                isDark
                  ? 'bg-dark-800 border border-dark-700'
                  : 'bg-white border border-gold-100'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-serif font-bold ${
                  isDark ? 'text-white' : 'text-dark-900'
                }`}>
                  {editingId ? 'Edit Bill' : 'New Bill Record'}
                </h2>
                <button
                  onClick={resetForm}
                  className={`p-2 rounded-lg transition-all ${
                    isDark
                      ? 'bg-dark-700 text-gold-400 hover:bg-dark-600'
                      : 'bg-gold-50 text-gold-600 hover:bg-gold-100'
                  }`}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Customer Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    Customer *
                  </label>
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.serial_number} - {customer.name_of_party}
                      </option>
                    ))}
                  </select>
                </div>

                {/* NTTN Fields */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    NTTN CAP
                  </label>
                  <input
                    type="text"
                    name="nttn_cap"
                    value={formData.nttn_cap}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    NTTN COM
                  </label>
                  <input
                    type="text"
                    name="nttn_com"
                    value={formData.nttn_com}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                {/* Date Fields */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    Active Date
                  </label>
                  <input
                    type="date"
                    name="active_date"
                    value={formData.active_date}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    Billing Date
                  </label>
                  <input
                    type="date"
                    name="billing_date"
                    value={formData.billing_date}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    Termination Date
                  </label>
                  <input
                    type="date"
                    name="termination_date"
                    value={formData.termination_date}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                {/* Pricing Fields - IIG QT */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    IIG-QT
                  </label>
                  <input
                    type="number"
                    name="iig_qt"
                    value={formData.iig_qt}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    IIG-QT Price
                  </label>
                  <input
                    type="number"
                    name="iig_qt_price"
                    value={formData.iig_qt_price}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                {/* FNA */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    FNA
                  </label>
                  <input
                    type="number"
                    name="fna"
                    value={formData.fna}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    FNA Price
                  </label>
                  <input
                    type="number"
                    name="fna_price"
                    value={formData.fna_price}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                {/* GGC */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    GGC
                  </label>
                  <input
                    type="number"
                    name="ggc"
                    value={formData.ggc}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    GGC Price
                  </label>
                  <input
                    type="number"
                    name="ggc_price"
                    value={formData.ggc_price}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                {/* CDN */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    CDN
                  </label>
                  <input
                    type="number"
                    name="cdn"
                    value={formData.cdn}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    CDN Price
                  </label>
                  <input
                    type="number"
                    name="cdn_price"
                    value={formData.cdn_price}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                {/* BDIX */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    BDIX
                  </label>
                  <input
                    type="number"
                    name="bdix"
                    value={formData.bdix}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    BDIX Price
                  </label>
                  <input
                    type="number"
                    name="bdix_price"
                    value={formData.bdix_price}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                {/* BAISHAN */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    BAISHAN
                  </label>
                  <input
                    type="number"
                    name="baishan"
                    value={formData.baishan}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    BAISHAN Price
                  </label>
                  <input
                    type="number"
                    name="baishan_price"
                    value={formData.baishan_price}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                {/* Bill Summary */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    Total Bill
                  </label>
                  <input
                    type="number"
                    name="total_bill"
                    value={formData.total_bill}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    Total Received
                  </label>
                  <input
                    type="number"
                    name="total_received"
                    value={formData.total_received}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    Total Due
                  </label>
                  <input
                    type="number"
                    name="total_due"
                    value={formData.total_due}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    Discount
                  </label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-silver-300' : 'text-gray-700'
                  }`}>
                    Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    rows="2"
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 border-dark-600 text-white focus:border-gold-500'
                        : 'bg-white border-gold-200 text-dark-900 focus:border-gold-500'
                    } focus:outline-none`}
                  />
                </div>

                <div className="lg:col-span-3 flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={loading}
                    className={`flex-1 px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                      isDark
                        ? 'bg-gold-600 text-dark-900 hover:bg-gold-500 disabled:opacity-50'
                        : 'bg-gold-500 text-white hover:bg-gold-600 disabled:opacity-50'
                    }`}
                  >
                    {loading ? 'Saving...' : editingId ? 'Update Bill' : 'Create Bill'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={resetForm}
                    className={`flex-1 px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-700 text-gold-400 hover:bg-dark-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className={`flex-1 relative ${
            isDark ? 'bg-dark-800' : 'bg-white'
          } rounded-lg border transition-all duration-300 ${
            isDark ? 'border-dark-700' : 'border-gold-200'
          }`}>
            <Search className={`absolute left-3 top-3 ${
              isDark ? 'text-silver-500' : 'text-gray-400'
            }`} size={20} />
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
                  ? 'bg-dark-800 text-white placeholder-silver-500 focus:outline-none'
                  : 'bg-white text-dark-900 placeholder-gray-400 focus:outline-none'
              }`}
            />
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all duration-300 ${
                viewMode === 'table'
                  ? isDark
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600 text-white'
                  : isDark
                  ? 'bg-dark-800 text-silver-400 hover:text-blue-400'
                  : 'bg-gray-200 text-gray-600 hover:text-blue-600'
              }`}
            >
              <List size={20} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-all duration-300 ${
                viewMode === 'card'
                  ? isDark
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600 text-white'
                  : isDark
                  ? 'bg-dark-800 text-silver-400 hover:text-blue-400'
                  : 'bg-gray-200 text-gray-600 hover:text-blue-600'
              }`}
            >
              <Grid size={20} />
            </motion.button>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <motion.div
            key={`table-${currentPage}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`rounded-2xl overflow-hidden transition-all duration-300 ${
              isDark
                ? 'bg-dark-800 border border-dark-700'
                : 'bg-white border border-gold-100'
            }`}
          >
            {/* Constrain list to its own scrollable area */}
            <div className="overflow-x-auto overflow-y-auto max-w-full max-h-[65vh]">
              <table className="min-w-[2000px] text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 bg-white dark:bg-dark-800">
                  <tr className={`border-b ${isDark ? 'border-dark-700' : 'border-gold-100'}`}>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>S/L</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Name Of Party</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Address</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Email</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Proprietor</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Phone</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Link ID</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>NTTN COM</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>NTTN CAP</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Active Date</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Billing Date</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Termination</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>IIG-QT</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Price</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>FNA</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Price</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>GGC</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Price</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>CDN</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Price</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>BDIX</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Price</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>BAISHAN</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Price</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Total Bill</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Total Received</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Total Due</th>
                    <th className={`px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Discount</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Remarks</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>KAM</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Status</th>
                    <th className={`px-2 sm:px-4 py-3 text-left font-semibold whitespace-nowrap ${
                      isDark ? 'text-silver-300' : 'text-gray-700'
                    }`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={isDark ? 'bg-dark-800' : 'bg-white'}>
                  {bills.map((bill, index) => (
                    <tr
                      key={bill.id}
                      className={`border-b transition-colors duration-300 hover:${isDark ? 'bg-dark-700' : 'bg-gray-50'} ${
                        isDark ? 'border-dark-700' : 'border-gray-100'
                      }`}
                    >
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.serial_number || index + 1}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.name_of_party}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.address || '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.email || '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.proprietor_name || '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.phone_number || '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.link_id || '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.nttn_com || '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.nttn_cap || '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-400' : 'text-gray-600'
                      }`}>{bill.active_date ? new Date(bill.active_date).toLocaleDateString() : '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-400' : 'text-gray-600'
                      }`}>{bill.billing_date ? new Date(bill.billing_date).toLocaleDateString() : '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-400' : 'text-gray-600'
                      }`}>{bill.termination_date ? new Date(bill.termination_date).toLocaleDateString() : '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.iig_qt || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.iig_qt_price || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.fna || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.fna_price || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.ggc || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.ggc_price || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.cdn || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.cdn_price || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.bdix || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.bdix_price || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.baishan || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.baishan_price || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{bill.total_bill?.toLocaleString() || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-green-400' : 'text-green-600'
                      }`}>{bill.total_received?.toLocaleString() || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-right whitespace-nowrap ${
                        isDark ? 'text-red-400' : 'text-red-600'
                      }`}>{bill.total_due?.toLocaleString() || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm text-right whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.discount?.toLocaleString() || '0'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.remarks || '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.kam || '-'}</td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm`}>
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          bill.status === 'Active'
                            ? isDark
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-green-100 text-green-700'
                            : isDark
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className={`px-2 sm:px-4 py-3 text-xs sm:text-sm`}>
                        <div className="flex items-center space-x-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEdit(bill)}
                            className={`p-1 sm:p-2 rounded-lg transition-all ${
                              isDark
                                ? 'bg-dark-700 text-blue-400 hover:bg-dark-600'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            <Edit2 size={14} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(bill.id)}
                            className={`p-1 sm:p-2 rounded-lg transition-all ${
                              isDark
                                ? 'bg-dark-700 text-red-400 hover:bg-dark-600'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            <Trash2 size={14} />
                          </motion.button>
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
        {viewMode === 'table' && bills.length > 0 && (
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

        {/* Grid View */}
        {viewMode === 'card' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {bills.map((bill) => (
              <motion.div
                key={bill.id}
                variants={itemVariants}
                className={`rounded-2xl p-6 transition-all duration-300 ${
                  isDark
                    ? 'bg-dark-800 border border-dark-700 hover:border-blue-500'
                    : 'bg-white border border-gray-100 hover:border-blue-500'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {bill.name_of_party}
                    </h3>
                    <p className={`text-sm ${
                      isDark ? 'text-silver-400' : 'text-gray-600'
                    }`}>
                      S/L: {bill.serial_number || '-'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    bill.status === 'Active'
                      ? isDark
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-green-100 text-green-700'
                      : isDark
                      ? 'bg-red-900/30 text-red-400'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {bill.status}
                  </span>
                </div>

                {/* Card Body */}
                <div className="space-y-3 mb-4">
                  {/* Contact Info */}
                  {bill.phone_number && (
                    <div>
                      <p className={`text-xs font-medium ${
                        isDark ? 'text-silver-400' : 'text-gray-600'
                      }`}>Phone</p>
                      <p className={`text-sm ${
                        isDark ? 'text-silver-300' : 'text-gray-700'
                      }`}>{bill.phone_number}</p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2">
                    {bill.active_date && (
                      <div>
                        <p className={`text-xs font-medium ${
                          isDark ? 'text-silver-400' : 'text-gray-600'
                        }`}>Active</p>
                        <p className={`text-sm ${
                          isDark ? 'text-silver-300' : 'text-gray-700'
                        }`}>{new Date(bill.active_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {bill.billing_date && (
                      <div>
                        <p className={`text-xs font-medium ${
                          isDark ? 'text-silver-400' : 'text-gray-600'
                        }`}>Billing</p>
                        <p className={`text-sm ${
                          isDark ? 'text-silver-300' : 'text-gray-700'
                        }`}>{new Date(bill.billing_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Financial Summary */}
                  <div className={`rounded-lg p-3 ${
                    isDark ? 'bg-dark-700' : 'bg-blue-50'
                  }`}>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className={`text-xs font-medium ${
                          isDark ? 'text-silver-400' : 'text-gray-600'
                        }`}>Total Bill</p>
                        <p className={`text-sm font-semibold ${
                          isDark ? 'text-blue-400' : 'text-blue-600'
                        }`}>{bill.total_bill?.toLocaleString() || '0'}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${
                          isDark ? 'text-silver-400' : 'text-gray-600'
                        }`}>Received</p>
                        <p className={`text-sm font-semibold ${
                          isDark ? 'text-green-400' : 'text-green-600'
                        }`}>{bill.total_received?.toLocaleString() || '0'}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${
                          isDark ? 'text-silver-400' : 'text-gray-600'
                        }`}>Due</p>
                        <p className={`text-sm font-semibold ${
                          isDark ? 'text-red-400' : 'text-red-600'
                        }`}>{bill.total_due?.toLocaleString() || '0'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  {(bill.iig_qt_price || bill.fna_price || bill.ggc_price || bill.cdn_price || bill.bdix_price || bill.baishan_price) && (
                    <div>
                      <p className={`text-xs font-medium mb-2 ${
                        isDark ? 'text-silver-400' : 'text-gray-600'
                      }`}>Services</p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {bill.iig_qt_price > 0 && (
                          <span className={`${isDark ? 'text-silver-300' : 'text-gray-700'}`}>
                            IIG-QT: {bill.iig_qt_price}
                          </span>
                        )}
                        {bill.fna_price > 0 && (
                          <span className={`${isDark ? 'text-silver-300' : 'text-gray-700'}`}>
                            FNA: {bill.fna_price}
                          </span>
                        )}
                        {bill.ggc_price > 0 && (
                          <span className={`${isDark ? 'text-silver-300' : 'text-gray-700'}`}>
                            GGC: {bill.ggc_price}
                          </span>
                        )}
                        {bill.cdn_price > 0 && (
                          <span className={`${isDark ? 'text-silver-300' : 'text-gray-700'}`}>
                            CDN: {bill.cdn_price}
                          </span>
                        )}
                        {bill.bdix_price > 0 && (
                          <span className={`${isDark ? 'text-silver-300' : 'text-gray-700'}`}>
                            BDIX: {bill.bdix_price}
                          </span>
                        )}
                        {bill.baishan_price > 0 && (
                          <span className={`${isDark ? 'text-silver-300' : 'text-gray-700'}`}>
                            BAISHAN: {bill.baishan_price}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer - Actions */}
                <div className="flex items-center space-x-2 pt-4 border-t" style={{
                  borderColor: isDark ? 'rgb(55, 65, 81)' : 'rgb(229, 231, 235)'
                }}>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEdit(bill)}
                    className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-all text-sm ${
                      isDark
                        ? 'bg-dark-700 text-blue-400 hover:bg-dark-600'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <Edit2 size={14} />
                    <span>Edit</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(bill.id)}
                    className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-all text-sm ${
                      isDark
                        ? 'bg-dark-700 text-red-400 hover:bg-dark-600'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination for Card View */}
        {viewMode === 'card' && bills.length > 0 && (
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

        {bills.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center py-12 rounded-2xl ${
              isDark
                ? 'bg-dark-800 border border-dark-700'
                : 'bg-white border border-gold-100'
            }`}
          >
            <p className={`text-lg ${
              isDark ? 'text-silver-400' : 'text-gray-600'
            }`}>
              No bills found. Create one to get started!
            </p>
          </motion.div>
        )}
        </div>
      </div>
    </div>
  );
}
