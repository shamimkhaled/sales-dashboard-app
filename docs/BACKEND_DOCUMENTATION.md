# Backend Documentation - Sales Dashboard Analytics

## 🏗️ Overview

The backend is a robust Node.js/Express API server with SQLite database, designed for high performance and scalability. It provides RESTful endpoints for customer management, billing operations, analytics, and data import/export functionality.

## 🛠️ Technology Stack

### Core Technologies
- **Runtime**: Node.js 14+
- **Framework**: Express.js 5.1.0
- **Database**: SQLite3 5.1.7
- **ORM**: Custom SQL queries with sqlite3 promises
- **File Processing**: Multer 2.0.2, XLSX 0.18.5, PapaParse 5.5.3
- **Middleware**: CORS 2.8.5, Body Parser 2.2.0, Dotenv 17.2.3

### Development Tools
- **Process Manager**: Nodemon 3.1.10
- **Testing**: Manual API testing (future: Jest/Mocha)
- **Linting**: ESLint (planned)
- **Documentation**: JSDoc comments

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js              # SQLite configuration and initialization
├── controllers/
│   ├── customerController.js    # Customer CRUD operations
│   ├── billController.js        # Bill management logic
│   ├── dashboardController.js   # Analytics and KPI calculations
│   └── uploadController.js      # File import/export handlers
├── models/
│   ├── Customer.js              # Customer data model and queries
│   └── Bill.js                  # Bill data model and queries
├── routes/
│   ├── customerRoutes.js        # Customer API route definitions
│   ├── billRoutes.js            # Bill API route definitions
│   ├── dshboardRoutes.js        # Dashboard API route definitions
│   └── uploadRotues.js          # Upload API route definitions
├── middleware/                  # Custom middleware (future use)
├── services/                    # Business logic services (future use)
├── utils/                       # Utility functions (future use)
├── .env                         # Environment variables
├── package.json                 # Dependencies and scripts
├── server.js                    # Main application entry point
└── README.md                    # Backend-specific documentation
```

## ⚙️ Configuration

### Environment Variables (`.env`)
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_PATH=./sales_dashboard.db

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Database Configuration (`config/database.js`)

#### Features
- **Auto-initialization**: Creates tables on first run
- **Promise-based**: Async/await support for all operations
- **Error Handling**: Comprehensive error logging
- **Connection Pooling**: Single connection with promisified methods

#### Database Schema
```javascript
// Tables created automatically:
// - customers: Customer information
// - bill_records: Billing transactions
// - audit_logs: Change tracking (future)
```

#### Promisified Methods
```javascript
db.runAsync(sql, params)    // INSERT, UPDATE, DELETE
db.getAsync(sql, params)    // Single row SELECT
db.allAsync(sql, params)    // Multiple rows SELECT
```

## 🎯 API Architecture

### RESTful Design Principles
- **Resource-based URLs**: `/api/resource/:id`
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Status Codes**: Standard HTTP status codes
- **JSON Responses**: Consistent response format
- **Error Handling**: Structured error responses

### Response Format
```json
// Success Response
{
  "success": true,
  "data": { /* payload */ },
  "message": "Operation successful",
  "count": 10
}

// Error Response
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Request/Response Middleware
- **CORS**: Cross-origin resource sharing
- **Body Parser**: JSON and URL-encoded data parsing
- **File Upload**: Multer for multipart/form-data
- **Error Handler**: Centralized error processing

## 📊 Models Layer

### Customer Model (`models/Customer.js`)

#### Core Methods
```javascript
Customer.getAll(filters)     // Get customers with filtering
Customer.getById(id)         // Get single customer
Customer.create(data)        // Create new customer
Customer.update(id, data)    // Update customer
Customer.delete(id)          // Delete customer
Customer.getCount()          // Get total count
```

#### Filtering Options
```javascript
const filters = {
  search: "query",           // Search across multiple fields
  status: "Active",          // Filter by status
  limit: 50                  // Limit results
};
```

#### Data Validation
- **Required Fields**: serial_number, name_of_party
- **Unique Constraints**: serial_number
- **Data Types**: Proper type checking
- **Sanitization**: Input cleaning

### Bill Model (`models/Bill.js`)

#### Core Methods
```javascript
Bill.getAll(filters)         // Get bills with filtering
Bill.getById(id)             // Get single bill
Bill.create(data)            // Create new bill
Bill.update(id, data)        // Update bill
Bill.delete(id)              // Delete bill
Bill.getStats()              // Get billing statistics
Bill.getByCustomer(id)       // Get customer's bills
```

#### Business Logic
- **Auto-calculation**: Due amounts, totals
- **Relationships**: Foreign key to customers
- **Status Tracking**: Active/Inactive bills
- **Audit Trail**: Creation/update timestamps

