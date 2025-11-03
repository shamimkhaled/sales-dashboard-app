# API Documentation - Sales Dashboard Analytics

## 📋 Overview

This document provides comprehensive API documentation for the Sales Dashboard Analytics system. The API follows RESTful conventions and provides endpoints for customer management, billing operations, analytics, and data import/export.

## 🔗 Base URL

```
Production: https://yourdomain.com/api
Development: http://localhost:3000/api
```

## 🔐 Authentication

**Current Status**: No authentication required (development mode)

**Future Implementation**: JWT Bearer token authentication
```
Authorization: Bearer <jwt_token>
```

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "count": 10
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## 👥 Customer API

### GET /customers - List Customers

Retrieve a list of customers with optional filtering and pagination.

#### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Search across name, email, phone | `search=john` |
| `status` | string | Filter by status | `status=Active` |
| `limit` | number | Limit results | `limit=50` |

#### Example Request
```bash
GET /api/customers?search=john&status=Active&limit=10
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "serial_number": 1001,
      "name_of_party": "John Doe Enterprises",
      "address": "123 Business St, Dhaka",
      "email": "john@example.com",
      "proprietor_name": "John Doe",
      "phone_number": "+8801712345678",
      "link_id": "LINK001",
      "remarks": "Premium client",
      "kam": "Alice Manager",
      "status": "Active",
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /customers/:id - Get Customer

Retrieve a specific customer by ID.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Customer ID |

#### Example Request
```bash
GET /api/customers/1
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "serial_number": 1001,
    "name_of_party": "John Doe Enterprises",
    "address": "123 Business St, Dhaka",
    "email": "john@example.com",
    "proprietor_name": "John Doe",
    "phone_number": "+8801712345678",
    "link_id": "LINK001",
    "remarks": "Premium client",
    "kam": "Alice Manager",
    "status": "Active",
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z"
  }
}
```

### POST /customers - Create Customer

Create a new customer record.

#### Request Body
```json
{
  "serial_number": 1002,
  "name_of_party": "Jane Smith Corp",
  "address": "456 Commerce Ave, Dhaka",
  "email": "jane@example.com",
  "proprietor_name": "Jane Smith",
  "phone_number": "+8801812345678",
  "link_id": "LINK002",
  "remarks": "New client",
  "kam": "Bob Manager",
  "status": "Active"
}
```

#### Required Fields
- `serial_number` (unique)
- `name_of_party`

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 2,
    "serial_number": 1002,
    "name_of_party": "Jane Smith Corp",
    "status": "Active",
    "created_at": "2024-01-02T10:00:00.000Z",
    "updated_at": "2024-01-02T10:00:00.000Z"
  },
  "message": "Customer created successfully"
}
```

### PUT /customers/:id - Update Customer

Update an existing customer record.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Customer ID |

#### Request Body
```json
{
  "email": "newemail@example.com",
  "phone_number": "+8801912345678",
  "remarks": "Updated client information"
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "serial_number": 1001,
    "name_of_party": "John Doe Enterprises",
    "email": "newemail@example.com",
    "phone_number": "+8801912345678",
    "remarks": "Updated client information",
    "updated_at": "2024-01-02T11:00:00.000Z"
  },
  "message": "Customer updated successfully"
}
```

### DELETE /customers/:id - Delete Customer

Delete a customer record (cascades to related bills).

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Customer ID |

#### Example Response
```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

---

## 💰 Bill API

### GET /bills - List Bills

Retrieve bills with optional filtering.

#### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `customer_id` | number | Filter by customer | `customer_id=1` |
| `status` | string | Filter by status | `status=Active` |
| `start_date` | string | Start date (YYYY-MM-DD) | `start_date=2024-01-01` |
| `end_date` | string | End date (YYYY-MM-DD) | `end_date=2024-12-31` |
| `limit` | number | Limit results | `limit=100` |

#### Example Request
```bash
GET /api/bills?customer_id=1&status=Active&limit=50
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "name_of_party": "John Doe Enterprises",
      "serial_number": 1001,
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
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /bills/stats - Bill Statistics

Get aggregated billing statistics.

#### Example Response
```json
{
  "success": true,
  "data": {
    "total_bills": 150,
    "total_amount": 2500000.00,
    "total_received": 2000000.00,
    "total_due": 500000.00,
    "avg_bill": 16666.67
  }
}
```

### GET /bills/customer/:customerId - Bills by Customer

Get all bills for a specific customer.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerId` | number | Yes | Customer ID |

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "billing_date": "2024-01-15",
      "total_bill": 13300.00,
      "total_received": 10000.00,
      "total_due": 3300.00,
      "status": "Active"
    }
  ],
  "count": 1
}
```

### POST /bills - Create Bill

Create a new bill record.

#### Request Body
```json
{
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
  "status": "Active"
}
```

#### Required Fields
- `customer_id` (must exist)

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "customer_id": 1,
    "total_bill": 13300.00,
    "total_received": 10000.00,
    "total_due": 3300.00,
    "status": "Active",
    "created_at": "2024-01-01T10:00:00.000Z"
  },
  "message": "Bill created successfully"
}
```

---

## 📈 Dashboard API

### GET /dashboard/overview - Dashboard Overview

Get main dashboard KPIs and metrics.

#### Example Response
```json
{
  "success": true,
  "data": {
    "totalCustomers": 150,
    "totalBills": 450,
    "totalBilled": 2500000.00,
    "totalReceived": 2000000.00,
    "totalDue": 500000.00,
    "collectionRate": 80.0,
    "monthlyRevenue": [
      {
        "month": "2024-01",
        "revenue": 200000.00
      }
    ]
  }
}
```

### GET /dashboard/top-customers - Top Customers

Get customers ranked by revenue.

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Number of customers to return |

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "name_of_party": "ABC Corporation",
      "serial_number": 1001,
      "bill_count": 25,
      "total_revenue": 500000.00,
      "total_received": 400000.00,
      "total_due": 100000.00
    }
  ]
}
```

