// config/database.js - SQLite Database Setup
// Creates tables automatically when server starts

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create database file in project root
const dbPath = path.join(__dirname, '..', 'sales_dashboard.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('✓ Connected to SQLite Database:', dbPath);
    initializeTables();
  }
});

// Initialize tables
function initializeTables() {
  // Create Customers Table
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serial_number INTEGER UNIQUE,
      name_of_party TEXT NOT NULL,
      address TEXT,
      email TEXT,
      proprietor_name TEXT,
      phone_number TEXT,
      link_id TEXT,
      remarks TEXT,
      kam TEXT,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating customers table:', err);
    else console.log('✓ Customers table ready');
  });

  // Create Bill Records Table
  db.run(`
    CREATE TABLE IF NOT EXISTS bill_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      nttn_cap TEXT,
      nttn_com TEXT,
      active_date DATE,
      billing_date DATE,
      termination_date DATE,
      iig_qt_price REAL DEFAULT 0,
      fna_price REAL DEFAULT 0,
      ggc_price REAL DEFAULT 0,
      cdn_price REAL DEFAULT 0,
      bdix_price REAL DEFAULT 0,
      baishan_price REAL DEFAULT 0,
      total_bill REAL DEFAULT 0,
      total_received REAL DEFAULT 0,
      total_due REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Error creating bill_records table:', err);
    else console.log('✓ Bill Records table ready');
  });

  // Create Audit Log Table
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      table_name TEXT,
      record_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating audit_logs table:', err);
    else console.log('✓ Audit Logs table ready');
  });

  console.log('✓ Database initialization complete\n');
}

// Promisify database operations for easier use
db.runAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

db.getAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = db;