## 🎮 Controllers Layer

### Customer Controller (`controllers/customerController.js`)

#### Route Handlers
```javascript
getAllCustomers(req, res)    // GET /customers
getCustomerById(req, res)    // GET /customers/:id
createCustomer(req, res)     // POST /customers
updateCustomer(req, res)     // PUT /customers/:id
deleteCustomer(req, res)     // DELETE /customers/:id
```

#### Request Processing
- **Query Parameters**: search, status, limit
- **Request Body**: Customer data object
- **Path Parameters**: Resource IDs
- **Validation**: Input sanitization and validation

#### Error Handling
- **404 Errors**: Resource not found
- **400 Errors**: Invalid input data
- **500 Errors**: Server/database errors

### Bill Controller (`controllers/billController.js`)

#### Route Handlers
```javascript
getAllBills(req, res)        // GET /bills
getBillById(req, res)        // GET /bills/:id
createBill(req, res)         // POST /bills
updateBill(req, res)         // PUT /bills/:id
deleteBill(req, res)         // DELETE /bills/:id
getBillStats(req, res)       // GET /bills/stats
getBillsByCustomer(req, res) // GET /bills/customer/:id
```

#### Business Logic
- **Calculations**: Auto-compute totals and dues
- **Relationships**: Link bills to customers
- **Filtering**: Date ranges, customer filtering
- **Statistics**: Revenue and collection metrics

### Dashboard Controller (`controllers/dashboardController.js`)

#### Analytics Methods
```javascript
getOverview(req, res)           // Main KPI dashboard
getTopCustomers(req, res)       // Top revenue customers
getRevenueByService(req, res)   // Service revenue breakdown
getCollectionStatus(req, res)   // Payment status overview
getCustomerStatus(req, res)     // Customer status distribution
```

#### KPI Calculations
- **Real-time Metrics**: Current data aggregation
- **Performance Indicators**: Collection rates, trends
- **Revenue Analysis**: Service-wise breakdown
- **Customer Insights**: Status distribution

### Upload Controller (`controllers/uploadController.js`)

#### File Processing
```javascript
uploadCustomers(req, res)    // POST /upload/customers
uploadBills(req, res)        // POST /upload/bills
```

#### Supported Formats
- **Excel**: .xlsx, .xls files
- **CSV**: Comma-separated values
- **Validation**: Column mapping and data validation
- **Error Reporting**: Detailed import error logs

## 🛣️ Routes Layer

### Route Organization
Each feature has its own route file with:
- **Middleware**: Route-specific middleware
- **Validation**: Input validation
- **Error Handling**: Route-level error processing
- **Documentation**: JSDoc comments

### Route Examples

#### Customer Routes (`routes/customerRoutes.js`)
```javascript
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
```

#### Bill Routes (`routes/billRoutes.js`)
```javascript
router.get('/', getAllBills);
router.get('/stats', getBillStats);
router.get('/customer/:customerId', getBillsByCustomer);
router.get('/:id', getBillById);
router.post('/', createBill);
router.put('/:id', updateBill);
router.delete('/:id', deleteBill);
```

## 🔒 Security Features

### Current Implementation
- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Restricted origins
- **File Upload Security**: Type and size restrictions

### Security Headers (Future)
```javascript
// Planned security middleware
app.use(helmet());              // Security headers
app.use(rateLimit());           // Rate limiting
app.use(express.json({ limit: '10mb' })); // Request size limits
```

### Authentication (Future)
- **JWT Tokens**: Stateless authentication
- **Role-based Access**: User permissions
- **Session Management**: Secure session handling
- **Password Hashing**: bcrypt for passwords

## 📊 Database Design

### Schema Overview

#### Customers Table
```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serial_number INTEGER UNIQUE NOT NULL,
  name_of_party TEXT NOT NULL,
  address TEXT,
  email TEXT,
  proprietor_name TEXT,
  phone_number TEXT,
  link_id TEXT,
  remarks TEXT,
  kam TEXT,                    -- Key Account Manager
  status TEXT DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Bill Records Table
```sql
CREATE TABLE bill_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  nttn_cap TEXT,               -- Network capacity
  nttn_com TEXT,               -- Network commercial
  active_date DATE,
  billing_date DATE,
  termination_date DATE,
  iig_qt_price REAL DEFAULT 0, -- IIG/QT service price
  fna_price REAL DEFAULT 0,    -- FNA service price
  ggc_price REAL DEFAULT 0,    -- GGC service price
  cdn_price REAL DEFAULT 0,    -- CDN service price
  bdix_price REAL DEFAULT 0,   -- BDIX service price
  baishan_price REAL DEFAULT 0,-- Baishan service price
  total_bill REAL DEFAULT 0,
  total_received REAL DEFAULT 0,
  total_due REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
