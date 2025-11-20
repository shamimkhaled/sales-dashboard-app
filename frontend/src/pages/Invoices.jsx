import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useReactToPrint } from "react-to-print";

function formatCurrency(value) {
return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

const sampleInvoice = {
id: "SAMPLE-001",
date: new Date().toISOString().slice(0, 10),
due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
company: { name: "Kloud Sales", address: "1234 Example St, Dhaka, Bangladesh", phone: "+880 1234 567890", email: "[billing@kloud.com.bd](mailto:billing@kloud.com.bd)" },
customer: { name: "John Doe", address: "56 Customer Ave, City", phone: "+880 9876 543210", email: "[johndoe@example.com](mailto:johndoe@example.com)" },
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

const loadSample = () => { setInvoice(sampleInvoice); setError(null); };

const fetchInvoice = async (id) => {
if (!id) return;
setLoading(true); setError(null); setInvoice(null);
const endpoints = [`/api/invoices/${id}`, `/api/bills/${id}`, `/invoices/${id}`];
for (const ep of endpoints) {
try {
const res = await fetch(ep, { headers: { "Content-Type": "application/json" } });
if (!res.ok) continue;
const data = await res.json();
setInvoice(normalizeInvoice(data));
setLoading(false);
return;
} catch (err) { console.warn("fetch error for", ep, err); }
}
setLoading(false);
setError("Unable to fetch invoice. You can load a sample invoice for demo.");
};

const normalizeInvoice = (data) => ({
id: data.id || data.invoice_number || data.bill_no || "-",
date: data.date || data.created_at || sampleInvoice.date,
due_date: data.due_date || data.due || sampleInvoice.due_date,
company: data.company || sampleInvoice.company,
customer: data.customer || data.client || data.customer_info || sampleInvoice.customer,
items: data.items || data.lines || sampleInvoice.items,
tax_percent: data.tax_percent ?? sampleInvoice.tax_percent,
notes: data.notes ?? sampleInvoice.notes,
});

const subtotal = (items) => items.reduce((sum, it) => sum + (it.quantity || 1) * (it.unit_price || 0), 0);

// ------------------- react-to-print handler -------------------
const handlePrint = useReactToPrint({
contentRef: printRef,
documentTitle: invoice ? `Invoice-${invoice.id}` : "Invoice",
pageStyle: `@media print {
        body { -webkit-print-color-adjust: exact; font-family: Arial, sans-serif; margin: 0; }
      }`,
onBeforeGetContent: () => {
if (!printRef.current) {
alert("Nothing to print!");
return Promise.reject();
}
return Promise.resolve();
},
});

return ( <div className="p-6">
{/* Controls — hidden in print */} <div className="flex items-center justify-between mb-4 print:hidden"> <h1 className="text-2xl font-semibold">Invoices</h1> <div className="flex gap-2">
<button onClick={() => navigate(-1)} className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm">Back</button> </div> </div>

  <div className="mb-4 flex gap-2 items-center print:hidden">
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
      disabled={!invoice} // Disable until invoice is loaded
      className={`px-3 py-2 rounded text-white ${
        invoice ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"
      }`}
    >
      Print
    </button>
  </div>

  {error && <div className="text-red-600 mt-2 print:hidden">{error}</div>}
  {loading && <div className="py-6"><LoadingSpinner /></div>}
  {!invoice && !loading && <div className="p-6 border rounded text-sm text-gray-600">No invoice loaded.</div>}

  {invoice && (
    <div id="print-area" ref={printRef} className="bg-white p-6 border rounded shadow-sm">
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #000", paddingBottom: "10px", marginBottom: "20px" }}>
        <img src="/src/assets/kloud_tech.png" alt="Left" style={{ width: "200px", height: "auto" }} />
        <div style={{ textAlign: "center", flex: 1 }}>
          <h1 style={{ fontSize: "16px", margin: 0 }}>GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h1>
          <p style={{ margin: "5px 0" }}>NATIONAL BOARD OF REVENUE, DHAKA</p>
          <h2>TAX INVOICE</h2>
          <p>[REF RULE 40, (1) (GHA) & (CHA)]</p>
        </div>
        <div style={{ width: "200px" }}></div>
      </div>

      {/* COMPANY INFO */}
      <div style={{ marginBottom: "20px" }}>
        <p><strong>REGISTERED PERSON NAME:</strong> KLOUD TECHNOLOGIES LIMITED</p>
        <p><strong>BIN NUMBER:</strong> 000002141-0101</p>
        <p><strong>INVOICE ISSUING ADDRESS:</strong> Police Plaza Concord, Tower-1, Plot-02, Road-144, Gulshan, Dhaka-1212, Bangladesh. Helpdesk # +8809678123123</p>
        <p><strong>MUSHAK- 6.3</strong></p>
      </div>

      {/* INVOICE DETAILS */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ width: "48%" }}>
          <p><strong>INVOICE NUMBER:</strong> {invoice.id}</p>
          <p><strong>BIN NUMBER:</strong> 000002141-0101</p>
          <p><strong>BILLING PERIOD:</strong> {invoice.billing_period || "N/A"}</p>
          <p><strong>INVOICE ISSUE DATE:</strong> {invoice.date}</p>
          <p><strong>INVOICE DUE DATE:</strong> {invoice.due_date}</p>
        </div>
        <div style={{ width: "48%" }}>
          <p><strong>SUBSCRIBER CODE:</strong> {invoice.customer?.subscriber_code || "-"}</p>
          <p><strong>SUBSCRIBER NAME:</strong> {invoice.customer?.name}</p>
          <p><strong>ADDRESS:</strong> {invoice.customer?.address}</p>
          <p><strong>VEHICLE NATURE & NO:</strong> -</p>
          <p><strong>SUPPLY DESTINATION:</strong> -</p>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
        <thead>
          <tr>
            {["SL No.","Description","Qty","Per Unit Price (Taka)","Amount (Taka)","VAT Rate","VAT Amount (Taka)","SD Rate","SD Amount (Taka)","Total Price (Taka)"].map((h,i) => (
              <th key={i} style={{ border: "1px solid #000", padding: "5px", background: "#f0f0f0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => {
            const amount = (item.quantity || 1) * (item.unit_price || 0);
            const vatAmount = item.vat ? (amount * item.vat) / 100 : 0;
            return (
              <tr key={idx}>
                <td style={{ border: "1px solid #000", padding: "5px" }}>{idx+1}</td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>{item.description}</td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>{item.quantity}</td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>{item.unit_price}</td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>{amount.toFixed(2)}</td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>{item.vat || "-"}</td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>{vatAmount.toFixed(2)}</td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>-</td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>-</td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>{(amount + vatAmount).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* TOTALS & FOOTER */}
      <div style={{ marginBottom: "20px" }}>
        <table style={{ borderCollapse: "collapse", width: "auto", marginLeft: "auto" }}>
          <tbody>
            <tr><td>Previous Balance</td><td>-</td></tr>
            <tr><td>Adjustment</td><td>-</td></tr>
            <tr><td>Payments</td><td>-</td></tr>
            <tr><td>Current Charges</td><td>{formatCurrency(subtotal(invoice.items))}</td></tr>
            <tr><td><strong>Total Amount Due</strong></td><td><strong>{formatCurrency(subtotal(invoice.items))}</strong></td></tr>
          </tbody>
        </table>
        <p><strong>In Word:</strong> {invoice.amount_in_words || "N/A"}</p>
      </div>

      <div style={{ borderTop: "1px solid #000", paddingTop: "10px", fontSize: "10px" }}>
        <p>Please advise of discrepancies within 10 days at billing@link3.net</p>
        <p><strong>Payment Instruction:</strong></p>
        <p>i. Pay before expiry to avoid interruption.</p>
        <p>ii. Failure to pay results in automatic disconnection.</p>
        <p>1. Per unit price excluding all taxes.</p>
        <p><strong>Name, Designation & Signature of Seller</strong></p>
        <p>This computer-generated invoice requires no signature.</p>
        <p>For info: https://selfcare.link3.net</p>
        <p>A/C#: 01777776660 • A/C# 3333 3242 (Payee: LINK3)</p>
        <p>Page 1 of 1</p>
      </div>
    </div>
  )}
</div>


);
}
