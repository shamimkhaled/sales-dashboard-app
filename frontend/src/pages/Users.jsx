import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users as UsersIcon, Search, Edit2, Trash2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useNotification } from "../context/NotificationContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorAlert from "../components/ErrorAlert";
import Pagination from "../components/Pagination";
import { userService } from "../services/userService";

export default function Users() {
  const { isDark } = useTheme();
  const { showError, showSuccess } = useNotification();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getUsers({
        page: currentPage,
        pageSize,
        search: searchTerm || undefined,
      });

      // Debug: log raw API response to help diagnose data shape
      // (remove this in production)
      // eslint-disable-next-line no-console
      console.debug("GET /api/users/ response:", response);

      // The API returns an object like { data: [...], pagination: {...} }
      if (response?.data) {
        setUsers(response.data);
      } else if (Array.isArray(response)) {
        // Fallback if API returns array directly
        setUsers(response);
      } else if (response) {
        // Some APIs may return {results: [...]} or similar
        if (Array.isArray(response.results)) setUsers(response.results);
        else setUsers([]);
      }

      if (response?.pagination) {
        setTotalCount(response.pagination.totalCount || 0);
        setTotalPages(response.pagination.totalPages || 0);
      } else {
        // Fallback: compute from totalCount if provided or from array
        setTotalCount(
          response?.totalCount ||
            (Array.isArray(response)
              ? response.length
              : response?.data?.length || 0)
        );
      }
    } catch (err) {
      const msg = err?.message || "Failed to fetch users";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading && users.length === 0) return <LoadingSpinner />;

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
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1
                className={`text-3xl font-serif font-bold ${
                  isDark ? "text-white" : "text-dark-900"
                }`}
              >
                User Management
              </h1>
              <p
                className={`mt-2 ${
                  isDark ? "text-silver-400" : "text-gray-600"
                }`}
              >
                View and manage application users
              </p>
            </div>
            <div className="w-80">
              <div
                className={`relative ${
                  isDark ? "bg-dark-800" : "bg-white"
                } rounded-lg border transition-all duration-300 ${
                  isDark ? "border-dark-700" : "border-gold-200"
                }`}
              >
                <Search
                  className={`absolute left-3 top-3 ${
                    isDark ? "text-silver-500" : "text-gray-400"
                  }`}
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg transition-all duration-300 ${
                    isDark
                      ? "bg-dark-800 text-white placeholder-silver-500"
                      : "bg-white text-dark-900 placeholder-gray-400"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

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
                    ID
                  </th>
                  <th
                    className={`px-6 py-4 text-left text-sm font-semibold ${
                      isDark ? "text-silver-300" : "text-gray-700"
                    }`}
                  >
                    Username
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
                    Role
                  </th>
                  <th
                    className={`px-6 py-4 text-left text-sm font-semibold ${
                      isDark ? "text-silver-300" : "text-gray-700"
                    }`}
                  >
                    Active
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
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b transition-colors duration-300 hover:${
                      isDark ? "bg-dark-700" : "bg-gold-50"
                    } ${isDark ? "border-dark-700" : "border-gold-100"}`}
                  >
                    <td
                      className={`px-6 py-4 text-sm font-medium ${
                        isDark ? "text-white" : "text-dark-900"
                      }`}
                    >
                      {u.id}
                    </td>
                    <td
                      className={`px-6 py-4 text-sm font-medium ${
                        isDark ? "text-white" : "text-dark-900"
                      }`}
                    >
                      {u.username}
                    </td>
                    <td
                      className={`px-6 py-4 text-sm ${
                        isDark ? "text-silver-300" : "text-gray-700"
                      }`}
                    >
                      {u.email || "-"}
                    </td>
                    <td
                      className={`px-6 py-4 text-sm ${
                        isDark ? "text-silver-300" : "text-gray-700"
                      }`}
                    >
                      {u.role || u.roles || "-"}
                    </td>
                    <td className={`px-6 py-4 text-sm`}>
                      {u.is_active ? "Yes" : "No"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className={`p-2 rounded-lg transition-all ${
                            isDark
                              ? "bg-dark-700 text-blue-400 hover:bg-dark-600"
                              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                          }`}
                        >
                          <Edit2 size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className={`p-2 rounded-lg transition-all ${
                            isDark
                              ? "bg-dark-700 text-red-400 hover:bg-dark-600"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
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
        {users.length > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={
                totalPages || Math.ceil((totalCount || users.length) / pageSize)
              }
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalCount={totalCount}
            />
          </div>
        )}

        {users.length === 0 && !loading && (
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
              No users found.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
