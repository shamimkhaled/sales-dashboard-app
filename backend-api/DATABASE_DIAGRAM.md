# Database Schema Diagram

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION & USERS                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│        User          │
│──────────────────────│
│ PK: id               │
│     email (unique)   │
│     username         │
│     role (FK)        │──┐
│     phone            │  │
│     avatar           │  │
│     is_active        │  │
│     created_by (FK) │  │
└──────────────────────┘  │
         │                  │
         │ 1                │
         │ has many         │
         │                  │
         ├──────────────────┼──────────────┐
         │                  │              │
         ▼                  ▼              ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│   Prospect       │  │   Customer   │  │  UserActivity│
│   (kam FK)       │  │   (kam FK)   │  │  Log         │
└──────────────────┘  └──────────────┘  └──────────────┘

┌──────────────────────┐
│        Role          │
│──────────────────────│
│ PK: id               │
│     name            │
│     description     │
│     is_active       │
└──────────────────────┘
         │
         │ M2M
         │
         ▼
┌──────────────────────┐
│     Permission       │
│──────────────────────│
│ PK: id               │
│     codename        │
│     resource        │
│     action          │
└──────────────────────┘

┌──────────────────────┐
│     MenuItem         │
│──────────────────────│
│ PK: id               │
│     slug             │
│     title            │
│     path             │
│     icon             │
│     parent (FK)      │
│     order            │
└──────────────────────┘

┌──────────────────────┐
│    AuditLog          │
│──────────────────────│
│ PK: id               │
│     user (FK)        │
│     operation        │
│     table_name       │
│     record_id        │
│     old_values       │
│     new_values       │
└──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMERS & PROSPECTS                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│      Prospect        │
│──────────────────────│
│ PK: id               │
│     name             │
│     company_name     │
│     email            │
│     phone            │
│     address          │
│     potential_revenue│
│     contact_person   │
│     source           │
│     follow_up_date   │
│     notes            │
│     status (string)  │──┐ (managed by frontend)
│     kam (FK)         │──┼──┐
│     created_at       │  │  │
│     updated_at       │  │  │
└──────────────────────┘  │  │
         │                │  │
         │ 1              │  │
         │ has many       │  │
         │                │  │
         ├────────────────┼──┼──┐
         │                │  │  │
         ▼                │  │  │
┌──────────────────┐     │  │  │
│ ProspectStatus   │     │  │  │
│ History          │     │  │  │
│──────────────────│     │  │  │
│ PK: id           │     │  │  │
│     prospect (FK)│     │  │  │
│     from_status  │     │  │  │
│     to_status    │     │  │  │
│     changed_by   │     │  │  │
└──────────────────┘     │  │  │
                         │  │  │
┌──────────────────┐     │  │  │
│ ProspectFollowUp│     │  │  │
│──────────────────│     │  │  │
│ PK: id           │     │  │  │
│     prospect (FK)│     │  │  │
│     follow_up_date│    │  │  │
│     notes        │     │  │  │
│     completed    │     │  │  │
└──────────────────┘     │  │  │
                         │  │  │
┌──────────────────┐     │  │  │
│ ProspectAttachment│    │  │  │
│──────────────────│     │  │  │
│ PK: id           │     │  │  │
│     prospect (FK)│     │  │  │
│     file         │     │  │  │
│     uploaded_by  │     │  │  │
└──────────────────┘     │  │  │
                         │  │  │
┌──────────────────────┐ │  │  │
│      Customer        │ │  │  │
│──────────────────────│ │  │  │
│ PK: id               │ │  │  │
│     name             │ │  │  │
│     company_name     │ │  │  │
│     email (unique)   │ │  │  │
│     phone            │ │  │  │
│     address          │ │  │  │
│     customer_type    │─┘  │  │ (string, managed by frontend)
│     kam (FK)         │────┘  │ (Key Account Manager)
│     link_id          │       │
│     customer_number  │       │ (unique, auto-generated)
│     status           │       │
│     created_at       │       │
│     updated_at       │       │
└──────────────────────┘       │
         │                     │
         │ 1                    │
         │ has many            │
         │                      │
         ▼                      │
