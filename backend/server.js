
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Security Middleware
const { helmetConfig, sanitizeInput, corsOptions } = require('./middleware/security');
app.use(helmetConfig);
app.use(sanitizeInput);

// Initialize Database
const db = require('./config/database');

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
  },
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Also serve at /api for backward compatibility
app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
  },
  customCss: '.swagger-ui .topbar { display: none }',
}));

// API Routes (moved before static files to avoid conflicts)
app.use('/api', (req, res, next) => {
  // This ensures API routes are handled before static files
  next();
});

// API Routes (moved before static files to avoid conflicts)
app.use('/api', (req, res, next) => {
  // This ensures API routes are handled before static files
  next();
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const billRoutes = require('./routes/billRoutes');
const prospectRoutes = require('./routes/prospectRoutes');
const calculationRoutes = require('./routes/calculationRoutes');
const uploadRoutes = require('./routes/uploadRotues');
const dashboardRoutes = require('./routes/dshboardRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activity-logs', activityLogRoutes);
// app.use('/api/reports', reportsRoutes); // Commented out - reports routes not created yet

// Root Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`Sales Dashboard Server is running!`);
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`API Docs: http://localhost:${PORT}/api`);
  console.log(`═══════════════════════════════════════════════════════════`);
});

module.exports = app;