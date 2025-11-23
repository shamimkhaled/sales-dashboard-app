# Database Schema Diagram

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER TYPE SYSTEM                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│      Customer        │  (Bandwidth/Reseller Type)
│──────────────────────│
│ PK: id               │
│     name             │
│     email (unique)   │
│     phone            │
│     customer_type    │──┐
│     customer_number  │  │
│     status           │  │
│     assigned_sales   │  │
└──────────────────────┘  │
         │                 │
         │ 1                │
         │                  │
         │ has many        │
         │                  │
         ▼                  │
┌──────────────────────┐    │
│    BillRecord        │    │
│──────────────────────│    │
│ PK: id               │    │
│     customer_type    │────┘ (Bandwidth/MAC/SOHO)
│     customer_id (FK) │──────┐ (nullable, if type=Bandwidth)
│     mac_partner_id   │──────┤ (nullable, if type=MAC)
│     soho_customer_id│──────┤ (nullable, if type=SOHO)
│     bill_number      │      │
│     billing_date     │      │
│     iig_qt, fna, etc │      │
│     total_bill       │      │
│     total_received   │      │
│     last_payment_date│      │
│     last_payment_mode│      │
└──────────────────────┘      │
         │                     │
         │ 1                   │
         │ has many            │
         │                      │
         ▼                      │
┌──────────────────────┐       │
│  PaymentRecord       │       │
│──────────────────────│       │
│ PK: id               │       │
│     bill_record (FK) │───────┘
│     mac_bill (FK)    │
│     soho_bill (FK)   │
│     payment_date     │
│     amount           │
│     payment_type     │
│     payment_method   │
└──────────────────────┘


┌──────────────────────┐
│    MACPartner        │  (MAC/Channel Partner/Franchise)
│──────────────────────│
│ PK: id               │
│     mac_cust_name    │
│     email            │
│     mac_partner_number│ (unique, auto-generated)
│     percentage_share │
│     is_active        │
└──────────────────────┘
         │
         │ 1
         │ has many
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ MACEndCustomer   │  │    MACBill       │
│──────────────────│  │──────────────────│
│ PK: id           │  │ PK: id           │
│     mac_partner  │  │     mac_partner  │
│     name         │  │     bill_date    │
│     package (FK) │  │     total_client │
│     custom_rate  │  │     total_revenue│
│     activation   │  │     commission   │
│     bill_date    │  │     total_bill   │
│     status       │  │     status       │
└──────────────────┘  └──────────────────┘
         │                      │
         │                      │ 1
         │                      │ has many
         │                      │
         │                      ▼
         │              ┌──────────────────┐
         │              │  PaymentRecord   │
         │              │  (mac_bill FK)   │
         └──────────────┴──────────────────┘


┌──────────────────────┐
│   SOHOCustomer       │  (SOHO/Home Customer)
│──────────────────────│
│ PK: id               │
│     cust_name        │
│     email            │
│     soho_customer_number│ (unique, auto-generated)
│     package (FK)     │
│     rate             │
│     activation_date  │
│     status           │
└──────────────────────┘
         │
         │ 1
         │ has many
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│   SOHOBill       │  │  PaymentRecord   │
│──────────────────│  │  (soho_bill FK)  │
│ PK: id           │  │                  │
│     soho_customer│  │                  │
│     bill_date    │  │                  │
│     package (FK) │  │                  │
│     rate         │  │                  │
│     total_bill   │  │                  │
│     status       │  │                  │
└──────────────────┘  └──────────────────┘


┌──────────────────────┐
│      Package         │  (Unified Package Table)
│──────────────────────│
│ PK: id               │
│     name             │
│     mbps             │
│     rate             │
│     type             │──┐ (MAC or SOHO)
│     is_active        │  │
└──────────────────────┘  │
         │                 │
         │                 │
         │ 1               │
         │ has many        │
         │                 │
         ├─────────────────┼──────────────┐
         │                 │              │
         ▼                 ▼              ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│ MACEndCustomer   │  │ SOHOCustomer  │  │  SOHOBill    │