┌──────────────────────┐       │
│    BillRecord        │       │
│──────────────────────│       │
│ PK: id               │       │
│     customer (FK)    │───────┘ (required, non-nullable)
│     bill_number      │
│     nttn_cap         │
│     nttn_com         │
│     active_date      │
│     billing_date     │
│     termination_date │
│     ipt, ipt_price   │ (renamed from iig_qt)
│     fna, fna_price   │
│     ggc, ggc_price   │
│     cdn, cdn_price   │
│     nix, nix_price   │ (renamed from bdix)
│baishan, baishan_price│
│     total_bill       │
│     total_received   │
│     total_due        │
│     discount         │
│     last_payment_date│
│     last_payment_mode│
│     status           │
│     remarks          │
└──────────────────────┘
         │
         │ 1
         │ has many
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ PricingPeriod    │  │ DailyBillAmount  │
│──────────────────│  │──────────────────│
│ PK: id           │  │ PK: id           │
│     bill_record  │  │     bill_record  │
│     start_day    │  │    pricing_period│
│     end_day      │  │     date         │
│     ipt, fna, etc│  │     day_number   │
│     ipt_price, etc│ │     ipt, fna, etc│
│     discount     │  │     daily_amount │
└──────────────────┘  └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         MAC & SOHO BILLING                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│      Package         │
│──────────────────────│
│ PK: id               │
│     name             │
│     mbps             │
│     rate             │
│     type (string)    │──┐ (managed by frontend, e.g., MAC, SOHO)
│     description      │  │
│     is_active        │  │
└──────────────────────┘  │
         │                 │
         │ 1               │
         │ has many        │
         │                 │
         ├─────────────────┼──────────────┐
         │                 │              │
         ▼                 ▼              ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│ MACEndCustomer   │  │ SOHOCustomer │  │  SOHOBill    │
│ (package FK)     │  │ (package FK)  │ │ (package FK) │
└──────────────────┘  └──────────────┘  └──────────────┘

┌──────────────────────┐
│    MACPartner        │
│──────────────────────│
│ PK: id               │
│     mac_cust_name    │
│     email            │
│     phone            │
│     address          │
│     mac_partner_number│ (unique, auto-generated)
│     percentage_share │
│     contact_person   │
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

┌──────────────────────┐
│   SOHOCustomer       │
│──────────────────────│
│ PK: id               │
│     cust_name        │
│     email            │
│     phone            │
│     address          │
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
         ▼
┌──────────────────┐
│   SOHOBill       │
│──────────────────│
│ PK: id           │
│     soho_customer│
│     bill_date    │
│     package (FK) │
│     rate         │
│     total_bill   │
│     status       │
└──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAYMENTS & INVOICES                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   PaymentRecord      │
│──────────────────────│
│ PK: id               │
│     payment_date     │
│     amount           │
│     payment_type     │
│     payment_method   │
│     bill_record (FK) │──┐ (nullable, for Bandwidth bills)
│     mac_bill (FK)    │──┤ (nullable, for MAC bills)
│     soho_bill (FK)   │──┤ (nullable, for SOHO bills)
│     reference_number │  │
│     notes            │  │
│     created_by (FK)  │  │
└──────────────────────┘  │
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│   BillRecord     │  │   MACBill     │  │  SOHOBill    │
│   (payments)     │  │   (payments)  │  │  (payments)  │
└──────────────────┘  └──────────────┘  └──────────────┘

┌──────────────────────┐
│      Invoice         │
│──────────────────────│
│ PK: id               │
│     invoice_number   │ (unique, auto-generated)
│     invoice_format   │ (ITS/INT)
│     bill_record (FK) │──┐ (OneToOne)
│     issue_date       │  │
│     due_date         │  │
│     status           │  │
│     subtotal         │  │
│     tax_amount       │  │
│     discount_amount  │  │
│     total_amount     │  │
│     paid_amount      │  │
│     balance_due      │  │
│     amount_in_words  │  │
│     notes            │  │
│     terms            │  │
│     payment_mode     │  │
│     bank_name        │  │
│     account_number   │  │
│     created_by (FK)  │  │
└──────────────────────┘  │
         │                │
         │ 1              │
         │ has many       │
         │                │
         ▼                │
┌──────────────────┐     │
│  InvoiceItem     │     │
│──────────────────│     │
│ PK: id           │     │
│     invoice (FK) │     │
│     serial_number│     │
│     service_name │     │
│     description  │     │
│     quantity     │     │
│     unit_price   │     │
│     amount       │     │
│     line_total   │     │
│     service_type │     │
└──────────────────┘     │
                          │
                          ▼
                  ┌──────────────────┐
                  │   BillRecord     │
                  │   (1:1 invoice)  │
                  └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         FEEDBACK SYSTEM                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│      Feedback        │
