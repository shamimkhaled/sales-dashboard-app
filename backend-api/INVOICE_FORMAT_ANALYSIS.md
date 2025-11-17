# Invoice Format Analysis - Line by Line

## ITS Invoice Format (IT Supports)

### Header Section:
1. **Date**: `18/06/2025` (DD/MM/YYYY format)
2. **Company Information**:
   - Company Name: `CyberXTech`
   - Location: `Dakshinsurma`
   - Proprietor Name: `Md. Nahid Kamal`
   - Contact Number: `01913389536, 01300800114`
   - E-mail: `nahid5p@gmail.com`
3. **Attention**: `Md. Nahid Kamal`
4. **Invoice Number**: Format `KTL MM YYYY/XX` (e.g., `KTL 06 2025/27`)
5. **Customer ID**: Format `KTL / CompanyName / MM YYYY/ XX` (e.g., `KTL / CyberXTech / 06 2025/ 27`)

### Invoice Items Table:
| SL | Descriptions | Quantity | Unit Price | Amount (BDT) | Total Amount (BDT) |
|----|--------------|----------|------------|--------------|-------------------|
| 1  | IT Supports (1st June to 30th June-2025) | 1500 | - | - | 37,500 |
| 2  | IT Supports (1st June to 13th June-2025) | 1900 | - | - | 16,467 |
| ... | ... | ... | ... | ... | ... |

**Key Points:**
- Description format: `IT Supports (Date Range)`
- Quantity is a number (no unit specified)
- Unit Price column exists but may be empty
- Amount (BDT) column exists but may be empty
- Total Amount (BDT) is the line total

### Financial Summary:
- **Sub Total**: `2,66,057`
- **Add VAT**: (empty in example, but field exists)
- **Grand Total**: `2,66,057`
- **Amount in Words**: `Two Lac Sixty-Six Thousand Fifty-Seven Taka Only.`

### Payment Information:
- **Payment Mode**: `Kloud Technologies Limited`
- **Bank Name**: `National Credit and Commerce Bank PLC. (NCC)`
- **A/C Number**: `0050-0210013920`
- **Branch Name**: `Banani`
- **Routing Number**: `160260430`
- **Swift Code**: `NCCLBDDHBAB`
- **bKash Payment Number**: `01313752577`

### Notes:
- Total payment should be made within 7-days from invoice date
- Any discrepancies must be communicated within 3-days of receipt
- Non receipt of payment within 10th days, May led to any action from management without any further notice

### Footer:
- **Manager Name**: `Biswajit Kumar Ghosh`
- **Designation**: `Manager (Finance & Accounts)`
- **E-mail**: `biswajit.kumar@kloud.com.bd`
- **Cell**: `01727-051616`
- **Company**: `Kloud Technologies Limited`

---

## INT Invoice Format (Internet/Bandwidth - IIG)

### Header Section:
1. **Date**: `18/06/2025` (DD/MM/YYYY format)
2. **Company Information**: (Same as ITS)
3. **Attention**: (Same as ITS)
4. **Invoice Number**: Format `KTL MM YYYY/XX` (e.g., `KTL 06 2025/26`)
5. **Customer ID**: Format `IIG / CompanyName / MM YYYY/ XX` (e.g., `IIG / CyberXTech / 06 2025/ 26`)

### Invoice Items Table:
| SL | Descriptions | Quantity (Mbps) | Unit Price | Amount (BDT) | Total Amount (BDT) |
|----|--------------|-----------------|------------|--------------|-------------------|
| 1  | Monthly Bandwidth Charge (1st June to 16th June 2025) | 80 | 0 | - | 77,206 |
| 2  | Monthly Bandwidth Charge (17st June to 30th June-2025) | 85 | 0 | - | 71,778 |
| ... | ... | ... | ... | ... | ... |

**Key Points:**
- Description format: `Monthly Bandwidth Charge (Date Range)`
- Quantity unit: **Mbps** (specified in header)
- Unit Price column exists but may be 0
- Amount (BDT) column exists but may be empty
- Total Amount (BDT) is the line total

