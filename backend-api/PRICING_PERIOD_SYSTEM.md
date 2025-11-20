# Pricing Period & Daily Bill Amount System

## Overview

This system allows you to track daily bill amounts for customers when prices change during the billing period. It maintains the existing `BillRecord` model unchanged while adding new models to handle pricing periods and daily calculations.

## Problem Statement

Previously, `BillRecord` stored a single set of prices for the entire billing period. However, in reality:
- Prices can change mid-month (e.g., days 1-10 have one price, days 11-30 have different prices)
- Usage amounts can vary daily
- Revenue calculations need to be accurate based on daily amounts

## Solution Architecture

### Models

1. **BillRecord** (unchanged structure, but total_bill can be auto-updated)
   - Stores the main bill information
   - Contains default prices and usage amounts
   - `total_bill` is automatically updated when pricing periods are created/updated

2. **PricingPeriod** (new)
   - Stores usage/quantity AND price changes within a billing period
   - Links to a BillRecord
   - Defines day ranges (e.g., days 1-10, days 11-31)
   - Contains **both usage/quantity AND prices** for each service component:
     - `iig_qt`, `iig_qt_price`
     - `fna`, `fna_price`
     - `ggc`, `ggc_price`
     - `cdn`, `cdn_price`
     - `bdix`, `bdix_price`
     - `baishan`, `baishan_price`
   - **Automatically updates BillRecord when saved:**
     - Usage/quantity values = sum of all periods
     - Price values = effective/weighted average prices
     - Discount = sum of all periods
     - Total bill = sum of all period totals

3. **DailyBillAmount** (new)
   - Stores calculated daily bill amounts
   - One record per day in the billing period
   - Links to PricingPeriod (if applicable)
   - Uses pricing period usage/quantities (distributed per day)
   - Contains daily amount and service breakdown

### Data Flow

```
BillRecord (billing_date: 2025-01-01 to 2025-01-31)
    ↓
PricingPeriod 1: Days 1-10
    - iig_qt_price: 100
    - fna_price: 50
    - etc.
    ↓
PricingPeriod 2: Days 11-31
    - iig_qt_price: 120 (increased)
    - fna_price: 50 (same)
    - etc.
    ↓
DailyBillAmount (for each day 1-31)
    - Day 1-10: Uses PricingPeriod 1 prices
    - Day 11-31: Uses PricingPeriod 2 prices
    - Calculates daily_amount for each day
    ↓
Total Revenue = Sum of all daily_amounts
```

## Usage Examples

### Example 1: Simple Bill (No Price Changes)

If a bill has no pricing periods, daily amounts use BillRecord prices:

```python
from apps.bills.models import BillRecord
from apps.bills.utils import calculate_daily_amounts_for_bill

# Get a bill record
bill = BillRecord.objects.get(id=1)

# Calculate daily amounts (uses BillRecord prices)
created, updated, errors = calculate_daily_amounts_for_bill(bill)

# Get total revenue from daily amounts
from apps.bills.utils import get_total_revenue_from_daily_amounts
total_revenue = get_total_revenue_from_daily_amounts(bill_record=bill)
```

### Example 2: Bill with Usage and Price Changes Mid-Month