│──────────────────────│
│ PK: id               │
│     title            │
│     description      │
│     category         │
│     priority         │
│     status           │
│     submitted_by (FK) │
│     email            │
│     expected_benefit │
│     use_case         │
│     attachment       │
│     vote_count       │
│     view_count       │
│     reviewed_by (FK) │
└──────────────────────┘
         │
         │ 1
         │ has many
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ FeedbackComment   │  │  FeedbackVote     │
│──────────────────│  │──────────────────│
│ PK: id           │  │ PK: id           │
│     feedback (FK)│  │     feedback (FK)│
│     user (FK)    │  │     user (FK)    │
│     content      │  │     created_at   │
│     is_internal  │  │                   │
└──────────────────┘  └──────────────────┘
```

---

## Key Relationships Summary

### 1. User → Prospects/Customers (KAM Assignment)
```
User (1) ──────< (many) Prospect (kam FK)
User (1) ──────< (many) Customer (kam FK)
  - KAM (Key Account Manager) assigned to prospects and customers
```

### 2. Customer → BillRecord (Required Relationship)
```
Customer (1) ──────< (many) BillRecord
  - customer field is REQUIRED (non-nullable)
  - customer_type is derived from customer.customer_type
  - No separate customer_type field in BillRecord
```

### 3. BillRecord → PricingPeriod
```
BillRecord (1) ──────< (many) PricingPeriod
  - For variable pricing during billing period
  - Supports different prices/usage for different day ranges
```

### 4. BillRecord → DailyBillAmount
```
BillRecord (1) ──────< (many) DailyBillAmount
  - Daily breakdown of bill amounts
  - Can link to PricingPeriod for variable pricing
```

### 5. BillRecord → Invoice (OneToOne)
```
BillRecord (1) ────── (1) Invoice
  - One invoice per bill record
  - Invoice is generated from bill record
```

### 6. BillRecord → PaymentRecord
```
BillRecord (1) ──────< (many) PaymentRecord
  - Tracks all payments for a bill record
  - Auto-updates total_received, last_payment_date, last_payment_mode
```

### 7. MACPartner → MACEndCustomer
```
MACPartner (1) ──────< (many) MACEndCustomer
  - Each MAC partner can have many end-customers
  - Each end-customer can have different package, rate, activation_date, bill_date
```

### 8. MACPartner → MACBill
```
MACPartner (1) ──────< (many) MACBill
  - Separate billing system for MAC partners
  - Calculates commission automatically based on percentage_share
```

### 9. SOHOCustomer → SOHOBill
```
SOHOCustomer (1) ──────< (many) SOHOBill
  - Separate billing system for SOHO customers
  - Simple flat-rate billing
```

### 10. Package → Multiple Models
```
Package (1) ──────< (many) MACEndCustomer
Package (1) ──────< (many) SOHOCustomer
Package (1) ──────< (many) SOHOBill
  - type: string field (managed by frontend, e.g., "MAC", "SOHO")
```

### 11. Prospect → Customer (Conversion)
```
Prospect (1) ──────> (1) Customer
  - Prospects can be converted to customers
  - KAM assignment is preserved during conversion
```

---

## Database Tables

### Authentication & Users

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Custom user model | `id`, `email` (unique), `username`, `role_id`, `kam` (via related_name) |
| `auth_roles` | RBAC roles | `id`, `name`, `is_active` |
| `auth_permissions` | Fine-grained permissions | `id`, `codename`, `resource`, `action` |
| `auth_menu_items` | Dynamic menu items | `id`, `slug`, `path`, `parent_id`, `order` |
| `auth_activity_logs` | User activity tracking | `id`, `user_id`, `action`, `resource`, `created_at` |
| `auth_audit_logs` | Data change audit trail | `id`, `user_id`, `operation`, `table_name`, `record_id` |

### Customers & Prospects

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sales_prospects` | Sales prospects | `id`, `name`, `email`, `status` (string), `kam_id` |
| `sales_prospect_status_history` | Prospect status changes | `id`, `prospect_id`, `from_status`, `to_status` |
| `sales_prospect_followups` | Prospect follow-ups | `id`, `prospect_id`, `follow_up_date` |
| `sales_prospect_attachments` | Prospect attachments | `id`, `prospect_id`, `file` |
| `sales_customers` | Bandwidth/Reseller customers | `id`, `email` (unique), `customer_type` (string), `kam_id`, `customer_number` (unique) |

