# Sales Dashboard API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication
All API endpoints (except authentication) require JWT Bearer token authentication.

**Header:**
```
Authorization: Bearer <your_access_token>
```

---

## Table of Contents
1. [Authentication](#authentication)
2. [Customers API](#customers-api)
3. [Bills API](#bills-api)
4. [Payments API](#payments-api)
5. [Packages API](#packages-api)
6. [Utility API](#utility-api)

---

## Authentication

### Login
**POST** `/api/auth/login/`

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response 200:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

---

## Customers API

### 1. List Customers
**GET** `/api/customers/`

**Query Parameters:**
- `customer_type`: Filter by type (`bw`, `channel_partner`, `soho`)
- `status`: Filter by status (`active`, `inactive`, `suspended`)
- `is_active`: Filter by active status (`true`, `false`)
- `kam_id`: Filter by KAM ID
- `search`: Search in customer_name, email, phone, customer_number, company_name
- `ordering`: Order by field (e.g., `customer_name`, `-created_at`)

**Response 200:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "customer_name": "Acme Corporation",
      "company_name": "Acme Corp",
      "email": "contact@acme.com",
      "phone": "+8801712345678",
      "address": "123 Main Street, Dhaka",
      "customer_type": "bw",
      "kam_id": 1,
      "customer_number": "CUST-00001",
      "total_client": 0,
      "total_active_client": 0,
      "previous_total_client": 0,
      "free_giveaway_client": 0,
      "default_percentage_share": "0.00",
      "contact_person": "John Doe",
      "status": "active",
      "last_bill_invoice_date": "2025-11-27T10:30:00Z",
      "is_active": true,
      "created_at": "2025-11-01T08:00:00Z",
      "updated_at": "2025-11-27T10:30:00Z",
      "kam_details": {
        "id": 1,
        "name": "John Smith",
        "email": "john@example.com",
        "phone": "+8801711111111"
      },
      "total_billed": 50000.00,
      "total_paid": 45000.00,
      "total_due": 5000.00,
      "active_entitlements_count": 2
    }
  ]
}
```

### 2. Get Customer Detail
**GET** `/api/customers/{id}/`

**Response 200:** Same structure as list item above

### 3. Create Customer
**POST** `/api/customers/`

**Request Body:**
```json
{
  "customer_name": "New Customer Inc",
  "company_name": "New Customer",
  "email": "newcustomer@example.com",
  "phone": "+8801712345678",
  "address": "456 Business Ave, Dhaka",
  "customer_type": "bw",
  "kam_id": 1,
  "total_client": 0,
  "total_active_client": 0,
  "previous_total_client": 0,
  "free_giveaway_client": 0,
  "default_percentage_share": "0.00",
  "contact_person": "Jane Doe",
  "status": "active",
  "is_active": true
}
```

**Response 201:** Created customer object

### 4. Update Customer (Partial)
**PATCH** `/api/customers/{id}/`

**Request Body:**
```json
{
  "phone": "+8801799999999",
  "status": "inactive"
}
```

**Response 200:** Updated customer object

### 5. Update Customer (Full)
**PUT** `/api/customers/{id}/`

**Request Body:** Same as Create Customer

**Response 200:** Updated customer object

### 6. Delete Customer
**DELETE** `/api/customers/{id}/`

**Response 204:** No content

### 7. Get Customer Entitlements
**GET** `/api/customers/{id}/entitlements/`

**Response 200:**
```json
[
  {
    "id": 1,
    "customer_master_id": 1,
    "bill_number": "BILL-00001",
    "activation_date": "2025-11-01",
    "nttn_company": "NTTN Corp",
    "nttn_capacity": "100 Mbps",
    "total_bill": "5000.00",
    "type_of_bw": null,
    "type_of_connection": null,
    "connected_pop": null,
    "remarks": "Monthly bandwidth entitlement",
    "created_at": "2025-11-01T08:00:00Z",
    "updated_at": "2025-11-27T10:30:00Z",
    "customer_name": "Acme Corporation",
    "customer_type": "bw",
    "details": [...],
    "details_count": 3,
    "total_entitlement_amount": 5000.00
  }
]
```

### 8. Get Customer Invoices
**GET** `/api/customers/{id}/invoices/`

**Response 200:** Array of invoice objects

### 9. Get Customer Payments
**GET** `/api/customers/{id}/payments/`

**Response 200:** Array of payment objects

### 10. Get Customer Payment History
**GET** `/api/customers/{id}/payment_history/`

**Query Parameters:**
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)

**Response 200:**
```json
{
  "payments": [...],
  "total_received": 45000.00,
  "count": 5
}
```

### 11. Get Customer Bill History
**GET** `/api/customers/{id}/bill_history/`

**Query Parameters:**
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)
- `period`: Filter period (`monthly`, `weekly`)

**Response 200:**
```json
{
  "invoices": [...],
  "count": 10,
  "total_billed": 50000.00
}
```

### 12. Get Last Bill
**GET** `/api/customers/{id}/last_bill/`

**Response 200:** Invoice object or 404 if not found

### 13. Get Previous Bill
**GET** `/api/customers/{id}/previous_bill/`

**Response 200:** Invoice object or 404 if not found

---

### KAM Master (Read Only)

### 14. List KAM Masters
**GET** `/api/customers/kam/`

**Query Parameters:**
- `search`: Search in kam_name, email, phone
- `ordering`: Order by field

**Response 200:**
```json
[
  {
    "id": 1,
    "kam_name": "John Smith",
    "phone": "+8801711111111",
    "email": "john@example.com",
    "address": "123 Office St",
    "is_active": true,
    "created_at": "2025-01-01T08:00:00Z",
    "updated_at": "2025-11-27T10:30:00Z",
    "assigned_customers_count": 5
  }
]
```

### 15. Get KAM Master Detail
**GET** `/api/customers/kam/{id}/`

**Response 200:** KAM Master object

---

## Bills API

### 1. List Entitlements
**GET** `/api/bills/entitlements/`

**Query Parameters:**
- `customer_master_id`: Filter by customer ID
- `activation_date`: Filter by activation date
- `search`: Search in bill_number, customer_name
- `ordering`: Order by field

**Response 200:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "customer_master_id": 1,
      "bill_number": "BILL-00001",
      "activation_date": "2025-11-01",
      "nttn_company": "NTTN Corp",
      "nttn_capacity": "100 Mbps",
      "total_bill": "5000.00",
      "type_of_bw": null,
      "type_of_connection": null,
      "connected_pop": null,
      "remarks": "Monthly bandwidth entitlement",
      "created_at": "2025-11-01T08:00:00Z",
      "updated_at": "2025-11-27T10:30:00Z",
      "customer_name": "Acme Corporation",
      "customer_type": "bw",
      "details": [...],
      "details_count": 3,
      "total_entitlement_amount": 5000.00
    }
  ]
}
```

### 2. Create Entitlement
**POST** `/api/bills/entitlements/`

**Request Body:**
```json
{
  "customer_master_id": 1,
  "bill_number": "BILL-00002",
  "activation_date": "2025-12-01",
  "nttn_company": "NTTN Corp",
  "nttn_capacity": "200 Mbps",
  "total_bill": "10000.00",
  "remarks": "New entitlement"
}
```

**Response 201:** Created entitlement object

### 3. Get Entitlement Details
**GET** `/api/bills/entitlements/{id}/details/`

**Response 200:**
```json
[
  {
    "id": 1,
    "cust_entitlement_id": 1,
    "start_date": "2025-11-01",
    "end_date": "2025-11-30",
    "type": "bw",
    "package_pricing_id": null,
    "mbps": "100.00",
    "unit_price": "50.00",
    "custom_mac_percentage_share": null,
    "last_changes_updated_date": "2025-11-27",
    "is_active": true,
    "status": "active",
    "created_at": "2025-11-01T08:00:00Z",
    "updated_at": "2025-11-27T10:30:00Z",
    "package_name": null,
    "line_total": 5000.00,
    "bandwidth_type": "ipt"
  }
]
```

### 4. Bulk Create Entitlement Details
**POST** `/api/bills/entitlements/{id}/details/`

**Request Body (Bandwidth Customer):**
```json
{
  "entitlement_master_id": 1,
  "bandwidth_details": [
    {
      "bandwidth_type": "ipt",
      "mbps": "50.00",
      "unit_price": "30.00",
      "start_date": "2025-12-01",
      "end_date": "2025-12-31",
      "is_active": true,
      "status": "active",
      "remarks": "IPT bandwidth"
    },
    {
      "bandwidth_type": "gcc",
      "mbps": "30.00",
      "unit_price": "25.00",
      "start_date": "2025-12-01",
      "end_date": "2025-12-31",
      "is_active": true,
      "status": "active",
      "remarks": "GCC bandwidth"
    }
  ]
}
```

**Request Body (Channel Partner Customer):**
```json
{
  "entitlement_master_id": 2,
  "channel_partner_details": [
    {
      "mbps": "100.00",
      "unit_price": "40.00",
      "custom_mac_percentage_share": "45.00",
      "start_date": "2025-12-01",
      "end_date": "2025-12-31",
      "is_active": true,
      "status": "active",
      "remarks": "Channel partner entitlement"
    }
  ]
}
```

**Response 201:** Array of created entitlement detail objects

### 5. List Entitlement Details
**GET** `/api/bills/entitlement-details/`

**Query Parameters:**
- `cust_entitlement_id`: Filter by entitlement ID
- `type`: Filter by type (`bw`, `channel_partner`, `soho`)
- `status`: Filter by status
- `is_active`: Filter by active status
- `search`: Search in bill_number
- `ordering`: Order by field

**Response 200:** Array of entitlement detail objects

### 6. Create Entitlement Detail
**POST** `/api/bills/entitlement-details/`

**Request Body (Bandwidth):**
```json
{
  "cust_entitlement_id": 1,
  "start_date": "2025-12-01",
  "end_date": "2025-12-31",
  "type": "bw",
  "mbps": "100.00",
  "unit_price": "50.00",
  "is_active": true,
  "status": "active",
  "remarks": "IPT - Monthly bandwidth"
}
```

**Request Body (Channel Partner):**
```json
{
  "cust_entitlement_id": 2,
  "start_date": "2025-12-01",
  "end_date": "2025-12-31",
  "type": "channel_partner",
  "mbps": "200.00",
  "unit_price": "40.00",
  "custom_mac_percentage_share": "45.00",
  "is_active": true,
  "status": "active"
}
```

**Response 201:** Created entitlement detail object

### 7. Get Bandwidth Types
**GET** `/api/bills/entitlement-details/bandwidth_types/`

**Query Parameters:**
- `customer_id`: Filter by customer ID

**Response 200:**
```json
{
  "ipt": [
    {
      "id": 1,
      "mbps": "100.00",
      "unit_price": "50.00",
      "bandwidth_type": "ipt",
      ...
    }
  ],
  "gcc": [...],
  "cdn": [...],
  "nix": [...],
  "baishan": [...],
  "other": []
}
```

### 8. Get Entitlement History
**GET** `/api/bills/entitlement-details/history/`

**Query Parameters:**
- `customer_id`: Filter by customer ID
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)

**Response 200:** Array of entitlement detail objects

---

### Invoices

### 9. List Invoices
**GET** `/api/bills/invoices/`

**Query Parameters:**
- `status`: Filter by status
- `customer_entitlement_master_id__customer_master_id`: Filter by customer ID
- `customer_id`: Filter by customer ID (shortcut)
- `start_date`: Filter from issue_date
- `end_date`: Filter to issue_date
- `search`: Search in invoice_number, bill_number
- `ordering`: Order by field

**Response 200:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "customer_entitlement_master_id": 1,
      "invoice_number": "INV202500001",
      "issue_date": "2025-11-01",
      "due_date": "2025-11-15",
      "status": "paid",
      "total_bill_amount": "5750.00",
      "total_paid_amount": "5750.00",
      "total_balance_due": "0.00",
      "total_vat_amount": "750.00",
      "total_discount_amount": "0.00",
      "information_master_id": 1,
      "created_at": "2025-11-01T08:00:00Z",
      "updated_at": "2025-11-27T10:30:00Z",
      "customer_name": "Acme Corporation",
      "customer_id": 1,
      "bill_number": "BILL-00001",
      "details": [...],
      "details_count": 3,
      "utility_info": {
        "id": 1,
        "vat_rate": 15.0,
        "terms_condition": "Payment due within 15 days"
      },
      "payment_status": "paid"
    }
  ]
}
```

### 10. Create Invoice
**POST** `/api/bills/invoices/`

**Request Body:**
```json
{
  "customer_entitlement_master_id": 1,
  "issue_date": "2025-12-01",
  "due_date": "2025-12-15",
  "status": "draft",
  "information_master_id": 1,
  "auto_calculate": true
}
```

**Response 201:** Created invoice object (with auto-calculated totals)

### 11. Auto-Generate Invoice
**POST** `/api/bills/invoices/auto_generate/`

**Request Body:**
```json
{
  "entitlement_id": 1
}
```

**Response 201:** Auto-generated invoice object

### 12. Get Invoice History
**GET** `/api/bills/invoices/history/`

**Query Parameters:**
- `customer_id`: Filter by customer ID
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)
- `period`: Filter period (`monthly`, `weekly`)

**Response 200:**
```json
{
  "invoices": [...],
  "count": 10,
  "totals": {
    "total_billed": 50000.00,
    "total_paid": 45000.00,
    "total_due": 5000.00
  }
}
```

### 13. List Invoice Details
**GET** `/api/bills/invoice-details/`

**Query Parameters:**
- `invoice_master_id`: Filter by invoice ID
- `search`: Search fields

**Response 200:** Array of invoice detail objects

### 14. Create Invoice Detail
**POST** `/api/bills/invoice-details/`

**Request Body:**
```json
{
  "invoice_master_id": 1,
  "entitlement_details_id": 1,
  "sub_total": "5000.00",
  "vat_rate": "15.00",
  "sub_discount_rate": "0.00",
  "remarks": "Invoice line item"
}
```

**Response 201:** Created invoice detail object

---

## Payments API

### 1. List Payments
**GET** `/api/payments/`

**Query Parameters:**
- `customer_entitlement_master_id`: Filter by entitlement ID
- `invoice_master_id`: Filter by invoice ID
- `payment_date`: Filter by payment date
- `payment_method`: Filter by payment method
- `status`: Filter by status
- `search`: Search fields
- `ordering`: Order by field

**Response 200:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "payment_date": "2025-11-15",
      "payment_method": "Bank Transfer",
      "customer_entitlement_master_id": 1,
      "invoice_master_id": 1,
      "remarks": "Monthly payment",
      "status": "completed",
      "received_by": 1,
      "created_at": "2025-11-15T10:00:00Z",
      "updated_at": "2025-11-15T10:00:00Z",
      "customer_name": "Acme Corporation",
      "customer_id": 1,
      "invoice_number": "INV202500001",
      "invoice_amount": "5750.00",
      "invoice_balance": "0.00",
      "details": [...],
      "total_paid": 5750.00,
      "details_count": 1
    }
  ]
}
```