```python
from apps.bills.models import BillRecord, PricingPeriod
from apps.bills.utils import calculate_daily_amounts_for_bill

# Get a bill record
bill = BillRecord.objects.get(id=1)

# Create pricing period for days 1-10 with usage and prices
period1 = PricingPeriod.objects.create(
    bill_record=bill,
    start_day=1,
    end_day=10,
    # Usage/Quantity amounts
    iig_qt=100,      # 100 units used in this period
    fna=50,
    ggc=30,
    cdn=20,
    bdix=15,
    baishan=10,
    # Prices per unit
    iig_qt_price=100,
    fna_price=50,
    ggc_price=30,
    cdn_price=20,
    bdix_price=15,
    baishan_price=10,
    discount=0,
)
# Note: BillRecord.total_bill is automatically updated!

# Create pricing period for days 11-31 (usage and prices changed)
period2 = PricingPeriod.objects.create(
    bill_record=bill,
    start_day=11,
    end_day=31,
    # Usage/Quantity amounts (different from period 1)
    iig_qt=150,      # More usage in this period
    fna=60,
    ggc=40,
    cdn=25,
    bdix=20,
    baishan=15,
    # Prices per unit (some increased)
    iig_qt_price=120,  # Price increased
    fna_price=50,      # Same
    ggc_price=35,      # Price increased
    cdn_price=20,      # Same
    bdix_price=15,     # Same
    baishan_price=12,  # Price increased
    discount=0,
)
# Note: BillRecord.total_bill is automatically updated again!

# Calculate daily amounts (automatically uses correct pricing period for each day)
created, updated, errors = calculate_daily_amounts_for_bill(bill)

# Days 1-10 will use period1 usage (distributed) and prices
# Days 11-31 will use period2 usage (distributed) and prices

# BillRecord is automatically updated with:
# - Usage: sum of all periods (iig_qt=250, fna=110, etc.)
# - Prices: effective prices (weighted average)
#   Example: iig_qt_price = (100*100 + 150*120) / 250 = 112
# - Total bill: period1 total + period2 total

# Optionally, explicitly finalize when all periods are complete:
from apps.bills.utils import finalize_bill_record_from_periods
summary = finalize_bill_record_from_periods(bill)
print(summary)  # Shows updated values
```

### Example 3: View Daily Amounts

```python
from apps.bills.models import DailyBillAmount

# Get all daily amounts for a bill
daily_amounts = DailyBillAmount.objects.filter(
    bill_record_id=1
).order_by('date')

for daily in daily_amounts:
    print(f"Date: {daily.date}, Amount: {daily.daily_amount}")
    print(f"Pricing Period: {daily.pricing_period}")
    print(f"Service Breakdown: {daily.service_breakdown}")
```

### Example 4: Calculate Monthly Revenue

```python
from apps.bills.utils import get_monthly_revenue_from_daily_amounts

# Get revenue for January 2025
january_revenue = get_monthly_revenue_from_daily_amounts(2025, 1)

# Get revenue for a specific customer in January 2025
from apps.customers.models import Customer
customer = Customer.objects.get(id=1)
customer_jan_revenue = get_monthly_revenue_from_daily_amounts(2025, 1, customer=customer)
```

### Example 5: Calculate Yearly Revenue

```python
from apps.bills.utils import get_yearly_revenue_from_daily_amounts

# Get revenue for 2025
yearly_revenue = get_yearly_revenue_from_daily_amounts(2025)

# Get revenue for a specific customer in 2025
customer = Customer.objects.get(id=1)
customer_yearly_revenue = get_yearly_revenue_from_daily_amounts(2025, customer=customer)
```

### Example 6: Date Range Revenue

```python
from apps.bills.utils import get_total_revenue_from_daily_amounts
from datetime import date

# Get revenue for a specific date range
start = date(2025, 1, 1)
end = date(2025, 1, 31)
revenue = get_total_revenue_from_daily_amounts(start_date=start, end_date=end)

# Get revenue for a customer in a date range
customer = Customer.objects.get(id=1)
customer_revenue = get_total_revenue_from_daily_amounts(
    start_date=start,
    end_date=end,
    customer=customer
)
```

## API Workflow

### Step 1: Create/Update BillRecord
Create or update a BillRecord as usual. The BillRecord stores the default prices and usage amounts.

### Step 2: Create Pricing Periods (Optional)
If prices change during the billing period, create PricingPeriod records:

```json
POST /api/bills/pricing-periods/
{
    "bill_record": 1,
    "start_day": 1,
    "end_day": 10,
    "iig_qt_price": 100,
    "fna_price": 50,
    "ggc_price": 30,
    "cdn_price": 20,
    "bdix_price": 15,
    "baishan_price": 10,
    "discount": 0
}
```

### Step 3: Calculate Daily Amounts
After creating pricing periods, calculate daily amounts:

```json
POST /api/bills/{bill_id}/calculate-daily-amounts/
```

