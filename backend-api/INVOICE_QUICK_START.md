# Invoice System - Quick Start Guide

## Overview

The invoice system allows you to easily create and manage invoices based on bill records. Each bill can have one invoice, and invoices support two formats: **ITS** and **INT**.

## Quick Steps to Create Invoice from Bill

### Method 1: Easy Generation (Recommended)

```bash
POST /api/invoices/generate-from-bill/
Content-Type: application/json
Authorization: Bearer <your-token>

{
  "bill_record_id": 1,
  "invoice_format": "ITS"
}
```

That's it! The system will:
- ✅ Create invoice linked to the bill
- ✅ Auto-generate invoice number (e.g., ITS-20251117-0001)
- ✅ Auto-populate invoice items from bill components
- ✅ Copy financial data from bill
- ✅ Set default dates (issue_date = today, due_date = 30 days later)

### Method 2: Full Control

```bash
POST /api/invoices/generate-from-bill/
{
  "bill_record_id": 1,
  "invoice_format": "INT",
  "issue_date": "2025-11-17",
  "due_date": "2025-12-17",
  "auto_populate_items": true,
  "tax_amount": 100.00,
  "discount_amount": 50.00,
  "notes": "Monthly service invoice",
  "terms": "Payment due within 30 days"
}
```

## Common Operations

### 1. List All Invoices
```bash
GET /api/invoices/
```

### 2. Get Invoice Details
```bash
GET /api/invoices/1/
```

### 3. Get Invoice for a Bill
```bash
GET /api/invoices/by-bill/1/
```

### 4. Get All Invoices for a Customer
```bash
GET /api/invoices/by-customer/1/
```

### 5. Mark Invoice as Issued
```bash
POST /api/invoices/1/mark-as-issued/
```

### 6. Record Payment
```bash
POST /api/invoices/1/mark-as-paid/
{
  "amount": 500.00  // Optional: defaults to full amount
}
```

### 7. Update Invoice
```bash
PATCH /api/invoices/1/
{
  "status": "issued",
  "notes": "Updated notes"
}
```

## Invoice Number Format

- **ITS Format**: `ITS-YYYYMMDD-0001`
- **INT Format**: `INT-YYYYMMDD-0001`

Example: `ITS-20251117-0001` (ITS invoice, created on Nov 17, 2025, sequence 1)

## Invoice Status Flow

```
draft → issued → sent → paid
                ↓
            overdue
                ↓
           cancelled
```

## Auto-populated Invoice Items

When `auto_populate_items: true`, the system automatically creates items from bill components:

| Bill Component | Invoice Item |
|---------------|--------------|
| iig_qt × iig_qt_price | IIG/QT Service |
| fna × fna_price | FNA Service |
| ggc × ggc_price | GGC Service |
| cdn × cdn_price | CDN Service |
| bdix × bdix_price | BDIX Service |
| baishan × baishan_price | Baishan Service |

## Example Workflow

1. **Create Bill Record**
   ```bash
   POST /api/bills/
   {
     "customer": 1,
     "billing_date": "2025-11-17",
     "iig_qt": 10,
     "iig_qt_price": 100,
     "total_bill": 1000
   }
   ```

2. **Generate Invoice from Bill**
   ```bash
   POST /api/invoices/generate-from-bill/
   {
     "bill_record_id": 1,
     "invoice_format": "ITS"
   }
   ```

3. **Mark Invoice as Issued**
   ```bash
   POST /api/invoices/1/mark-as-issued/
   ```

4. **Record Payment**
   ```bash
   POST /api/invoices/1/mark-as-paid/
   {
     "amount": 1000.00
   }
   ```

## Response Example

```json
{
  "id": 1,
  "invoice_number": "ITS-20251117-0001",
  "invoice_format": "ITS",
  "status": "draft",
  "issue_date": "2025-11-17",
  "due_date": "2025-12-17",
  "subtotal": "1300.00",
  "tax_amount": "0.00",
  "discount_amount": "0.00",
  "total_amount": "1300.00",
  "paid_amount": "0.00",
  "balance_due": "1300.00",
  "items": [
    {
      "id": 1,
      "service_name": "IIG/QT",
      "quantity": "10.00",
      "unit_price": "100.00",
      "line_total": "1000.00"
    },
    {
      "id": 2,
      "service_name": "FNA",
      "quantity": "5.00",
      "unit_price": "50.00",
      "line_total": "250.00"
    }
  ],
  "bill_details": {
    "id": 1,
    "billing_date": "2025-11-17",
    "total_bill": "1300.00"
  },
  "customer_details": {
    "id": 1,
    "name": "Acme Inc",
    "email": "contact@acme.com"
  },
  "is_overdue": false
}
```

## Next Steps

1. Run migrations: `python manage.py makemigrations invoices`
2. Apply migrations: `python manage.py migrate`
3. Seed permissions: `python manage.py seed_rbac` (to add invoice permissions)
4. Start creating invoices from bills!

