import { useEffect, useState } from 'react';
import { FaUsers, FaMoneyBillWave, FaChartPie, FaPercent, FaCalendarAlt } from 'react-icons/fa';
import dashboardService from '../services/dashboardService';
import KPICard from '../components/KPICard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';

function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getOverview();
      setOverview(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorAlert
          message={error}
          onClose={() => setError(null)}
        />
        <button
          onClick={fetchOverview}
          className="btn-luxury mt-4"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center animate-fade-in-up">
        <h1 className="text-gradient-luxury mb-2">Sales Analytics Dashboard</h1>
        <p className="text-gray-400 text-lg">Real-time insights into your business performance</p>
      </div>

      {/* KPI Cards */}
      <div className="flex flex-wrap -mx-3">
        {overview && (
          <>
            <KPICard
              title="Total Customers"
              value={overview.totalCustomers?.toLocaleString() || '0'}
              icon={FaUsers}
              color="gold"
            />
            <KPICard
              title="Total Billed"
              value={`৳${overview.totalBilled?.toLocaleString() || '0'}`}
              icon={FaMoneyBillWave}
              color="success"
            />
            <KPICard
              title="Total Due"
              value={`৳${overview.totalDue?.toLocaleString() || '0'}`}
              icon={FaChartPie}
              color="danger"
            />
            <KPICard
              title="Collection Rate"
              value={`${overview.collectionRate?.toFixed(1) || '0'}%`}
              icon={FaPercent}
              color="gold"
            />
            <KPICard
              title="Total Bills"
              value={overview.totalBills?.toLocaleString() || '0'}
              icon={FaCalendarAlt}
              color="primary"
            />
          </>
        )}
      </div>

      {/* Additional Analytics Section */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          {/* Quick Stats */}
          <div className="card-aristocratic animate-slide-in-left">
            <div className="card-header-aristocratic">
              <h3 className="text-xl font-semibold text-gold-400">Quick Overview</h3>
            </div>
            <div className="card-body-aristocratic">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span className="text-gray-300">Active Customers</span>
                  <span className="text-gold-400 font-semibold">{overview.totalCustomers || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span className="text-gray-300">Total Revenue</span>
                  <span className="text-emerald-400 font-semibold">৳{overview.totalBilled?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span className="text-gray-300">Outstanding Amount</span>
                  <span className="text-red-400 font-semibold">৳{overview.totalDue?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Indicator */}
          <div className="card-aristocratic animate-slide-in-right">
            <div className="card-header-aristocratic">
              <h3 className="text-xl font-semibold text-gold-400">Performance Indicator</h3>
            </div>
            <div className="card-body-aristocratic">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gold-400 mb-2">
                    {overview.collectionRate?.toFixed(1) || '0'}%
                  </div>
                  <p className="text-gray-400">Collection Efficiency</p>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-gold-400 to-gold-600 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(overview.collectionRate || 0, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 text-center">
                  {overview.collectionRate >= 80 ? 'Excellent performance' :
                   overview.collectionRate >= 60 ? 'Good performance' :
                   overview.collectionRate >= 40 ? 'Needs improvement' : 'Critical attention required'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center mt-8">
        <button
          onClick={fetchOverview}
          className="btn-luxury"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Dashboard'}
        </button>
      </div>
    </div>
  );
}

export default Dashboard;