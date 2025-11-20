# Pricing Period & Daily Bill Amount API Documentation

## Base URL
`/api/bills/`

All endpoints require JWT authentication: `Authorization: Bearer <token>`

## Pricing Period Endpoints

### 1. List/Create Pricing Periods
**GET/POST** `/api/bills/pricing-periods/`

**Query Parameters (GET):**
- `bill_record` - Filter by bill record ID
- `ordering` - Order by: `start_day`, `end_day`, `created_at` (default: `bill_record,start_day`)

**Request Body (POST):**
```json
{
    "bill_record": 1,
    "start_day": 1,
    "end_day": 10,
    "iig_qt": 100,
    "iig_qt_price": 100,
    "fna": 50,
    "fna_price": 50,
    "ggc": 30,
    "ggc_price": 30,
    "cdn": 20,
    "cdn_price": 20,
    "bdix": 15,
    "bdix_price": 15,
    "baishan": 10,
    "baishan_price": 10,
    "discount": 0,
    "notes": "First period pricing"
}
```

**Response (201 Created):**
```json
{
    "id": 1,
    "bill_record": 1,
    "bill_record_details": {
        "id": 1,
        "bill_number": "KTL-BL-CUST-1-01012025",
        "billing_date": "2025-01-01",
        "customer_name": "Customer Name"
    },
    "start_day": 1,
    "end_day": 10,
    "iig_qt": "100.00",
    "iig_qt_price": "100.00",
    "fna": "50.00",
    "fna_price": "50.00",
    "period_total": 12500.00,
    "days_in_period": 10,
    "discount": "0.00",
    "notes": "First period pricing",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
}
```

**Note:** Creating/updating a pricing period automatically updates the BillRecord with that period's values.

### 2. Get/Update/Delete Pricing Period
**GET/PUT/PATCH/DELETE** `/api/bills/pricing-periods/<id>/`

**Response (200 OK):**
Same format as create response.

**Note:** Deleting a pricing period automatically updates the BillRecord with values from the latest remaining period.

### 3. Get Pricing Periods by Bill
**GET** `/api/bills/<bill_id>/pricing-periods/`

**Response (200 OK):**
```json
[
    {
        "id": 1,
        "start_day": 1,
        "end_day": 10,
        "period_total": 12500.00,
        ...
    },
    {
        "id": 2,
        "start_day": 11,
        "end_day": 31,
        "period_total": 15000.00,
        ...
    }
]
```

## Daily Bill Amount Endpoints

### 1. List/Create Daily Bill Amounts
**GET/POST** `/api/bills/daily-amounts/`

**Query Parameters (GET):**
- `bill_record` - Filter by bill record ID
- `date` - Filter by specific date
- `pricing_period` - Filter by pricing period ID
- `start_date` - Filter by date range (start)
- `end_date` - Filter by date range (end)
- `ordering` - Order by: `date`, `day_number`, `daily_amount` (default: `bill_record,date`)

**Request Body (POST):**
```json
{
    "bill_record": 1,
    "pricing_period": 1,
    "date": "2025-01-01",
    "day_number": 1,
    "iig_qt": 10,
    "fna": 5,
    "ggc": 3,
    "cdn": 2,
    "bdix": 1.5,
    "baishan": 1,
    "notes": "Manual entry"
}
```

**Response (200 OK for GET):**
```json
[
    {
        "id": 1,
        "date": "2025-01-01",
        "day_number": 1,
        "daily_amount": "1250.00",
        "iig_qt": "10.00",
        "fna": "5.00",
        "pricing_period_info": {
            "id": 1,
            "start_day": 1,
            "end_day": 10
        },
        "service_breakdown": {
            "iig_qt": {
                "usage": 10.0,
                "price": 100.0,
                "amount": 1000.0
            },
            ...
        },
        "is_calculated": true,
        "created_at": "2025-01-15T10:00:00Z"
    }
]
```

### 2. Get/Update/Delete Daily Bill Amount
**GET/PUT/PATCH/DELETE** `/api/bills/daily-amounts/<id>/`

**Response (200 OK):**
Full serializer with all details.

### 3. Get Daily Bill Amounts by Bill
**GET** `/api/bills/<bill_id>/daily-amounts/`

**Response (200 OK):**
List of all daily amounts for the specified bill, ordered by date.

## Utility Endpoints

### 1. Calculate Daily Amounts
**POST** `/api/bills/<bill_id>/calculate-daily-amounts/`

**Request Body:**
```json
{
    "recalculate": false  // If true, recalculates existing daily amounts
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "message": "Calculated daily amounts: 31 created, 0 updated",
    "created": 31,
    "updated": 0,
    "errors": []
}
```

**Description:**
- Creates DailyBillAmount records for each day in the billing period
- Automatically assigns the correct PricingPeriod to each day
- Calculates daily_amount based on usage and prices

### 2. Finalize Bill Record
**POST** `/api/bills/<bill_id>/finalize/`

**Response (200 OK):**
```json
{
    "success": true,
    "message": "Bill record finalized successfully",
    "summary": {
        "updated": true,
        "bill_record_id": 1,
        "total_bill": 27500.00,
        "total_due": 27500.00,
        "usage": {
            "iig_qt": 150.0,
            "fna": 60.0,
            "ggc": 40.0,
            "cdn": 25.0,
            "bdix": 20.0,
            "baishan": 15.0
        },
        "effective_prices": {
            "iig_qt_price": 120.0,
            "fna_price": 50.0,
            "ggc_price": 35.0,
            "cdn_price": 20.0,
            "bdix_price": 15.0,
            "baishan_price": 12.0
        },
        "total_discount": 0.0,
        "periods_count": 2
    }
}
```

**Description:**
- Updates BillRecord with values from the latest pricing period
- Updates total_bill from sum of all periods
- Returns summary of updated values

## Example Workflow

### Step 1: Create Bill Record
```bash
POST /api/bills/
{
    "customer": 1,
    "billing_date": "2025-01-01",
    ...
}
```

### Step 2: Create Pricing Periods
```bash
POST /api/bills/pricing-periods/
{
    "bill_record": 1,
    "start_day": 1,
    "end_day": 10,
    "iig_qt": 100,
    "iig_qt_price": 100,
    ...
}
```

```bash
POST /api/bills/pricing-periods/
{
    "bill_record": 1,
    "start_day": 11,
    "end_day": 31,
    "iig_qt": 150,
    "iig_qt_price": 120,
    ...
}
```

### Step 3: Calculate Daily Amounts
```bash
POST /api/bills/1/calculate-daily-amounts/
{
    "recalculate": false
}
```

### Step 4: View Daily Amounts
```bash
GET /api/bills/1/daily-amounts/
```

### Step 5: Finalize Bill Record (Optional)
```bash
POST /api/bills/1/finalize/
```

## Permissions Required

- `bills:read` - View pricing periods and daily amounts
- `bills:create` - Create pricing periods and daily amounts
- `bills:update` - Update/delete pricing periods and daily amounts

## Notes

1. **Automatic Updates:** When a PricingPeriod is created/updated/deleted, the BillRecord is automatically updated with that period's values.

2. **Daily Amount Calculation:** Daily amounts are automatically calculated when created. They use pricing period usage (distributed per day) and prices.

3. **Sales Person Restriction:** Sales persons can only access bills for their assigned customers.

4. **Date Filtering:** Daily amounts can be filtered by date range using `start_date` and `end_date` query parameters.