```

### Indexes and Performance
```sql
-- Planned indexes for performance
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_serial ON customers(serial_number);
CREATE INDEX idx_bills_customer ON bill_records(customer_id);
CREATE INDEX idx_bills_status ON bill_records(status);
CREATE INDEX idx_bills_date ON bill_records(billing_date);
```

## 🔄 Data Flow

### Request Lifecycle
1. **Client Request** → Express middleware
2. **Route Matching** → Controller selection
3. **Input Validation** → Data sanitization
4. **Model Operation** → Database query
5. **Response Formatting** → JSON response
6. **Error Handling** → Appropriate error response

### File Upload Flow
1. **File Reception** → Multer processing
2. **Format Detection** → Excel/CSV parsing
3. **Data Validation** → Column mapping
4. **Batch Processing** → Database insertion
5. **Result Reporting** → Success/error summary

## 🧪 Testing & Quality Assurance

### Manual Testing Checklist
- [ ] API endpoint functionality
- [ ] Data validation and error handling
- [ ] File upload processing
- [ ] Database operations
- [ ] Performance under load
- [ ] Security vulnerabilities

### API Testing Examples
```bash
# Health check
curl http://localhost:5000/api/health

# Create customer
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "serial_number": 1001,
    "name_of_party": "Test Customer",
    "email": "test@example.com"
  }'

# Get dashboard overview
curl http://localhost:5000/api/dashboard/overview
```

### Error Testing
- Invalid input data
- Missing required fields
- Database connection issues
- File upload failures
- Network timeouts

## 🚀 Performance Optimization

### Database Optimization
- **Connection Pooling**: Efficient connection management
- **Query Optimization**: Indexed queries
- **Batch Operations**: Bulk data processing
- **Caching**: Future Redis integration

### API Optimization
- **Response Compression**: Gzip compression
- **Pagination**: Large dataset handling
- **Rate Limiting**: Request throttling
- **Caching**: Response caching

### File Processing
- **Streaming**: Large file handling
- **Memory Management**: Efficient parsing
- **Validation**: Pre-processing validation
- **Cleanup**: Temporary file removal

## 📈 Monitoring & Logging

### Current Logging
```javascript
// Console logging for development
console.log('✓ Database connected');
console.error('✗ Database error:', err);

// Future: Winston logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Health Checks
```javascript
// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected' // Future: actual DB check
  });
});
```

## 🔧 Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Manual restart (if needed)
npm start
```

### Code Organization
- **Consistent Naming**: camelCase for variables/functions
- **JSDoc Comments**: Function documentation
- **Error Handling**: Try/catch in all async functions
- **Modular Structure**: Single responsibility principle

### Git Workflow
```bash
# Feature development
git checkout -b feature/new-endpoint
git add .
git commit -m "Add new customer endpoint"
git push origin feature/new-endpoint

# Code review and merge
git checkout main
git merge feature/new-endpoint
```

## 🚀 Deployment & Production

### Environment Setup
```bash
# Production environment
NODE_ENV=production
PORT=3000
DB_PATH=/var/data/sales_dashboard.db

# Security
JWT_SECRET=your-secret-key
CORS_ORIGINS=https://yourdomain.com
```

### Process Management
```bash
# PM2 process management
pm2 start server.js --name sales-dashboard
pm2 restart sales-dashboard
pm2 logs sales-dashboard

# Systemd service (alternative)
sudo systemctl start sales-dashboard
```

### Docker Deployment (Future)
```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔮 Future Enhancements

### Planned Features
- [ ] JWT Authentication & Authorization
- [ ] Rate Limiting & Security Middleware
- [ ] API Documentation (Swagger/OpenAPI)
- [ ] Comprehensive Testing Suite
- [ ] Performance Monitoring
- [ ] Database Indexing & Optimization
- [ ] Redis Caching Layer
- [ ] Email Notifications
- [ ] Advanced Analytics
- [ ] Multi-tenant Support

### Technical Improvements
- [ ] GraphQL API Option
- [ ] WebSocket Real-time Updates
- [ ] Advanced File Processing
- [ ] Database Migrations
- [ ] API Versioning
- [ ] Comprehensive Logging
- [ ] Error Tracking (Sentry)
- [ ] Performance Profiling

### Scalability Considerations
- [ ] Database Sharding
- [ ] Load Balancing
- [ ] CDN Integration
- [ ] Microservices Architecture
- [ ] Message Queue (Redis/RabbitMQ)

---

**API Version**: 1.0.0
**Last Updated**: November 2024
**Node.js Version**: 14+
**Express Version**: 5.1.0
**Database**: SQLite 3