This will:
- Create DailyBillAmount records for each day in the billing period
- Automatically assign the correct PricingPeriod to each day
- Calculate daily_amount based on usage and prices

### Step 4: View Daily Amounts
View daily amounts for a bill:

```json
GET /api/bills/{bill_id}/daily-amounts/
```

### Step 5: Calculate Revenue
Use daily amounts for accurate revenue calculations:

```json
GET /api/bills/revenue/daily/?start_date=2025-01-01&end_date=2025-01-31
```

## Key Functions

### `calculate_bill_record_total_from_periods(bill_record)`
Calculates and updates BillRecord based on all pricing periods.

**Updates:**
- Usage/quantity values = sum of all pricing periods
- Price values = effective/weighted average prices (total_amount / total_usage)
- Discount = sum of all periods
- Total bill = sum of all period totals

**Parameters:**
- `bill_record`: BillRecord instance

**Returns:**
- Decimal: Calculated total_bill

**Note:** This is automatically called when a PricingPeriod is saved or deleted.

### `finalize_bill_record_from_periods(bill_record)`
Finalize BillRecord by updating all values from pricing periods.
Call this when all pricing periods are complete/ended.

**Parameters:**
- `bill_record`: BillRecord instance

**Returns:**
- dict: Summary of updated values including usage, effective prices, totals

### `calculate_daily_amounts_for_bill(bill_record, recalculate=False)`
Calculates and stores daily bill amounts for all days in the billing period.
Uses pricing period usage/quantities (distributed per day) and prices.

**Parameters:**
- `bill_record`: BillRecord instance
- `recalculate`: If True, recalculates existing daily amounts

**Returns:**
- `(created_count, updated_count, errors)`

### `get_pricing_period_for_day(bill_record, day_number)`
Gets the pricing period that applies to a specific day number.

**Parameters:**
- `bill_record`: BillRecord instance
- `day_number`: Day number (1-31)

**Returns:**
- PricingPeriod instance or None

### `get_total_revenue_from_daily_amounts(...)`
Calculates total revenue from daily bill amounts.

**Parameters:**
- `bill_record`: Optional BillRecord instance
- `start_date`: Optional start date
- `end_date`: Optional end date
- `customer`: Optional Customer instance

**Returns:**
- Decimal: Total revenue

### `get_monthly_revenue_from_daily_amounts(year, month, customer=None)`
Gets monthly revenue from daily amounts.

**Parameters:**
- `year`: Year (e.g., 2025)
- `month`: Month (1-12)
- `customer`: Optional Customer instance

**Returns:**
- Decimal: Total revenue for the month

### `get_yearly_revenue_from_daily_amounts(year, customer=None)`
Gets yearly revenue from daily amounts.

**Parameters:**
- `year`: Year (e.g., 2025)
- `customer`: Optional Customer instance

**Returns:**
- Decimal: Total revenue for the year

## Migration Steps

1. **Create migrations:**
   ```bash
   python manage.py makemigrations bills
   python manage.py migrate
   ```

2. **For existing bills:**
   - Existing BillRecords remain unchanged
   - You can optionally create PricingPeriods for existing bills
   - Calculate daily amounts for existing bills using `calculate_daily_amounts_for_bill()`

3. **For new bills:**
   - Create BillRecord as usual
   - Optionally create PricingPeriods if prices change
   - Call `calculate_daily_amounts_for_bill()` to generate daily amounts

## Benefits

1. **BillRecord Unchanged:** Existing code continues to work
2. **Flexible Pricing:** Handle any number of price changes during billing period
3. **Daily Tracking:** Track revenue on a daily basis
4. **Accurate Calculations:** Revenue calculations based on actual daily amounts
5. **Historical Data:** All daily amounts are stored for historical analysis

## Notes

- If no PricingPeriods exist for a bill, daily amounts use BillRecord prices
- Daily amounts are automatically calculated when created
- You can manually override daily amounts by setting `is_calculated=False`
- Pricing periods must not overlap (each day should belong to exactly one period)
- Day numbers are 1-based (1 = first day of billing period)

