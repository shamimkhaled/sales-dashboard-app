// Database Setup - Supports both SQLite (development) and MySQL (production)
// Creates tables automatically when server starts

const path = require('path');
const fs = require('fs');

// Determine database type based on environment
const useMySQL = process.env.DB_TYPE === 'mysql' || process.env.NODE_ENV === 'production';

let db;

if (useMySQL) {
  // MySQL Setup
  const mysql = require('mysql2/promise');

  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'kloudcom_sales',
    password: process.env.DB_PASSWORD || 'kloudcom_sales12345678',
    database: process.env.DB_NAME || 'kloudcom_sales',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00'
  };

  // Create connection pool
  db = mysql.createPool(dbConfig);

  // Test connection and initialize tables
  (async function initializeMySQL() {
    try {
      const connection = await db.getConnection();
      console.log('✓ Connected to MySQL Database');

      // Create database if it doesn't exist
      await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
      await connection.execute(`USE ${dbConfig.database}`);

      connection.release();
      await initializeTables();
    } catch (err) {
      console.error('Error connecting to MySQL database:', err);
      process.exit(1);
    }
  })();
} else {
  // SQLite Setup (for development)
  const sqlite3 = require('sqlite3').verbose();

  // Create database file in project root
  const dbPath = path.join(__dirname, '..', 'sales_dashboard.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err);
    } else {
      console.log('✓ Connected to SQLite Database:', dbPath);
      initializeTables();
    }
  });
}