### Financial Summary:
- **Sub Total**: `1,48,984`
- **Add VAT**: `7,449` (VAT is included in INT format)
- **Grand Total**: `1,56,433`
- **Amount in Words**: `One lac Fifty-Six Thousand Four Hundred Thirty-Three Taka Only.`

### Payment Information: (Same as ITS)

### Notes: (Same as ITS)

### Footer: (Same as ITS)

---

## Key Differences Between ITS and INT:

1. **Invoice Type Prefix**:
   - ITS: `KTL` in Customer ID
   - INT: `IIG` in Customer ID

2. **Item Description**:
   - ITS: `IT Supports (Date Range)`
   - INT: `Monthly Bandwidth Charge (Date Range)`

3. **Quantity Unit**:
   - ITS: No unit specified (just number)
   - INT: `Mbps` (specified in table header)

4. **VAT Handling**:
   - ITS: VAT field exists but may be empty/zero
   - INT: VAT is typically included (7,449 in example)

5. **Invoice Number Format**: Same for both (`KTL MM YYYY/XX`)

---

## Required Fields for Backend:

### Invoice Header:
- `date` (DateField) - Invoice date
- `invoice_number` (CharField) - Auto-generated: `ITS-YYYYMMDD-XXXX` or `INT-YYYYMMDD-XXXX`
- `customer_id` (CharField) - Format: `ITS/CompanyName/YYYYMM/XX` or `INT/CompanyName/YYYYMM/XX`
- `customer_name` (from Customer model)
- `customer_company` (from Customer model)
- `customer_email` (from Customer model)
- `customer_phone` (from Customer model)
- `customer_address` (from Customer model)
- `attention` (CharField) - Optional, defaults to customer name

### Invoice Items:
- `sl` (IntegerField) - Serial number
- `description` (TextField) - Item description with date range
- `quantity` (DecimalField) - Quantity value
- `quantity_unit` (CharField) - Unit (empty for ITS, "Mbps" for INT)
- `unit_price` (DecimalField) - Unit price (may be 0 or empty)
- `amount` (DecimalField) - Line amount (may be empty, calculated)
- `total_amount` (DecimalField) - Line total (required)

### Financial Summary:
- `subtotal` (DecimalField) - Sum of all line totals
- `vat_amount` (DecimalField) - VAT amount (0 for ITS, calculated for INT)
- `grand_total` (DecimalField) - Subtotal + VAT
- `amount_in_words` (TextField) - Converted amount in words

### Payment Information (Static/Config):
- `payment_mode` (CharField) - "Kloud Technologies Limited"
- `bank_name` (CharField)
- `account_number` (CharField)
- `branch_name` (CharField)
- `routing_number` (CharField)
- `swift_code` (CharField)
- `bkash_number` (CharField)

### Notes & Footer:
- `notes` (TextField) - Payment terms and conditions
- `manager_name` (CharField)
- `manager_designation` (CharField)
- `manager_email` (CharField)
- `manager_phone` (CharField)
- `company_name` (CharField) - "Kloud Technologies Limited"

---

## Implementation Notes:

1. **Invoice Number Generation**:
   - Current: `ITS-YYYYMMDD-XXXX` or `INT-YYYYMMDD-XXXX`
   - Required: `KTL MM YYYY/XX` (e.g., `KTL 06 2025/27`)
   - Need to update generation logic

2. **Customer ID Format**:
   - Current: Not implemented
   - Required: `ITS/CompanyName/YYYYMM/XX` or `INT/CompanyName/YYYYMM/XX`

3. **Item Description**:
   - Should include date range from bill record
   - Format: `IT Supports (1st June to 30th June-2025)` or `Monthly Bandwidth Charge (1st June to 30th June-2025)`

4. **Quantity Unit**:
   - ITS: No unit (or empty string)
   - INT: "Mbps"

5. **VAT Calculation**:
   - ITS: Usually 0 or empty
   - INT: Calculate based on subtotal (e.g., 5% VAT)

6. **Amount in Words**:
   - Need to implement number-to-words conversion in Bengali/English format
   - Format: "Two Lac Sixty-Six Thousand Fifty-Seven Taka Only."