### 2. Create Payment
**POST** `/api/payments/`

**Request Body:**
```json
{
  "payment_date": "2025-12-15",
  "payment_method": "Bank Transfer",
  "customer_entitlement_master_id": 1,
  "invoice_master_id": 1,
  "remarks": "Payment for invoice",
  "status": "completed",
  "received_by": 1
}
```

**Response 201:** Created payment object

### 3. List Payment Details
**GET** `/api/payments/payment-details/`

**Query Parameters:**
- `payment_master_id`: Filter by payment ID
- `search`: Search fields

**Response 200:** Array of payment detail objects

### 4. Create Payment Detail
**POST** `/api/payments/payment-details/`

**Request Body:**
```json
{
  "payment_master_id": 1,
  "pay_amount": "5750.00",
  "transaction_id": "TXN-12345",
  "payment_date": "2025-12-15",
  "remarks": "Full payment"
}
```

**Response 201:** Created payment detail object

---

## Packages API

### 1. List Packages
**GET** `/api/packages/`

**Query Parameters:**
- `package_type`: Filter by type (`bw`, `channel_partner`, `soho`)
- `is_active`: Filter by active status
- `search`: Search in package_name
- `ordering`: Order by field

**Response 200:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "package_name": "Home Basic 10 Mbps",
      "package_type": "soho",
      "is_active": true,
      "created_at": "2025-01-01T08:00:00Z",
      "updated_at": "2025-11-27T10:30:00Z",
      "pricings": [...],
      "active_pricing": {
        "id": 1,
        "package_master_id": 1,
        "rate": "1500.00",
        "description": "Monthly rate",
        "is_active": true,
        "val_start_at": "2025-01-01",
        "val_end_at": "2025-12-31",
        "package_name": "Home Basic 10 Mbps",
        "package_type": "soho"
      },
      "pricings_count": 2
    }
  ]
}
```

### 2. Create Package
**POST** `/api/packages/`

**Request Body:**
```json
{
  "package_name": "Home Premium 50 Mbps",
  "package_type": "soho",
  "is_active": true
}
```

**Response 201:** Created package object

### 3. List Package Pricings
**GET** `/api/packages/package-pricings/`

**Query Parameters:**
- `package_master_id`: Filter by package ID
- `is_active`: Filter by active status
- `search`: Search fields
- `ordering`: Order by field

**Response 200:** Array of package pricing objects

### 4. Create Package Pricing
**POST** `/api/packages/package-pricings/`

**Request Body:**
```json
{
  "package_master_id": 1,
  "rate": "2000.00",
  "description": "Monthly subscription rate",
  "is_active": true,
  "val_start_at": "2025-12-01",
  "val_end_at": "2025-12-31"
}
```

**Response 201:** Created package pricing object

---

## Utility API (Read Only)

### 1. List Utility Information
**GET** `/api/utility/utility-info/`

**Query Parameters:**
- `is_active`: Filter by active status
- `search`: Search in terms_condition, regards, remarks

**Response 200:**
```json
[
  {
    "id": 1,
    "terms_condition": "Payment due within 15 days of invoice date",
    "vat_rate": "15.00",
    "regards": "Thank you for your business",
    "remarks": "Standard terms apply",
    "is_active": true,
    "created_at": "2025-01-01T08:00:00Z",
    "updated_at": "2025-11-27T10:30:00Z",
    "details": [...],
    "details_count": 3,
    "active_details": [...]
  }
]
```

### 2. Get Utility Information Detail
**GET** `/api/utility/utility-info/{id}/`

**Response 200:** Utility information object

### 3. List Utility Details
**GET** `/api/utility/utility-details/`

**Query Parameters:**
- `utility_master_id`: Filter by utility master ID
- `type`: Filter by type
- `is_active`: Filter by active status
- `search`: Search in name, number, branch

**Response 200:**
```json
[
  {
    "id": 1,
    "utility_master_id": 1,
    "type": "bank",
    "name": "Prime Bank",
    "number": "1234567890",
    "branch": "Gulshan Branch",
    "routing_no": "123456",
    "swift_no": "PRIMBDDH",
    "remarks": "Main account",
    "is_active": true,
    "created_at": "2025-01-01T08:00:00Z",
    "updated_at": "2025-11-27T10:30:00Z",
    "utility_master_id_info": {
      "id": 1,
      "vat_rate": 15.0
    }
  }
]
```

### 4. Get Utility Detail
**GET** `/api/utility/utility-details/{id}/`

**Response 200:** Utility detail object

---

## Error Responses

### 400 Bad Request
```json
{
  "field_name": ["Error message"],
  "non_field_errors": ["General error message"]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "detail": "A server error occurred."
}
```

---

## Notes

1. **Date Format**: All dates should be in `YYYY-MM-DD` format
2. **DateTime Format**: All datetime fields are in ISO 8601 format (e.g., `2025-11-27T10:30:00Z`)
3. **Decimal Fields**: All monetary values are returned as strings to preserve precision
4. **Pagination**: List endpoints support pagination with `count`, `next`, `previous`, and `results` fields
5. **Filtering**: Most list endpoints support filtering via query parameters
6. **Search**: Many endpoints support text search via the `search` query parameter
7. **Ordering**: Use `ordering` parameter with field name (prefix with `-` for descending)

---

## Rate Limiting

API requests are rate-limited to prevent abuse. Contact support if you need higher limits.

---

## Support

For API support, contact: support@example.com