### GET /dashboard/revenue-by-service - Revenue by Service

Get revenue breakdown by service type.

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "service": "IIG/QT",
      "revenue": 800000.00
    },
    {
      "service": "FNA",
      "revenue": 600000.00
    }
  ]
}
```

### GET /dashboard/collection-status - Collection Status

Get payment status distribution.

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "status": "Paid",
      "count": 300,
      "total_amount": 1800000.00
    },
    {
      "status": "Partial",
      "count": 100,
      "total_amount": 500000.00
    },
    {
      "status": "Unpaid",
      "count": 50,
      "total_amount": 200000.00
    }
  ]
}
```

### GET /dashboard/customer-status - Customer Status

Get customer status distribution.

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "status": "Active",
      "count": 140
    },
    {
      "status": "Inactive",
      "count": 10
    }
  ]
}
```

---

## 📤 Upload API

### POST /upload/customers - Upload Customers

Upload customer data from Excel or CSV file.

#### Content-Type
```
multipart/form-data
```

#### Form Data
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | Excel (.xlsx, .xls) or CSV file |

#### Expected Columns (Excel/CSV)
- `serial_number` or `Serial Number` or `S.No`
- `name_of_party` or `Name of Party` or `Customer Name` or `name`
- `address` or `Address` (optional)
- `email` or `Email` (optional)
- `proprietor_name` or `Proprietor Name` (optional)
- `phone_number` or `Phone Number` or `phone` (optional)
- `link_id` or `Link ID` (optional)
- `remarks` or `Remarks` (optional)
- `kam` or `KAM` or `Account Manager` (optional)
- `status` (optional, defaults to "Active")

#### Example Response
```json
{
  "success": true,
  "message": "Upload completed. 50 customers imported, 2 failed.",
  "data": {
    "success": 50,
    "failed": 2,
    "errors": [
      {
        "row": 3,
        "error": "Duplicate serial number",
        "data": { "serial_number": 1001, "name": "Test" }
      }
    ]
  }
}
```

### POST /upload/bills - Upload Bills

Upload bill data from Excel or CSV file.

#### Form Data
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | Excel (.xlsx, .xls) or CSV file |

#### Expected Columns
- `customer_id` (optional, will lookup by serial_number if not provided)
- `serial_number` (for customer lookup)
- `nttn_cap`, `nttn_com`, `active_date`, `billing_date`, etc.
- All bill fields as defined in the schema

#### Example Response
```json
{
  "success": true,
  "message": "Upload completed. 100 bills imported, 5 failed.",
  "data": {
    "success": 100,
    "failed": 5,
    "errors": [
      {
        "row": 15,
        "error": "Customer not found",
        "data": { "serial_number": 9999 }
      }
    ]
  }
}
```

---

## 🏥 Health Check

### GET /health - System Health

Check if the API is running and database is connected.

#### Example Response
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

---

## ⚠️ Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `NOT_FOUND` | Resource not found | 404 |
| `DUPLICATE_ENTRY` | Unique constraint violation | 409 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `FILE_UPLOAD_ERROR` | File upload failed | 400 |
| `SERVER_ERROR` | Internal server error | 500 |

## 🔄 Rate Limits

**Current**: No rate limiting implemented

**Future**: 1000 requests per hour per IP

## 📊 Data Types

### Customer Object
```typescript
interface Customer {
  id: number;
  serial_number: number;
  name_of_party: string;
  address?: string;
  email?: string;
  proprietor_name?: string;
  phone_number?: string;
  link_id?: string;
  remarks?: string;
  kam?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}
```

### Bill Object
```typescript
interface Bill {
  id: number;
  customer_id: number;
  nttn_cap?: string;
  nttn_com?: string;
  active_date?: string;
  billing_date?: string;
  termination_date?: string;
  iig_qt_price: number;
  fna_price: number;
  ggc_price: number;
  cdn_price: number;
  bdix_price: number;
  baishan_price: number;
  total_bill: number;
  total_received: number;
  total_due: number;
  discount: number;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}
```

## 🧪 Testing Examples

### Using cURL

```bash
# Get all customers
curl http://localhost:3000/api/customers

# Create customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"serial_number": 1001, "name_of_party": "Test Customer"}'

# Upload file
curl -X POST http://localhost:3000/api/upload/customers \
  -F "file=@customers.xlsx"
```

### Using JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Get customers
const customers = await api.get('/customers');

// Create customer
const newCustomer = await api.post('/customers', {
  serial_number: 1001,
  name_of_party: 'Test Customer'
});
```

## 🔮 Future API Versions

### Version 2.0 (Planned)
- JWT authentication
- API versioning in URL (`/api/v2/`)
- GraphQL support
- WebSocket real-time updates
- Advanced filtering and sorting
- Bulk operations
- API rate limiting
- Request/response compression

---

**API Version**: 1.0.0
**Last Updated**: November 2024
**Base URL**: `/api`
**Authentication**: None (development)