### Billing Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `bill_records` | **Unified billing** for Bandwidth customers | `id`, `customer_id` (required), `bill_number` (unique), `ipt`, `ipt_price`, `nix`, `nix_price` |
| `bill_pricing_periods` | Variable pricing periods | `id`, `bill_record_id`, `start_day`, `end_day`, `ipt`, `ipt_price`, `nix`, `nix_price` |
| `bill_daily_amounts` | Daily bill breakdown | `id`, `bill_record_id`, `date`, `daily_amount`, `ipt`, `nix` |
| `mac_partners` | MAC/Channel partners | `id`, `mac_cust_name`, `mac_partner_number` (unique), `percentage_share` |
| `mac_end_customers` | End-customers under MAC | `id`, `mac_partner_id`, `mac_end_customer_number` (unique), `package_id`, `custom_rate` |
| `mac_bills` | MAC partner billing | `id`, `mac_partner_id`, `total_revenue`, `commission`, `total_bill` |
| `soho_customers` | SOHO/Home customers | `id`, `cust_name`, `soho_customer_number` (unique), `package_id`, `rate` |
| `soho_bills` | SOHO customer billing | `id`, `soho_customer_id`, `rate`, `total_bill` |
| `packages` | Unified package table | `id`, `name`, `type` (string), `rate`, `mbps` |

### Payment & Invoice Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `payment_records` | All payments | `id`, `bill_record_id`, `mac_bill_id`, `soho_bill_id`, `payment_date`, `amount`, `payment_type` |
| `sales_invoices` | Invoices for bill records | `id`, `invoice_number` (unique), `bill_record_id` (OneToOne), `invoice_format`, `status` |
| `sales_invoice_items` | Invoice line items | `id`, `invoice_id`, `serial_number`, `service_name`, `line_total` |

### Feedback Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `feedback` | User feedback and feature requests | `id`, `title`, `category`, `priority`, `status`, `submitted_by_id`, `vote_count` |
| `feedback_comments` | Comments on feedback | `id`, `feedback_id`, `user_id`, `content`, `is_internal` |
| `feedback_votes` | Votes on feedback | `id`, `feedback_id`, `user_id` (unique together) |

---

## Field Naming Changes

### Renamed Fields

| Old Name | New Name | Model | Notes |
|----------|----------|-------|-------|
| `assigned_sales_person` | `kam` | Customer | Key Account Manager |
| `sales_person` | `kam` | Prospect | Key Account Manager |
| `iig_qt` | `ipt` | BillRecord, PricingPeriod, DailyBillAmount | IP Transit |
| `iig_qt_price` | `ipt_price` | BillRecord, PricingPeriod | IP Transit Price |
| `bdix` | `nix` | BillRecord, PricingPeriod, DailyBillAmount | Network Internet Exchange |
| `bdix_price` | `nix_price` | BillRecord, PricingPeriod | Network Internet Exchange Price |

### Removed Fields from BillRecord

| Field | Reason |
|-------|--------|
| `customer_type` | Derived from `customer.customer_type` |
| `mac_partner` | Removed - MAC billing uses separate MACBill model |
| `soho_customer` | Removed - SOHO billing uses separate SOHOBill model |

### Changed Field Types

| Model | Field | Old Type | New Type | Notes |
|-------|-------|----------|----------|-------|
| Customer | `customer_type` | CharField with choices | CharField (string) | Managed by frontend |
| Prospect | `status` | CharField with choices | CharField (string) | Managed by frontend |
| Package | `type` | CharField with choices | CharField (string, max_length=50) | Managed by frontend |

---

## Indexes for Performance

### Customer Table
- `email` (unique)
- `customer_number` (unique)
- `customer_type` + `status` (composite index)

### Prospect Table
- `status` (indexed)
- `kam_id` (indexed via ForeignKey)

### BillRecord Table
- `bill_number` (unique)
- `customer_id` + `status` (composite index)
- `customer_id` (indexed)

### MACPartner Table
- `mac_partner_number` (unique)
- `mac_cust_name` (indexed)
- `is_active` (indexed)

### MACEndCustomer Table
- `mac_end_customer_number` (unique)
- `mac_partner_id` + `status` (composite index)
- `activation_date` (indexed)