// Initialize tables
async function initializeTables() {
  try {
    if (useMySQL) {
      // MySQL table creation
      await db.execute(`
        CREATE TABLE IF NOT EXISTS customers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          serial_number INT UNIQUE,
          name_of_party VARCHAR(255) NOT NULL,
          address TEXT,
          email VARCHAR(255),
          proprietor_name VARCHAR(255),
          phone_number VARCHAR(50),
          link_id VARCHAR(100),
          remarks TEXT,
          kam VARCHAR(255),
          status ENUM('Active', 'Inactive') DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Customers table ready (MySQL)');
    } else {
      // SQLite table creation
      await new Promise((resolve, reject) => {
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
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✓ Customers table ready (SQLite)');
    }
  } catch (err) {
    console.error('Error creating customers table:', err);
  }



    // Create Bill Records Table
    if (useMySQL) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS bill_records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          customer_id INT NOT NULL,
          nttn_cap VARCHAR(100),
          nttn_com VARCHAR(100),
          active_date DATE,
          billing_date DATE,
          termination_date DATE,
          iig_qt DECIMAL(10,2) DEFAULT 0,
          iig_qt_price DECIMAL(10,2) DEFAULT 0,
          fna DECIMAL(10,2) DEFAULT 0,
          fna_price DECIMAL(10,2) DEFAULT 0,
          ggc DECIMAL(10,2) DEFAULT 0,
          ggc_price DECIMAL(10,2) DEFAULT 0,
          cdn DECIMAL(10,2) DEFAULT 0,
          cdn_price DECIMAL(10,2) DEFAULT 0,
          bdix DECIMAL(10,2) DEFAULT 0,
          bdix_price DECIMAL(10,2) DEFAULT 0,
          baishan DECIMAL(10,2) DEFAULT 0,
          baishan_price DECIMAL(10,2) DEFAULT 0,
          total_bill DECIMAL(15,2) DEFAULT 0,
          total_received DECIMAL(15,2) DEFAULT 0,
          total_due DECIMAL(15,2) DEFAULT 0,
          discount DECIMAL(10,2) DEFAULT 0,
          status ENUM('Active', 'Inactive') DEFAULT 'Active',
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Bill Records table ready (MySQL)');
    } else {
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS bill_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            nttn_cap TEXT,
            nttn_com TEXT,
            active_date DATE,
            billing_date DATE,
            termination_date DATE,
            iig_qt REAL DEFAULT 0,
            iig_qt_price REAL DEFAULT 0,
            fna REAL DEFAULT 0,
            fna_price REAL DEFAULT 0,
            ggc REAL DEFAULT 0,
            ggc_price REAL DEFAULT 0,
            cdn REAL DEFAULT 0,
            cdn_price REAL DEFAULT 0,
            bdix REAL DEFAULT 0,
            bdix_price REAL DEFAULT 0,
            baishan REAL DEFAULT 0,
            baishan_price REAL DEFAULT 0,
            total_bill REAL DEFAULT 0,
            total_received REAL DEFAULT 0,
            total_due REAL DEFAULT 0,
            discount REAL DEFAULT 0,
            status TEXT DEFAULT 'Active',
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✓ Bill Records table ready (SQLite)');
    }




    // Create Users Table
    if (useMySQL) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          is_active BOOLEAN DEFAULT 1,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY(created_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Users table ready (MySQL)');
    } else {
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            is_active BOOLEAN DEFAULT 1,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(created_by) REFERENCES users(id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✓ Users table ready (SQLite)');
    }

    // Create Roles Table
    if (useMySQL) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          description TEXT,
          permissions JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Roles table ready (MySQL)');
    } else {
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            permissions TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✓ Roles table ready (SQLite)');
    }

    // Create User Activity Logs Table
    if (useMySQL) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_activity_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          action VARCHAR(100) NOT NULL,
          resource VARCHAR(100),
          resource_id INT,
          details JSON,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ User Activity Logs table ready (MySQL)');
    } else {
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS user_activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            resource TEXT,
            resource_id INTEGER,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✓ User Activity Logs table ready (SQLite)');
    }

    // Create Audit Log Table
    if (useMySQL) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          action VARCHAR(100),
          table_name VARCHAR(100),
          record_id INT,
          old_values JSON,
          new_values JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Audit Logs table ready (MySQL)');
    } else {
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT,
            table_name TEXT,
            record_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✓ Audit Logs table ready (SQLite)');
    }

    // Create Prospects Table
    if (useMySQL) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS prospects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          prospect_name VARCHAR(255) NOT NULL,
          company_name VARCHAR(255),
          email VARCHAR(255),
          phone_number VARCHAR(50),
          address TEXT,
          potential_revenue DECIMAL(15,2),
          contact_person_name VARCHAR(255),
          source ENUM('Website', 'Referral', 'Cold Call', 'Other') DEFAULT 'Other',
          follow_up_date DATE,
          notes TEXT,
          status ENUM('New', 'Contacted', 'Qualified', 'Lost', 'Converted') DEFAULT 'New',
          connection_type VARCHAR(100),
          area VARCHAR(100),
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY(created_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Prospects table ready (MySQL)');
    } else {
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS prospects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prospect_name TEXT NOT NULL,
            company_name TEXT,
            email TEXT,
            phone_number TEXT,
            address TEXT,
            potential_revenue REAL,
            contact_person_name TEXT,
            source TEXT DEFAULT 'Other',
            follow_up_date DATE,
            notes TEXT,
            status TEXT DEFAULT 'New',
            connection_type TEXT,
            area TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(created_by) REFERENCES users(id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✓ Prospects table ready (SQLite)');
    }

    // Insert default roles
    try {
      if (useMySQL) {
        await db.execute(`
          INSERT IGNORE INTO roles (name, description, permissions) VALUES
          ('super_admin', 'Super Administrator with full access', JSON_ARRAY('all')),
          ('admin', 'Administrator with user management', JSON_ARRAY('users:read','users:write','customers:read','customers:write','bills:read','bills:write','reports:read','logs:read','prospects:read','prospects:write')),
          ('sales_person', 'Sales person with customer and prospect access', JSON_ARRAY('customers:read','customers:write','bills:read','bills:write','prospects:read','prospects:write','reports:read')),
          ('user', 'Regular user with limited access', JSON_ARRAY('customers:read','bills:read','reports:read'))
        `);
        console.log('✓ Default roles inserted (MySQL)');
      } else {
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT OR IGNORE INTO roles (name, description, permissions) VALUES
            ('super_admin', 'Super Administrator with full access', '["all"]'),
            ('admin', 'Administrator with user management', '["users:read","users:write","customers:read","customers:write","bills:read","bills:write","reports:read","logs:read","prospects:read","prospects:write"]'),
            ('sales_person', 'Sales person with customer and prospect access', '["customers:read","customers:write","bills:read","bills:write","prospects:read","prospects:write","reports:read"]'),
            ('user', 'Regular user with limited access', '["customers:read","bills:read","reports:read"]')
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('✓ Default roles inserted (SQLite)');
      }
    } catch (err) {
      console.error('Error inserting default roles:', err);
    }

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