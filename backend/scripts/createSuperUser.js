// Script to create the initial super admin user
// Run this script once to create the first super admin user
// Usage: node scripts/createSuperUser.js

const db = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function createSuperUser() {
  try {
    console.log('🔧 Creating super admin user...');

    // Check if any users exist
    const existingUsers = await User.getAll({ page: 1, pageSize: 1 });
    if (existingUsers.length > 0) {
      console.log('❌ Users already exist. Super admin creation skipped.');
      console.log('💡 If you need to create another super admin, use the register endpoint or update existing user role.');
      return;
    }

    // Create super admin user
    const superAdminData = {
      username: 'shamimkhaled',
      email: 'shamim.khaled@alawaf.com.bd',
      password: 'Admin@999', // Change this to a secure password
      role: 'super_admin'
    };

    const hashedPassword = await bcrypt.hash(superAdminData.password, 12);

    const sql = `
      INSERT INTO users (
        username, email, password_hash, role, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await db.runAsync(sql, [
      superAdminData.username,
      superAdminData.email,
      hashedPassword,
      superAdminData.role,
      true, // is_active
      null  // created_by (null for initial user)
    ]);

    console.log('✅ Super admin user created successfully!');
    console.log('👤 Username: shamimkhaled');
    console.log('📧 Email: shamim.khaled@alawaf.com.bd');
    console.log('🔑 Password: Admin@999');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('🔗 Login URL: http://localhost:5000/login');

  } catch (error) {
    console.error('❌ Error creating super admin user:', error);
  } finally {
    // Close database connection after a delay to allow other operations to complete
    setTimeout(() => {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('📪 Database connection closed.');
        }
      });
    }, 1000);
  }
}

// Run the script
createSuperUser();