### SOHOCustomer Table
- `soho_customer_number` (unique)
- `status` (indexed)
- `activation_date` (indexed)

### PaymentRecord Table
- `bill_record_id` (indexed)
- `mac_bill_id` (indexed)
- `soho_bill_id` (indexed)
- `payment_date` (indexed)
- `payment_type` (indexed)

### Invoice Table
- `invoice_number` (unique)
- `status` (indexed)
- `issue_date` (indexed)
- `bill_record_id` (indexed, unique via OneToOne)

---

## Auto-Generated Number Formats

| Model | Field Name | Format | Example |
|-------|------------|--------|---------|
| `Customer` | `customer_number` | `KTL-{8 chars name}-{id}` | `KTL-ABCCORP-1` |
| `BillRecord` | `bill_number` | `KTL-BL-{5 chars name}-{id}-{DDMMYYYY}` | `KTL-BL-ABCCO-1-23112025` |
| `MACPartner` | `mac_partner_number` | `KTL-MAC-{8 chars name}-{id}` | `KTL-MAC-SHAMIMXX-1` |
| `MACEndCustomer` | `mac_end_customer_number` | `KTL-MACEC-{8 chars name}-{id}` | `KTL-MACEC-JOHNDOEX-1` |
| `SOHOCustomer` | `soho_customer_number` | `KTL-SOHO-{8 chars name}-{id}` | `KTL-SOHO-JANEDOEX-1` |
| `Invoice` | `invoice_number` | `KTL MM YYYY/XX` | `KTL 11 2025/27` |

**Rules:**
- All numbers are auto-generated on creation
- Names are cleaned (special characters removed)
- Names are truncated/padded to required length
- All numbers are unique and indexed
- Numbers are read-only in API responses

---

## Validation Rules

### BillRecord Validation
1. **`customer` field is REQUIRED** (non-nullable)
2. **`customer_type` is derived** from `customer.customer_type` (not stored in BillRecord)
3. **Service field names**: Use `ipt`/`ipt_price` and `nix`/`nix_price` (not `iig_qt`/`bdix`)

### PaymentRecord Validation
- At least one of: `bill_record`, `mac_bill`, or `soho_bill` must be set
- `payment_type` should match the bill type

### Prospect Validation
- `status` is a string field (no predefined choices, managed by frontend)
- `kam` is optional (nullable)

### Customer Validation
- `email` must be unique
- `customer_type` is a string field (no predefined choices, managed by frontend)
- `kam` is optional (nullable)

### Package Validation
- `type` is a string field (no predefined choices, managed by frontend)
- Common values: "MAC", "SOHO" (but frontend can use any value)

---

## Data Flow Examples

### 1. Bandwidth Customer Billing Flow
```
1. Create Customer (customer_type="Bandwidth", kam=user_id)
   → Customer saved with customer_number auto-generated

2. Create BillRecord (customer=customer_id, billing_date, ipt, ipt_price, nix, nix_price, ...)
   → BillRecord saved with bill_number auto-generated
   → customer_type derived from customer.customer_type

3. Create PaymentRecord (bill_record=bill_id, amount, payment_date)
   → PaymentRecord saved
   → BillRecord.total_received auto-updated
   → BillRecord.last_payment_date auto-updated

4. Generate Invoice (bill_record=bill_id)
   → Invoice created with invoice_number auto-generated
   → InvoiceItems created from bill components
```

### 2. Prospect to Customer Conversion Flow
```
1. Create Prospect (name, email, kam=user_id, status="new")
   → Prospect saved

2. Convert Prospect to Customer (prospect_id)
   → Customer created with data from Prospect
   → kam preserved from Prospect
   → customer_number auto-generated
```

### 3. MAC Partner Billing Flow
```
1. Create MACPartner (mac_cust_name, percentage_share)
   → MACPartner saved with mac_partner_number auto-generated

2. Create MACEndCustomers (mac_partner=partner_id, package=package_id, ...)
   → Multiple end-customers created

3. Create MACBill (mac_partner=partner_id, bill_date)
   → MACBill.total_revenue calculated from active end-customers
   → MACBill.commission auto-calculated
   → MACBill.total_bill = total_revenue - commission

4. Create PaymentRecord (mac_bill=bill_id, amount)
   → MACBill.total_received auto-updated
```

---

This diagram reflects the current database schema with all recent changes including field renames, removed fields, and updated relationships.
