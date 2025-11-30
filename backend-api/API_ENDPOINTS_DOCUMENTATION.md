# Sales Dashboard REST API Documentation

Complete API endpoints for Customer, Bills, Payment, Package, and Utility management.

---

## Base URL
```
http://localhost:8000/api/
```

## Authentication
All endpoints require JWT authentication. Include token in header:
```
Authorization: Bearer <your_token>
```

---

## 📋 CUSTOMERS APP

### KAM Master (GET Only)

#### List KAM Masters
```
GET /api/customers/kam/
```
**Response:**
```json
[
  {
    "id": 1,
    "kam_name": "Ahmed Rahman",
    "phone": "+8801712345678",
    "email": "ahmed.rahman@isp.com",
    "address": "Dhaka, Bangladesh",
    "is_active": true,
    "assigned_customers_count": 5,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]
```

#### Get KAM Master Detail
```
GET /api/customers/kam/{id}/
```

**Query Parameters:**
- `search`: Search by name, email, phone
- `ordering`: Order by kam_name, created_at

---

### Customer Master (Full CRUD)

#### List Customers
```
GET /api/customers/customers/
```
**Query Parameters:**
- `customer_type`: Filter by type (bw, channel_partner, soho)
- `status`: Filter by status (active, inactive, suspended)
- `kam_id`: Filter by KAM
- `search`: Search by name, email, phone, customer_number
- `ordering`: Order by customer_name, created_at, last_bill_invoice_date

**Response includes:**
- `total_billed`: Total amount billed
- `total_paid`: Total amount paid
- `total_due`: Total balance due
- `active_entitlements_count`: Number of active entitlements

#### Create Customer
```
POST /api/customers/customers/
```
**Request Body:**
```json
{
  "customer_name": "TechCorp Solutions Ltd",
  "company_name": "TechCorp Solutions",
  "email": "info@techcorp.com",
  "phone": "+8801711111111",
  "address": "House 123, Road 45, Gulshan-2, Dhaka",
  "customer_type": "bw",
  "kam_id": 1,
  "customer_number": "CUST1001",
  "contact_person": "John Doe",
  "status": "active",
  "is_active": true
}
```

#### Get Customer Detail
```
GET /api/customers/customers/{id}/
```

#### Update Customer
```
PATCH /api/customers/customers/{id}/
PUT /api/customers/customers/{id}/
```

#### Delete Customer
```
DELETE /api/customers/customers/{id}/
```

#### Customer Endpoints

**Get Customer Entitlements:**
```
GET /api/customers/customers/{id}/entitlements/
```

**Get Customer Invoices:**
```
GET /api/customers/customers/{id}/invoices/
```

**Get Customer Payments:**
```
GET /api/customers/customers/{id}/payments/
```

**Get Payment History (with date range):**
```
GET /api/customers/customers/{id}/payment_history/?start_date=2025-01-01&end_date=2025-01-31
```

**Get Bill History (with date range):**
```
GET /api/customers/customers/{id}/bill_history/?start_date=2025-01-01&end_date=2025-01-31&period=monthly
```

**Get Last Bill:**
```
GET /api/customers/customers/{id}/last_bill/
```

**Get Previous Bill:**
```
GET /api/customers/customers/{id}/previous_bill/
```

---

### Customer Entitlement Master (Full CRUD)

#### List Entitlements
```
GET /api/customers/entitlements/
```
**Query Parameters:**
- `customer_master_id`: Filter by customer
- `activation_date`: Filter by activation date
- `search`: Search by bill_number, customer name

#### Create Entitlement
```
POST /api/customers/entitlements/
```
**Request Body:**
```json
{
  "customer_master_id": 1,
  "bill_number": "BILL20241001",
  "activation_date": "2025-01-01",
  "nttn_company": "NTTN Company",
  "nttn_capacity": "100 Mbps",
  "total_bill": "50000.00",
  "type_of_bw": "Fiber",
  "type_of_connection": "Dedicated",
  "connected_pop": "POP-Dhaka",
  "remarks": "Monthly billing"
}
```

#### Get Entitlement Details
```
GET /api/customers/entitlements/{id}/details/
```