│ (package FK)     │  │ (package FK)  │  │ (package FK) │
└──────────────────┘  └──────────────┘  └──────────────┘


┌──────────────────────┐
│   PricingPeriod      │  (For BillRecord with variable pricing)
│──────────────────────│
│ PK: id               │
│     bill_record (FK) │──┐
│     start_day        │  │
│     end_day          │  │
│     iig_qt, fna, etc │  │
│     iig_qt_price, etc│  │
│     discount         │  │
└──────────────────────┘  │
                          │
                          │ belongs to
                          │
                          ▼
                  ┌──────────────────┐
                  │   BillRecord     │
                  │   (1 has many)   │
                  └──────────────────┘


┌──────────────────────┐
│  DailyBillAmount     │  (Daily breakdown of BillRecord)
│──────────────────────│
│ PK: id               │
│     bill_record (FK) │──┐
│     pricing_period   │  │
│     date             │  │
│     day_number       │  │
│     daily_amount     │  │
│     service_breakdown│  │
└──────────────────────┘  │
                          │
                          │ belongs to
                          │
                          ▼
                  ┌──────────────────┐
                  │   BillRecord     │
                  │   (1 has many)   │
                  └──────────────────┘
```

---

## Customer Type Flow Diagram

```
                    ┌─────────────────┐
                    │  Customer Type  │
                    │   Selection     │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
        ┌───────────┐  ┌──────────┐  ┌──────────┐
        │ Bandwidth │  │   MAC    │  │   SOHO   │
        └─────┬─────┘  └────┬─────┘  └────┬─────┘
              │             │             │
              │             │             │
              ▼             ▼             ▼
      ┌─────────────┐  ┌──────────┐  ┌──────────┐
      │  Customer   │  │ MACPartner│  │SOHOCustomer│
      │   Model     │  │  Model   │  │  Model   │
      └──────┬──────┘  └────┬─────┘  └────┬─────┘
             │              │             │
             │              │             │
             └──────┬───────┴──────┬──────┘
                    │              │
                    │              │
                    ▼              ▼
            ┌───────────────────────┐
            │    BillRecord         │
            │  (Unified Billing)    │
            │                       │
            │ customer_type:        │
            │ - Bandwidth           │
            │ - MAC                 │
            │ - SOHO                │
            └───────────┬───────────┘
                        │
                        │ has many
                        │
                        ▼
            ┌───────────────────────┐
            │   PaymentRecord       │
            │  (Payment Tracking)   │
            └───────────────────────┘
```

---

## Key Relationships Summary

### 1. Customer → BillRecord (Bandwidth Type)
```
Customer (1) ──────< (many) BillRecord
  - customer_type = "Bandwidth"
  - customer_id = Customer.id
```

### 2. MACPartner → BillRecord (MAC Type)
```
MACPartner (1) ──────< (many) BillRecord
  - customer_type = "MAC"
  - mac_partner_id = MACPartner.id
```

### 3. SOHOCustomer → BillRecord (SOHO Type)
```
SOHOCustomer (1) ──────< (many) BillRecord
  - customer_type = "SOHO"
  - soho_customer_id = SOHOCustomer.id
```

### 4. BillRecord → PaymentRecord
```
BillRecord (1) ──────< (many) PaymentRecord
  - bill_record_id = BillRecord.id
  - Auto-updates: total_received, last_payment_date, last_payment_mode
```

### 5. MACPartner → MACEndCustomer
```
MACPartner (1) ──────< (many) MACEndCustomer
  - Each MAC partner can have 200+ end-customers
  - Each end-customer can have different package, rate, activation_date, bill_date
```

### 6. MACPartner → MACBill
```
MACPartner (1) ──────< (many) MACBill
  - Separate billing system for MAC partners
  - Calculates commission automatically
