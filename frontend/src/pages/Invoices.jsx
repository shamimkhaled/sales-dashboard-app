import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

const sampleInvoice = {
  id: "SAMPLE-001",
  date: new Date().toISOString().slice(0, 10),
  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10),
  company: {
    name: "Kloud Sales",
    address: "1234 Example St, Dhaka, Bangladesh",
    phone: "+880 1234 567890",
    email: "billing@kloud.com.bd",
  },
  customer: {
    name: "John Doe",
    address: "56 Customer Ave, City",
    phone: "+880 9876 543210",
    email: "johndoe@example.com",
  },
  items: [
    { description: "Widget A", quantity: 2, unit_price: 150.0 },
    { description: "Widget B", quantity: 1, unit_price: 250.0 },
    { description: "Service Fee", quantity: 1, unit_price: 50.0 },
  ],
  tax_percent: 0,
  notes: "Thank you for your business.",
};

export default function Invoices() {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [billId, setBillId] = useState("");
  const navigate = useNavigate();
  const printRef = useRef();

  const loadSample = () => {
    setInvoice(sampleInvoice);
    setError(null);
  };

  const fetchInvoice = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setInvoice(null);

    // Try common endpoints. Adjust if your backend uses different routes.
    const endpoints = [`/api/invoices/${id}`, `/api/bills/${id}`, `/invoices/${id}`];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          // try next endpoint
          continue;
        }
        const data = await res.json();
        // normalize expected shape if needed
        const normalized = normalizeInvoice(data);
        setInvoice(normalized);
        setLoading(false);
        return;
      } catch (err) {
        // network or parse error, try next
        console.warn("fetch error for", ep, err);
      }
    }

    setLoading(false);
    setError(
      "Unable to fetch invoice. The app attempted known API endpoints. You can load a sample invoice for demo."
    );
  };

  const normalizeInvoice = (data) => {
    // Try to map common fields returned by backend to our UI shape.
    // This function is intentionally forgiving — adapt to your API.
    return {
      id: data.id || data.invoice_number || data.bill_no || "-",
      date: data.date || data.created_at || sampleInvoice.date,
      due_date: data.due_date || data.due || sampleInvoice.due_date,
      company: data.company || sampleInvoice.company,
      customer:
        data.customer ||
        data.client ||
        data.customer_info ||
        sampleInvoice.customer,
      items: data.items || data.lines || sampleInvoice.items,
      tax_percent: data.tax_percent ?? sampleInvoice.tax_percent,
      notes: data.notes ?? sampleInvoice.notes,
    };
  };

  const subtotal = (items) =>
    items.reduce((sum, it) => sum + (it.quantity || 1) * (it.unit_price || 0), 0);

  const handlePrint = () => {
    // For a print-friendly output, using window.print is enough when the page
    // contains only printable markup; we use Tailwind's `print:hidden` utility
    // to hide controls during printing.
    window.print();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
          >
            Back
          </button>
        </div>
      </div>

      {/* Loader / Controls */}
      <div className="mb-4 print:hidden">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Enter bill/invoice ID"
            value={billId}
            onChange={(e) => setBillId(e.target.value)}
            className="px-3 py-2 rounded border w-64"
          />
          <button
            onClick={() => fetchInvoice(billId)}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Load Invoice
          </button>
          <button
            onClick={loadSample}
            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
          >
            Load Sample
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Print
          </button>
        </div>
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>

      {loading && (
        <div className="py-6">
          <LoadingSpinner />
        </div>
      )}

      {!invoice && !loading && (
        <div className="p-6 border rounded text-sm text-gray-600">
          No invoice loaded. Enter an ID above or load the sample invoice.
        </div>
      )}

      {invoice && (
        <div ref={printRef} className="bg-white p-6 border rounded shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{invoice.company?.name}</h2>
              <div className="text-sm text-gray-600">
                <div>{invoice.company?.address}</div>
                <div>{invoice.company?.phone}</div>
                <div>{invoice.company?.email}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Invoice No.</div>
              <div className="font-mono font-semibold text-lg">{invoice.id}</div>
              <div className="text-sm text-gray-600 mt-2">
                <div>Issue: {invoice.date}</div>
                <div>Due: {invoice.due_date}</div>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          <div className="flex justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600">Bill To</div>
              <div className="font-medium">{invoice.customer?.name}</div>
              <div className="text-sm text-gray-600">{invoice.customer?.address}</div>
              <div className="text-sm text-gray-600">{invoice.customer?.phone}</div>
              <div className="text-sm text-gray-600">{invoice.customer?.email}</div>
            </div>

            <div className="text-sm text-gray-600">
              <div>Payment terms: Net 7</div>
              <div>Reference: {invoice.reference || "-"}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="border-b pb-2 text-sm">Description</th>
                  <th className="border-b pb-2 text-sm">Qty</th>
                  <th className="border-b pb-2 text-sm">Unit Price</th>
                  <th className="border-b pb-2 text-sm text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-2 text-sm border-b">{it.description}</td>
                    <td className="py-2 text-sm border-b">{it.quantity}</td>
                    <td className="py-2 text-sm border-b">{formatCurrency(it.unit_price)}</td>
                    <td className="py-2 text-sm border-b text-right">
                      {formatCurrency((it.quantity || 1) * (it.unit_price || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-full sm:w-1/3">
              <div className="flex justify-between text-sm py-1">
                <div>Subtotal</div>
                <div>{formatCurrency(subtotal(invoice.items))}</div>
              </div>
              <div className="flex justify-between text-sm py-1">
                <div>Tax ({invoice.tax_percent}%)</div>
                <div>
                  {formatCurrency((subtotal(invoice.items) * (invoice.tax_percent || 0)) / 100)
                }
                </div>
              </div>
              <div className="flex justify-between font-semibold text-base py-2 border-t mt-2">
                <div>Total</div>
                <div>
                  {formatCurrency(
                    subtotal(invoice.items) +
                      (subtotal(invoice.items) * (invoice.tax_percent || 0)) / 100
                  )}
                </div>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-6 text-sm text-gray-700">
              <strong>Notes:</strong>
              <div>{invoice.notes}</div>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500">
            This is a system generated invoice. Please keep it for your records.
          </div>
        </div>
      )}

      <style jsx>{`
        /* Print rules: hide interactive controls when printing */
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          /* Expand content to full page width */
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}
