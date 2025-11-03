const XLSX = require('xlsx');
const Papa = require('papaparse');

/**
 * Export customers to Excel format
 * @param {Array} customers - Array of customer objects
 * @returns {Buffer} Excel file buffer
 */
const exportCustomersToExcel = (customers) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(customers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    
    // Set column widths
    const colWidths = [
      { wch: 5 },   // id
      { wch: 12 },  // serial_number
      { wch: 25 },  // name_of_party
      { wch: 30 },  // address
      { wch: 20 },  // email
      { wch: 20 },  // proprietor_name
      { wch: 15 },  // phone_number
      { wch: 12 },  // link_id
      { wch: 20 },  // remarks
      { wch: 20 },  // kam
      { wch: 12 },  // status
    ];
    worksheet['!cols'] = colWidths;
    
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  } catch (error) {
    throw new Error(`Failed to export customers to Excel: ${error.message}`);
  }
};

/**
 * Export customers to CSV format
 * @param {Array} customers - Array of customer objects
 * @returns {string} CSV string
 */
const exportCustomersToCSV = (customers) => {
  try {
    return Papa.unparse(customers);
  } catch (error) {
    throw new Error(`Failed to export customers to CSV: ${error.message}`);
  }
};

/**
 * Export bills to Excel format following the Sales-Pannel-Oct.2025.xlsx structure
 * @param {Array} bills - Array of bill objects with customer data
 * @returns {Buffer} Excel file buffer
 */
const exportBillsToExcel = (bills) => {
  try {
    // Transform bills data to match Excel format
    const transformedBills = bills.map((bill, index) => ({
      'S/L': bill.serial_number || index + 1,
      'Name Of Party': bill.name_of_party || '',
      'Address': bill.address || '',
      'E-mail': bill.email || '',
      'Proprietor Name': bill.proprietor_name || '',
      'Phone Number': bill.phone_number || '',
      'Link ID': bill.link_id || '',
      'NTTN Com': bill.nttn_com || '',
      'NTTN Cap': bill.nttn_cap || '',
      'Active Date': bill.active_date ? new Date(bill.active_date).toLocaleDateString() : '',
      'Billing Date': bill.billing_date ? new Date(bill.billing_date).toLocaleDateString() : '',
      'Termination Date': bill.termination_date ? new Date(bill.termination_date).toLocaleDateString() : '',
      'IIG-QT': bill.iig_qt || 0,
      'Price': bill.iig_qt_price || 0,
      'FNA': bill.fna || 0,
      'Price': bill.fna_price || 0,
      'GGC': bill.ggc || 0,
      'Price': bill.ggc_price || 0,
      'CDN': bill.cdn || 0,
      'Price': bill.cdn_price || 0,
      'BDIX': bill.bdix || 0,
      'Price': bill.bdix_price || 0,
      'BAISHAN': bill.baishan || 0,
      'Price': bill.baishan_price || 0,
      'Total Bill': bill.total_bill || 0,
      'Total Received': bill.total_received || 0,
      'Total Due': bill.total_due || 0,
      'Discount': bill.discount || 0,
      'Remarks': bill.remarks || '',
      'KAM': bill.kam || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(transformedBills);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SUM (2)');

    // Set column widths to match Excel format
    const colWidths = [
      { wch: 5 },   // S/L
      { wch: 25 },  // Name Of Party
      { wch: 30 },  // Address
      { wch: 20 },  // E-mail
      { wch: 20 },  // Proprietor Name
      { wch: 15 },  // Phone Number
      { wch: 12 },  // Link ID
      { wch: 12 },  // NTTN Com
      { wch: 12 },  // NTTN Cap
      { wch: 12 },  // Active Date
      { wch: 12 },  // Billing Date
      { wch: 15 },  // Termination Date
      { wch: 10 },  // IIG-QT
      { wch: 10 },  // Price
      { wch: 10 },  // FNA
      { wch: 10 },  // Price
      { wch: 10 },  // GGC
      { wch: 10 },  // Price
      { wch: 10 },  // CDN
      { wch: 10 },  // Price
      { wch: 10 },  // BDIX
      { wch: 10 },  // Price
      { wch: 10 },  // BAISHAN
      { wch: 10 },  // Price
      { wch: 12 },  // Total Bill
      { wch: 15 },  // Total Received
      { wch: 12 },  // Total Due
      { wch: 12 },  // Discount
      { wch: 20 },  // Remarks
      { wch: 15 },  // KAM
    ];
    worksheet['!cols'] = colWidths;

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  } catch (error) {
    throw new Error(`Failed to export bills to Excel: ${error.message}`);
  }
};

/**
 * Export bills to CSV format
 * @param {Array} bills - Array of bill objects
 * @returns {string} CSV string
 */
const exportBillsToCSV = (bills) => {
  try {
    return Papa.unparse(bills);
  } catch (error) {
    throw new Error(`Failed to export bills to CSV: ${error.message}`);
  }
};

module.exports = {
  exportCustomersToExcel,
  exportCustomersToCSV,
  exportBillsToExcel,
  exportBillsToCSV,
};