#### Bulk Create Entitlement Details
```
POST /api/customers/entitlements/{id}/details/
```

**For Bandwidth Customer:**
```json
{
  "entitlement_master_id": 1,
  "bandwidth_details": [
    {
      "bandwidth_type": "ipt",
      "mbps": 10,
      "unit_price": 20,
      "start_date": "2025-01-01",
      "end_date": "2025-01-31",
      "is_active": true,
      "status": "active"
    },
    {
      "bandwidth_type": "gcc",
      "mbps": 10,
      "unit_price": 30,
      "start_date": "2025-01-01",
      "end_date": "2025-01-31",
      "is_active": true,
      "status": "active"
    },
    {
      "bandwidth_type": "cdn",
      "mbps": 5,
      "unit_price": 15,
      "start_date": "2025-01-01",
      "end_date": "2025-01-31",
      "is_active": true,
      "status": "active"
    }
  ]
}
```

**For Channel Partner Customer:**
```json
{
  "entitlement_master_id": 2,
  "channel_partner_details": [
    {
      "mbps": 10,
      "unit_price": 20,
      "custom_mac_percentage_share": 45,
      "start_date": "2025-01-01",
      "end_date": "2025-01-31",
      "is_active": true,
      "status": "active"
    },
    {
      "mbps": 20,
      "unit_price": 50,
      "custom_mac_percentage_share": 50,
      "start_date": "2025-01-01",
      "end_date": "2025-01-31",
      "is_active": true,
      "status": "active"
    }
  ]
}
```

---

### Customer Entitlement Details (Full CRUD)

#### List Entitlement Details
```
GET /api/customers/entitlement-details/
```
**Query Parameters:**
- `cust_entitlement_id`: Filter by entitlement
- `type`: Filter by type (bw, channel_partner, soho)
- `status`: Filter by status
- `is_active`: Filter by active status

#### Create Entitlement Detail
```
POST /api/customers/entitlement-details/
```

#### Get Bandwidth Types (Grouped)
```
GET /api/customers/entitlement-details/bandwidth_types/?customer_id=1
```
**Response:**
```json
{
  "ipt": [...],
  "gcc": [...],
  "cdn": [...],
  "nix": [...],
  "baishan": [...],
  "other": [...]
}
```

#### Get History
```
GET /api/customers/entitlement-details/history/?customer_id=1&start_date=2025-01-01&end_date=2025-01-31
```

---

## 💰 BILLS APP

### Invoice Master (Full CRUD)

#### List Invoices
```
GET /api/bills/invoices/
```
**Query Parameters:**
- `customer_id`: Filter by customer
- `status`: Filter by status
- `start_date`: Filter by issue date (from)
- `end_date`: Filter by issue date (to)
- `search`: Search by invoice_number, bill_number

#### Create Invoice
```
POST /api/bills/invoices/
```
**Request Body:**
```json
{
  "customer_entitlement_master_id": 1,
  "issue_date": "2025-01-15",
  "information_master_id": 1,
  "status": "draft",
  "auto_calculate": true
}
```
**Note:** When `auto_calculate=true`, totals are automatically calculated from entitlement details.

#### Auto-Generate Invoice from Entitlement
```
POST /api/bills/invoices/auto_generate/
```
**Request Body:**
```json
{
  "entitlement_id": 1
}
```

#### Get Invoice History
```
GET /api/bills/invoices/history/?customer_id=1&start_date=2025-01-01&end_date=2025-01-31&period=monthly
```
**Response includes totals:**
```json
{
  "invoices": [...],
  "count": 10,
  "totals": {
    "total_billed": 500000.00,
    "total_paid": 300000.00,
    "total_due": 200000.00
  }
}
```

#### Update Invoice
```
PATCH /api/bills/invoices/{id}/
PUT /api/bills/invoices/{id}/
```
**Note:** Totals are automatically recalculated on update.

#### Delete Invoice
```
DELETE /api/bills/invoices/{id}/
```

---

### Invoice Details (Full CRUD)

#### List Invoice Details
```
GET /api/bills/invoice-details/
```
**Query Parameters:**
- `invoice_master_id`: Filter by invoice