```

### 7. SOHOCustomer → SOHOBill
```
SOHOCustomer (1) ──────< (many) SOHOBill
  - Separate billing system for SOHO customers
  - Simple flat-rate billing
```

### 8. Package → Multiple Models
```
Package (1) ──────< (many) MACEndCustomer
Package (1) ──────< (many) SOHOCustomer
Package (1) ──────< (many) SOHOBill
  - type: "MAC" or "SOHO"
```

---

## Database Tables

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sales_customers` | Bandwidth/Reseller customers | `id`, `customer_type`, `email`, `customer_number` |
| `mac_partners` | MAC/Channel partners | `id`, `mac_cust_name`, `mac_partner_number` (unique), `percentage_share` |
| `mac_end_customers` | End-customers under MAC | `id`, `mac_partner_id`, `mac_end_customer_number` (unique), `package_id`, `custom_rate`, `bill_date` |
| `soho_customers` | SOHO/Home customers | `id`, `cust_name`, `soho_customer_number` (unique), `package_id`, `rate` |
| `packages` | Unified package table | `id`, `name`, `type` (MAC/SOHO), `rate` |

### Billing Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `bill_records` | **Unified billing** for all types | `id`, `customer_type`, `customer_id`, `mac_partner_id`, `soho_customer_id`, `bill_number` |
| `mac_bills` | MAC partner billing | `id`, `mac_partner_id`, `total_revenue`, `commission`, `total_bill` |
| `soho_bills` | SOHO customer billing | `id`, `soho_customer_id`, `rate`, `total_bill` |
| `bill_pricing_periods` | Variable pricing periods | `id`, `bill_record_id`, `start_day`, `end_day` |
| `daily_bill_amounts` | Daily bill breakdown | `id`, `bill_record_id`, `date`, `daily_amount` |

### Payment Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `payment_records` | All payments | `id`, `bill_record_id`, `mac_bill_id`, `soho_bill_id`, `payment_date`, `amount` |

---

## API Testing Flow

### Test Flow 1: Bandwidth Customer Billing

```
1. POST /api/customers/
   → Create Customer (customer_type="Bandwidth")
   → Returns: customer_id = 1

2. POST /api/bills/
   {
     "customer_type": "Bandwidth",
     "customer": 1,
     "billing_date": "2025-01-31",
     "iig_qt": 100, "iig_qt_price": 10,
     ...
   }
   → Creates BillRecord
   → Returns: bill_id = 1

3. POST /api/bills/payments/
   {
     "bill_record": 1,
     "payment_date": "2025-02-05",
     "amount": 2000,
     "payment_type": "Bandwidth"
   }
   → Creates PaymentRecord
   → Auto-updates BillRecord.total_received, last_payment_date

4. GET /api/bills/1/
   → Returns BillRecord with updated payment info
```

### Test Flow 2: MAC Partner Billing

```
1. POST /api/bills/mac-partners/
   → Create MACPartner
   → Returns: mac_partner_id = 1

2. POST /api/bills/mac-end-customers/
   → Create MACEndCustomer (mac_partner=1)
   → Repeat for 200+ customers

3. POST /api/bills/
   {
     "customer_type": "MAC",
     "mac_partner": 1,
     "billing_date": "2025-01-31",
     ...
   }
   → Creates BillRecord (customer_type="MAC")
   → Returns: bill_id = 2

4. POST /api/bills/payments/
   {
     "bill_record": 2,
     "payment_type": "Bandwidth",  # Note: Still uses "Bandwidth" for BillRecord
     ...
   }
```

### Test Flow 3: SOHO Customer Billing

```
1. POST /api/bills/soho-customers/
   → Create SOHOCustomer
   → Returns: soho_customer_id = 1

2. POST /api/bills/
   {
     "customer_type": "SOHO",
     "soho_customer": 1,
     "billing_date": "2025-01-31",
     ...
   }
   → Creates BillRecord (customer_type="SOHO")
   → Returns: bill_id = 3
```

