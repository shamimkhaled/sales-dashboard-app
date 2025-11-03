import { useState } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaMoneyBill, FaSave, FaCalculator } from 'react-icons/fa';
import billService from '../services/billService';
import customerService from '../services/customerService';
import ErrorAlert from '../components/ErrorAlert';

function DataEntry() {
  const [formData, setFormData] = useState({
    serial_number: '',
    name_of_party: '',
    email: '',
    phone_number: '',
    total_bill: '',
    total_received: '',
    discount: '',
    status: 'Active',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [calculatedDue, setCalculatedDue] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculate due amount
    if (name === 'total_bill' || name === 'total_received' || name === 'discount') {
      const bill = name === 'total_bill' ? parseFloat(value) || 0 : parseFloat(formData.total_bill) || 0;
      const received = name === 'total_received' ? parseFloat(value) || 0 : parseFloat(formData.total_received) || 0;
      const discount = name === 'discount' ? parseFloat(value) || 0 : parseFloat(formData.discount) || 0;

      const due = Math.max(0, bill - received - discount);
      setCalculatedDue(due);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validate required fields
      if (!formData.serial_number || !formData.name_of_party || !formData.total_bill) {
        throw new Error('Please fill in all required fields');
      }

      // Create customer
      const customerRes = await customerService.create({
        serial_number: parseInt(formData.serial_number),
        name_of_party: formData.name_of_party,
        email: formData.email,
        phone_number: formData.phone_number,
        status: formData.status,
      });

      // Create bill
      await billService.create({
        customer_id: customerRes.data.id,
        total_bill: parseFloat(formData.total_bill),
        total_received: parseFloat(formData.total_received) || 0,
        total_due: calculatedDue,
        discount: parseFloat(formData.discount) || 0,
        status: formData.status,
      });

      setMessage({ type: 'success', text: 'Record saved successfully!' });
      setFormData({
        serial_number: '',
        name_of_party: '',
        email: '',
        phone_number: '',
        total_bill: '',
        total_received: '',
        discount: '',
        status: 'Active',
      });
      setCalculatedDue(0);

      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save record' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center animate-fade-in-up">
        <h1 className="text-gradient-luxury mb-2">Add New Bill Record</h1>
        <p className="text-gray-400 text-lg">Create customer and billing information</p>
      </div>

      {/* Alert Messages */}
      {message && (
        <ErrorAlert
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
        />
      )}

      {/* Form */}
      <div className="card-aristocratic animate-slide-in-up">
        <div className="card-header-aristocratic">
          <h3 className="text-xl font-semibold text-gold-400 flex items-center">
            <FaUser className="mr-2" />
            Customer & Billing Information
          </h3>
        </div>
        <div className="card-body-aristocratic">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h4 className="text-gold-400 font-semibold flex items-center">
                <FaUser className="mr-2" />
                Customer Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label-aristocratic flex items-center">
                    <FaCalculator className="mr-2" />
                    Serial Number *
                  </label>
                  <input
                    type="number"
                    className="form-control-aristocratic w-full"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleChange}
                    placeholder="Enter serial number"
                    required
                  />
                </div>
                <div>
                  <label className="form-label-aristocratic flex items-center">
                    <FaUser className="mr-2" />
                    Name of Party *
                  </label>
                  <input
                    type="text"
                    className="form-control-aristocratic w-full"
                    name="name_of_party"
                    value={formData.name_of_party}
                    onChange={handleChange}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label-aristocratic flex items-center">
                    <FaEnvelope className="mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-control-aristocratic w-full"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <label className="form-label-aristocratic flex items-center">
                    <FaPhone className="mr-2" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="form-control-aristocratic w-full"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="+880 1XX XXX XXXX"
                  />
                </div>
              </div>
            </div>

            {/* Billing Information */}
            <div className="space-y-4">
              <h4 className="text-gold-400 font-semibold flex items-center">
                <FaMoneyBill className="mr-2" />
                Billing Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="form-label-aristocratic">Total Bill (৳) *</label>
                  <input
                    type="number"
                    className="form-control-aristocratic w-full"
                    name="total_bill"
                    value={formData.total_bill}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="form-label-aristocratic">Total Received (৳)</label>
                  <input
                    type="number"
                    className="form-control-aristocratic w-full"
                    name="total_received"
                    value={formData.total_received}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="form-label-aristocratic">Discount (৳)</label>
                  <input
                    type="number"
                    className="form-control-aristocratic w-full"
                    name="discount"
                    value={formData.discount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {/* Calculated Due Amount */}
              {calculatedDue > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-red-400 font-medium">Amount Due:</span>
                    <span className="text-red-400 font-bold text-xl">৳{calculatedDue.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="form-label-aristocratic">Status</label>
                <select
                  className="form-control-aristocratic w-full"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="btn-luxury flex items-center space-x-2"
                disabled={loading}
              >
                <FaSave />
                <span>{loading ? 'Saving Record...' : 'Save Record'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Instructions */}
      <div className="card-aristocratic animate-slide-in-left">
        <div className="card-body-aristocratic">
          <h4 className="text-gold-400 font-semibold mb-4">Instructions</h4>
          <ul className="text-gray-300 space-y-2 text-sm">
            <li>• Fill in all required fields marked with *</li>
            <li>• The system will automatically calculate the due amount</li>
            <li>• Email and phone are optional but recommended for record keeping</li>
            <li>• All monetary values should be entered in Bangladeshi Taka (৳)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DataEntry;