#### Create Invoice Detail
```
POST /api/bills/invoice-details/
```
**Request Body:**
```json
{
  "invoice_master_id": 1,
  "entitlement_details_id": 1,
  "sub_total": 10000.00,
  "vat_rate": 15.00,
  "sub_discount_rate": 5.00,
  "remarks": "Invoice detail for bandwidth service"
}
```
**Note:** Invoice totals are automatically recalculated when details are added/updated/deleted.

---

## 💳 PAYMENT APP

### Payment Master (Full CRUD)

#### List Payments
```
GET /api/payments/payments/
```
**Query Parameters:**
- `customer_id`: Filter by customer
- `status`: Filter by status
- `payment_method`: Filter by method
- `start_date`: Filter by payment date (from)
- `end_date`: Filter by payment date (to)

#### Create Payment
```
POST /api/payments/payments/
```
**Request Body:**
```json
{
  "payment_date": "2025-01-20",
  "payment_method": "Bank Transfer",
  "customer_entitlement_master_id": 1,
  "invoice_master_id": 1,
  "remarks": "Payment for invoice INV20241001",
  "status": "completed"
}
```
**Note:** Invoice paid amount and status are automatically updated.

#### Get Payment History
```
GET /api/payments/payments/history/?customer_id=1&start_date=2025-01-01&end_date=2025-01-31
```

#### Get Payments by Customer
```
GET /api/payments/payments/by_customer/?customer_id=1&start_date=2025-01-01&end_date=2025-01-31
```
**Response:**
```json
[
  {
    "customer_id": 1,
    "customer_name": "TechCorp Solutions Ltd",
    "total_received": 50000.00,
    "payment_count": 5
  }
]
```

---

### Payment Details (Full CRUD)

#### List Payment Details
```
GET /api/payments/payment-details/
```

#### Create Payment Detail
```
POST /api/payments/payment-details/
```
**Request Body:**
```json
{
  "payment_master_id": 1,
  "pay_amount": 50000.00,
  "transaction_id": "TXN123456",
  "remarks": "Full payment",
  "status": "completed"
}
```
**Note:** Invoice totals are automatically updated.

---

## 📦 PACKAGE APP

### Package Master (CRUD)

#### List Packages
```
GET /api/packages/packages/
```
**Query Parameters:**
- `package_type`: Filter by type (bw, channel_partner, soho)
- `is_active`: Filter by active status
- `search`: Search by package_name

**Response includes:**
- `active_pricing`: Currently active pricing
- `pricings`: All pricing records
- `pricings_count`: Number of pricing records

#### Get Package Pricings
```
GET /api/packages/packages/{id}/pricings/
```

#### Create Package
```
POST /api/packages/packages/
```

#### Update Package
```
PATCH /api/packages/packages/{id}/
```

---

### Package Pricing (CRUD)

#### List Package Pricings
```
GET /api/packages/package-pricings/
```

#### Create Package Pricing
```
POST /api/packages/package-pricings/
```
**Request Body:**
```json
{
  "package_master_id": 1,
  "rate": 2500.00,
  "description": "Monthly rate for Home Standard",
  "is_active": true,
  "val_start_at": "2025-01-01",
  "val_end_at": "2025-12-31"
}
```

---

## 🏦 UTILITY APP (GET Only)

### Utility Information Master

#### List Utility Information
```
GET /api/utility/utility-info/
```

#### Get Utility Information Detail
```
GET /api/utility/utility-info/{id}/
```
**Response includes:**
- `details`: All utility details (bank, bKash, Nagad)
- `active_details`: Only active utility details
- `vat_rate`: VAT rate for invoices

---

### Utility Details

#### List Utility Details
```
GET /api/utility/utility-details/
```
**Query Parameters:**
- `utility_master_id`: Filter by utility master
- `type`: Filter by type (bank, bkash, nagad)
- `is_active`: Filter by active status
- `search`: Search by name, number

#### Get Utility Detail
```
GET /api/utility/utility-details/{id}/
```

---

## 🔄 AUTO-CALCULATIONS

### Invoice Auto-Calculation

When creating/updating invoices, totals are automatically calculated:

1. **Subtotal**: Sum of all invoice details sub_totals
2. **VAT Amount**: Sum of VAT from all details
3. **Discount Amount**: Sum of discounts from all details
4. **Total Bill Amount**: Subtotal + VAT - Discount
5. **Balance Due**: Total Bill Amount - Total Paid Amount

### Payment Auto-Update

When creating/updating payments:
1. Invoice `total_paid_amount` is updated
2. Invoice `total_balance_due` is recalculated
3. Invoice `status` is updated:
   - `paid` if balance_due = 0
   - `partial` if paid_amount > 0 but balance_due > 0
   - `unpaid` if paid_amount = 0

### Customer Last Bill Date

When invoices are created/updated:
- `CustomerMaster.last_bill_invoice_date` is automatically updated

---

## 📊 FILTERING & QUERYING

### Date Range Queries

All history endpoints support date range filtering:
```
?start_date=2025-01-01&end_date=2025-01-31
```

### Period Queries

Invoice history supports period filters:
```
?period=monthly  # Current month
?period=weekly   # Current week
```

### Customer-Specific Queries

Most endpoints support customer filtering:
```
?customer_id=1
```

---

## 📝 EXAMPLE USE CASES

### 1. Create Bandwidth Customer with Multiple Bandwidth Types

```bash
# 1. Create customer
POST /api/customers/customers/
{
  "customer_name": "TechCorp",
  "customer_type": "bw",
  ...
}

# 2. Create entitlement
POST /api/customers/entitlements/
{
  "customer_master_id": 1,
  "bill_number": "BILL20241001",
  ...
}

# 3. Bulk create bandwidth details
POST /api/customers/entitlements/1/details/
{
  "entitlement_master_id": 1,
  "bandwidth_details": [
    {"bandwidth_type": "ipt", "mbps": 10, "unit_price": 20, ...},
    {"bandwidth_type": "gcc", "mbps": 10, "unit_price": 30, ...},
    {"bandwidth_type": "cdn", "mbps": 5, "unit_price": 15, ...}
  ]
}

# 4. Auto-generate invoice
POST /api/bills/invoices/auto_generate/
{
  "entitlement_id": 1
}
```

### 2. Create Channel Partner with Multiple Rows

```bash
# 1. Create customer
POST /api/customers/customers/
{
  "customer_name": "Channel Partner Network",
  "customer_type": "channel_partner",
  ...
}

# 2. Create entitlement
POST /api/customers/entitlements/
{
  "customer_master_id": 2,
  ...
}

# 3. Bulk create channel partner details
POST /api/customers/entitlements/2/details/
{
  "entitlement_master_id": 2,
  "channel_partner_details": [
    {"mbps": 10, "unit_price": 20, "custom_mac_percentage_share": 45, ...},
    {"mbps": 20, "unit_price": 50, "custom_mac_percentage_share": 50, ...}
  ]
}
```

### 3. Get Customer Bill History

```bash
GET /api/customers/customers/1/bill_history/?start_date=2025-01-01&end_date=2025-01-31
```

### 4. Get Payment History

```bash
GET /api/customers/customers/1/payment_history/?start_date=2025-01-01&end_date=2025-01-31
```

### 5. Track Bandwidth Types

```bash
GET /api/customers/entitlement-details/bandwidth_types/?customer_id=1
```

---

## 🔐 PERMISSIONS

All endpoints require authentication and appropriate permissions:
- `customers:read` - View customers
- `customers:update` - Create/update/delete customers
- `bills:read` - View bills/invoices
- `bills:create` - Create bills/invoices
- `bills:update` - Update/delete bills/invoices

---

## 📌 NOTES

1. **Auto-calculation**: Invoice totals are automatically calculated from entitlement details
2. **Payment tracking**: Payment updates automatically update invoice status
3. **History tracking**: All changes are tracked with created_by, updated_by, timestamps
4. **Date filtering**: All history endpoints support date range queries
5. **Bulk operations**: Entitlement details can be created in bulk for bandwidth and channel partner customers

---

**For Swagger/OpenAPI documentation, visit:**
```
http://localhost:8000/api/docs/
```

