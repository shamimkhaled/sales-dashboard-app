# Sales Dashboard Analytics - Complete Documentation

## 📊 Overview

A premium, aristocratic-designed sales dashboard analytics system built with Node.js backend and React frontend. Features real-time KPI tracking, customer management, billing systems, and comprehensive data import/export capabilities.

## 🎨 Design Philosophy

This application showcases a **luxury aristocratic aesthetic** combined with **modern UX principles**:
- **Color Palette**: Gold (#D4AF37), Silver (#C0C0C0), and sophisticated dark themes
- **Typography**: Cormorant Garamond for headings, Inter for body text
- **Effects**: Glassmorphism, smooth animations, and premium visual elements
- **UX**: Intuitive navigation, real-time calculations, and responsive design

## 🏗️ Architecture

### Backend Structure
```
backend/
├── config/
│   └── database.js          # SQLite database configuration
├── controllers/
│   ├── customerController.js    # Customer CRUD operations
│   ├── billController.js        # Bill management
│   ├── dashboardController.js   # Analytics and KPIs
│   └── uploadController.js      # File import/export
├── models/
│   ├── Customer.js          # Customer data model
│   └── Bill.js              # Bill data model
├── routes/
│   ├── customerRoutes.js    # Customer API endpoints
│   ├── billRoutes.js        # Bill API endpoints
│   ├── dshboardRoutes.js    # Dashboard API endpoints
│   └── uploadRotues.js      # Upload API endpoints
├── middleware/              # Future middleware extensions
├── services/                # Future service layer
├── utils/                   # Utility functions
├── server.js                # Main Express server
├── package.json             # Dependencies and scripts
└── .env                     # Environment configuration
```

### Frontend Structure
```
frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Luxury navigation
│   │   ├── KPICard.jsx          # KPI display cards
│   │   ├── LoadingSpinner.jsx   # Loading states
│   │   └── ErrorAlert.jsx       # Error notifications
│   ├── pages/
│   │   ├── Dashboard.jsx        # Main analytics dashboard
│   │   └── DataEntry.jsx        # Data input forms
│   ├── services/
│   │   ├── api.js               # Axios configuration
│   │   ├── customerService.js   # Customer API calls
│   │   ├── billService.js       # Bill API calls
│   │   └── dashboardService.js  # Dashboard API calls
│   ├── App.jsx                  # Main React app
│   ├── App.css                  # Legacy styles (minimal)
│   ├── index.css                # Tailwind CSS styles
│   └── main.jsx                 # React entry point
├── package.json                 # Frontend dependencies
└── vite.config.js               # Vite configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone and Setup Backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Setup Frontend (in new terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Access Application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api

## 📋 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
Currently no authentication required (for development). Add JWT tokens for production.

### Endpoints

#### Customers API
```
GET    /customers              # Get all customers (with filters)
GET    /customers/:id          # Get customer by ID
POST   /customers              # Create new customer
PUT    /customers/:id          # Update customer
DELETE /customers/:id          # Delete customer
```

**Customer Object:**
```json
{
  "id": 1,
  "serial_number": 1001,
  "name_of_party": "ABC Corporation",
  "address": "123 Business St",
  "email": "contact@abc.com",
  "proprietor_name": "John Doe",
  "phone_number": "+8801712345678",
  "link_id": "LINK001",
  "remarks": "Premium client",
  "kam": "Account Manager Name",
  "status": "Active",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

#### Bills API
```
GET    /bills                   # Get all bills (with filters)
GET    /bills/stats             # Get bill statistics
GET    /bills/customer/:id      # Get bills by customer
GET    /bills/:id               # Get bill by ID
POST   /bills                   # Create new bill
PUT    /bills/:id               # Update bill
DELETE /bills/:id               # Delete bill
```

**Bill Object:**
```json
{
  "id": 1,
  "customer_id": 1,
  "nttn_cap": "CAP001",
  "nttn_com": "COM001",
  "active_date": "2024-01-01",
  "billing_date": "2024-01-15",
  "termination_date": null,
  "iig_qt_price": 5000.00,
  "fna_price": 3000.00,
  "ggc_price": 2000.00,
  "cdn_price": 1500.00,
  "bdix_price": 1000.00,
  "baishan_price": 800.00,
  "total_bill": 13300.00,
  "total_received": 10000.00,
  "total_due": 3300.00,
  "discount": 0.00,
  "status": "Active",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

#### Dashboard API
```
GET    /dashboard/overview              # Main dashboard KPIs
GET    /dashboard/top-customers         # Top revenue customers
GET    /dashboard/revenue-by-service    # Revenue breakdown
GET    /dashboard/collection-status     # Payment status overview
GET    /dashboard/customer-status       # Customer status distribution
```

#### Upload API
```
POST   /upload/customers     # Import customers from Excel/CSV
POST   /upload/bills        # Import bills from Excel/CSV
```

## 🎨 Frontend Components

### Core Components

#### Navbar (`Navbar.jsx`)
- **Purpose**: Luxury navigation with glassmorphism effects
- **Features**:
  - Responsive design with mobile menu
  - Animated hover effects
  - Active route highlighting
  - Premium gold accents

#### KPICard (`KPICard.jsx`)
- **Purpose**: Display key performance indicators
- **Features**:
  - 3D hover animations
  - Color-coded metrics
  - Icon integration
  - Responsive grid layout

#### LoadingSpinner (`LoadingSpinner.jsx`)
- **Purpose**: Loading state indicators
- **Features**:
  - Multiple sizes (sm, md, lg, xl)
  - Custom messages
  - Smooth animations

#### ErrorAlert (`ErrorAlert.jsx`)
- **Purpose**: Error and success notifications
- **Features**:
  - Multiple alert types (error, success, warning, info)
  - Auto-dismiss functionality
  - Icon integration
  - Smooth slide animations

### Pages

#### Dashboard (`Dashboard.jsx`)
- **Purpose**: Main analytics overview
- **Features**:
  - Real-time KPI cards
  - Performance indicators
  - Revenue analytics
  - Refresh functionality
  - Error handling

#### DataEntry (`DataEntry.jsx`)
- **Purpose**: Customer and bill data input
- **Features**:
  - Auto-calculation of amounts
  - Real-time validation
  - Professional form layout
  - Success/error feedback

## 🎯 Key Features

### Backend Features
- ✅ RESTful API design
- ✅ SQLite database with proper relationships
- ✅ File upload support (Excel/CSV)
- ✅ Comprehensive error handling
- ✅ Input validation and sanitization
- ✅ Database migrations and seeding

### Frontend Features
- ✅ Aristocratic modern design
- ✅ Fully responsive (mobile-first)
- ✅ Real-time data updates
- ✅ Smooth animations and transitions
- ✅ Error boundaries and loading states
- ✅ Accessibility compliance
- ✅ Performance optimized

### Business Features
- ✅ Customer management system
- ✅ Billing and invoicing
- ✅ Revenue analytics and KPIs
- ✅ Data import/export
- ✅ Search and filtering
- ✅ Real-time calculations
- ✅ Collection tracking

## 🔧 Development

### Backend Development
```bash
cd backend
npm install
npm run dev  # With nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev   # Vite dev server
npm run build # Production build
```

### Database
- **Type**: SQLite3
- **Location**: `backend/sales_dashboard.db`
- **Auto-creation**: Tables created on server start
- **Backup**: Regular backups recommended for production

## 🚀 Deployment

### Environment Setup
1. Set environment variables in `backend/.env`
2. Configure production database
3. Set up reverse proxy (nginx recommended)
4. Enable SSL certificates

### Production Build
```bash
# Backend
cd backend
npm run build  # If using build scripts

# Frontend
cd frontend
npm run build
# Serve dist/ folder with nginx or similar
```

## 📊 Database Schema

### Customers Table
```sql
CREATE TABLE customers (
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
);
```

### Bills Table
```sql
CREATE TABLE bill_records (
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
);
```

## 🔒 Security Considerations

### Current Implementation
- Input validation on all endpoints
- SQL injection prevention via parameterized queries
- CORS configuration
- File upload restrictions

### Production Security (TODO)
- JWT authentication
- Rate limiting
- HTTPS enforcement
- Input sanitization
- Database encryption
- Audit logging

## 🧪 Testing

### Manual Testing Checklist
- [ ] Customer CRUD operations
- [ ] Bill creation and calculations
- [ ] Dashboard KPI accuracy
- [ ] File upload functionality
- [ ] Responsive design on mobile
- [ ] Error handling scenarios
- [ ] Data validation

### API Testing
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test customer creation
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"serial_number": 1001, "name_of_party": "Test Customer"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section below
- Review the API documentation

## 🔧 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check if port 3000 is available
lsof -i :3000
# Kill process if needed
kill -9 <PID>
```

**Database connection issues:**
- Ensure SQLite3 is installed
- Check file permissions on database file
- Verify database path in config

**Frontend build issues:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**CORS errors:**
- Check backend CORS configuration
- Ensure correct API base URL in frontend

## 🚀 Future Enhancements

### Planned Features
- [ ] User authentication and authorization
- [ ] Advanced reporting and analytics
- [ ] Email notifications
- [ ] Multi-currency support
- [ ] API rate limiting
- [ ] Data export to PDF
- [ ] Real-time notifications
- [ ] Advanced search and filtering
- [ ] Role-based access control

### Technical Improvements
- [ ] Unit and integration tests
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Performance monitoring
- [ ] Database indexing optimization
- [ ] API documentation with Swagger
- [ ] GraphQL API option

---

**Version**: 1.0.0
**Last Updated**: November 2024
**Status**: Production Ready
**Maintained by**: Development Team