---

## Field Mapping by Customer Type

### BillRecord Fields Based on customer_type

| customer_type | Required FK | Optional FKs | Response Fields |
|---------------|-------------|--------------|-----------------|
| `Bandwidth` | `customer` | `mac_partner`, `soho_customer` = null | `customer_details` |
| `MAC` | `mac_partner` | `customer`, `soho_customer` = null | `mac_partner_details` |
| `SOHO` | `soho_customer` | `customer`, `mac_partner` = null | `soho_customer_details` |

---

## Indexes for Performance

### Customer Table
- `customer_type` + `status` (composite index)
- `email` (unique)
- `customer_number` (unique)

### MACPartner Table
- `mac_partner_number` (unique)
- `mac_cust_name`
- `is_active`

### MACEndCustomer Table
- `mac_end_customer_number` (unique)
- `mac_partner` + `status` (composite index)
- `activation_date`
- `status`

### SOHOCustomer Table
- `soho_customer_number` (unique)
- `status`
- `activation_date`

### BillRecord Table
- `customer_type` + `status` (composite index)
- `customer_id` (for Bandwidth type)
- `mac_partner_id` (for MAC type)
- `soho_customer_id` (for SOHO type)
- `bill_number` (unique)

### PaymentRecord Table
- `bill_record_id`
- `mac_bill_id`
- `soho_bill_id`
- `payment_date`
- `payment_type`

---

## Validation Rules

### BillRecord Validation
1. **customer_type = "Bandwidth"** → `customer` must be set, `mac_partner` and `soho_customer` must be null
2. **customer_type = "MAC"** → `mac_partner` must be set, `customer` and `soho_customer` must be null
3. **customer_type = "SOHO"** → `soho_customer` must be set, `customer` and `mac_partner` must be null

### PaymentRecord Validation
- At least one of: `bill_record`, `mac_bill`, or `soho_bill` must be set
- `payment_type` should match the bill type

---

## Quick Reference for API Testing

### Create Bill for Each Type

**Bandwidth:**
```json
POST /api/bills/
{
  "customer_type": "Bandwidth",
  "customer": 1,
  "billing_date": "2025-01-31"
}
```

**MAC:**
```json
POST /api/bills/
{
  "customer_type": "MAC",
  "mac_partner": 1,
  "billing_date": "2025-01-31"
}
```

**SOHO:**
```json
POST /api/bills/
{
  "customer_type": "SOHO",
  "soho_customer": 1,
  "billing_date": "2025-01-31"
}
```

### Filter Bills by Type

```
GET /api/bills/?customer_type=Bandwidth
GET /api/bills/?customer_type=MAC
GET /api/bills/?customer_type=SOHO
```

### Filter Customers by Type

```
GET /api/customers/?customer_type=Bandwidth
```

---

## Auto-Generated Number Formats

### Customer Numbers (All Types)

| Model | Field Name | Format | Example |
|-------|------------|--------|---------|
| `Customer` | `customer_number` | `KTL-{8 chars name}-{id}` | `KTL-ABCCORP-1` |
| `MACPartner` | `mac_partner_number` | `KTL-MAC-{8 chars name}-{id}` | `KTL-MAC-SHAMIMXX-1` |
| `MACEndCustomer` | `mac_end_customer_number` | `KTL-MACEC-{8 chars name}-{id}` | `KTL-MACEC-JOHNDOEX-1` |
| `SOHOCustomer` | `soho_customer_number` | `KTL-SOHO-{8 chars name}-{id}` | `KTL-SOHO-JANEDOEX-1` |

**Rules:**
- All numbers are auto-generated on creation
- Names are cleaned (special characters removed)
- Names are truncated/padded to 8 characters
- All numbers are unique and indexed
- Numbers are read-only in API responses

---

This diagram shows how all models connect and how to test the API for each customer type!

