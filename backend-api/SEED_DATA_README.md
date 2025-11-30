# ISP Sales Dashboard - Seed Data Command

## Overview

This command seeds the database with realistic ISP business data covering all use cases:
- ✅ Daily bills
- ✅ Weekly bills  
- ✅ Bi-weekly bills
- ✅ Monthly bills
- ✅ Date-to-date tracking
- ✅ Invoice bill date tracking
- ✅ Payment date tracking
- ✅ Sales calculations
- ✅ Historical data for any date range

## What Data is Created

### 10 Records Each:
1. **KAM Master** - Key Account Managers
2. **Package Master** - Service packages (BW, SOHO, Channel Partner)
3. **Package Pricing** - Pricing for each package
4. **Utility Information Master** - Invoice terms, VAT rates
5. **Utility Details** - Payment methods (Bank, bKash, Nagad) - 3 per utility master
6. **Customer Master** - Customers (mix of BW, SOHO, Channel Partner types)
7. **Customer Entitlement Master** - Billing records
8. **Customer Entitlement Details** - Service details with different billing periods
9. **Invoice Master** - Invoices with different statuses
10. **Invoice Details** - Invoice line items
11. **Payment Master** - Payment records
12. **Payment Details** - Payment transactions

## Usage

### Basic Usage (Add data to existing database):
```bash
cd backend-api
source env/bin/activate
python manage.py seed_isp_data
```

### Clear existing data and seed fresh:
```bash
python manage.py seed_isp_data --clear
```

## Data Coverage

### Billing Scenarios:
- **Monthly billing** - 30-day cycles
- **Bi-weekly billing** - 14-day cycles  
- **Weekly billing** - 7-day cycles
- **Daily billing** - 1-day cycles

### Customer Types:
- **Bandwidth (BW)** - Business customers with Mbps and unit pricing
- **Channel Partner** - Resellers with percentage share
- **SOHO/Home** - Residential customers with fixed rates

### Invoice Statuses:
- Draft
- Issued
- Paid
- Partially Paid

### Payment Methods:
- Bank Transfer
- bKash
- Nagad
- Cash
- Credit Card

### Payment Statuses:
- Completed
- Pending
- Failed

## Data Relationships

The seed data creates realistic relationships:
- Each customer has an assigned KAM
- Each entitlement has package pricing
- Each invoice is linked to an entitlement (1:1)
- Each invoice has utility information (VAT, terms)
- Each payment is linked to an invoice and entitlement
- Historical dates span the last 90 days

## Testing Use Cases

After seeding, you can test:

1. **Bill Tracking for Any Date:**
   ```python
   # Get bills for a specific date range
   from apps.bills.models import CustomerEntitlementMaster
   from datetime import date
   
   start = date(2024, 1, 1)
   end = date(2024, 1, 31)
   bills = CustomerEntitlementMaster.objects.filter(
       activation_date__gte=start,
       activation_date__lte=end
   )
   ```

2. **Monthly Bills:**
   ```python
   # Get all monthly bills
   bills = CustomerEntitlementMaster.objects.filter(
       remarks__icontains='Monthly'
   )
   ```

3. **Bi-weekly Bills:**
   ```python
   # Get bi-weekly bills
   bills = CustomerEntitlementMaster.objects.filter(
       remarks__icontains='Bi-weekly'
   )
   ```

4. **Invoice Date Tracking:**
   ```python
   from apps.bills.models import InvoiceMaster
   
   # Get invoices by issue date
   invoices = InvoiceMaster.objects.filter(
       issue_date__gte=start_date,
       issue_date__lte=end_date
   )
   ```

5. **Payment Date Tracking:**
   ```python
   from apps.payment.models import PaymentMaster
   
   # Get payments by date
   payments = PaymentMaster.objects.filter(
       payment_date__gte=start_date,
       payment_date__lte=end_date
   )
   ```

6. **Sales Calculations:**
   ```python
   # Total revenue
   total_revenue = InvoiceMaster.objects.aggregate(
       total=Sum('total_bill_amount')
   )
   
   # Total paid
   total_paid = PaymentMaster.objects.aggregate(
       total=Sum('details__pay_amount')
   )
   ```

## Verification

After running the command, verify data in Django admin:

1. Go to: `http://localhost:8000/admin`
2. Check each model:
   - Customers → Customer Masters
   - Customers → KAM Masters
   - Bills → Customer Entitlement Masters
   - Bills → Customer Entitlement Details
   - Bills → Invoice Masters
   - Bills → Invoice Details
   - Payments → Payment Masters
   - Payments → Payment Details
   - Packages → Package Masters
   - Packages → Package Pricings
   - Utility → Utility Information Masters
   - Utility → Utility Details

## Notes

- The command uses transaction.atomic() so all data is created or none
- Email addresses are unique - if you run multiple times, use --clear
- Dates are relative to today, so data will always be recent
- All amounts are in BDT (Bangladeshi Taka)
- Phone numbers follow Bangladesh format

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
Solution: Run with `--clear` flag to remove existing data first

### Error: "User matching query does not exist"
Solution: Make sure you have at least one user in the database (create superuser first)

### Error: "Related object does not exist"
Solution: Run migrations first: `python manage.py migrate`

## Example Output

```
Starting data seeding...
  ✓ Created KAM: Ahmed Rahman
  ✓ Created KAM: Fatima Khan
  ...
  ✓ Created Package: Business 10 Mbps with pricing
  ...
  ✓ Created Customer: TechCorp Solutions Ltd (bw)
  ...
  ✓ Created Entitlement: BILL20241001 (monthly)
  ...
  ✓ Created Invoice: INV20241001 (paid) - Amount: 45000.00
  ...
  ✓ Created Payment: 1 - Bank Transfer - 45000.00 (completed)

✅ Successfully seeded all data!
   - KAM Masters: 10
   - Customers: 10
   - Packages: 10
   - Entitlements: 10
   - Invoices: 10
   - Payments: 10
   - Utility Info: 10
```

