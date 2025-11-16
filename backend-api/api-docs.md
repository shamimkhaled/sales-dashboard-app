# API Docs

Base URL: `http://localhost:8000`
Auth: Bearer token (JWT)

## Auth

### Register (Admin/Super Admin only)
POST `/api/auth/register/`
Headers: `Authorization: Bearer <access>` (requires admin or super_admin role)
Request:
```json
{ "email": "user@example.com", "username": "user", "password": "Password123!" }
```
Response 201:
```json
{ "id": 1, "email": "user@example.com", "username": "user" }
```

### Login
POST `/api/auth/login/`
Request:
```json
{ "email": "user@example.com", "password": "Password123!" }
```
Response 200:
```json
{ "refresh": "...", "access": "...", "user": {"id":1,"email":"user@example.com","username":"user"} }
```

### Refresh
POST `/api/auth/refresh/`
Request:
```json
{ "refresh": "..." }
```
Response 200:
```json
{ "access": "..." }
```

### Logout
POST `/api/auth/logout/`
Headers: `Authorization: Bearer <access>`
Request:
```json
{ "refresh": "..." }
```
Response 205:
```json
{ "detail": "Logged out" }
```

## Users

### Me
GET `/api/users/me/`
Headers: `Authorization: Bearer <access>`
Response 200:
```json
{ "id":1, "email":"user@example.com", "username":"user", "role":"sales_person" }
```

### User Management (Admin/Super Admin only)

#### List Users
GET `/api/users/`
Headers: `Authorization: Bearer <access>` (requires admin or super_admin role)
Query params: `role`, `is_active`, `search`, `ordering`
Response 200:
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "username": "user",
    "first_name": "",
    "last_name": "",
    "role": 2,
    "role_name": "sales_person",
    "is_active": true,
    "created_at": "2025-11-06T10:00:00Z",
    "updated_at": "2025-11-06T10:00:00Z"
  }
]
```

#### Create User
POST `/api/users/`
Headers: `Authorization: Bearer <access>` (requires admin or super_admin role)
Request:
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "Password123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": 2,
  "is_active": true
}
```
Response 201:
```json
{
  "id": 2,
  "email": "newuser@example.com",
  "username": "newuser",
  "first_name": "John",
  "last_name": "Doe",
  "role": 2,
  "role_name": "sales_person",
  "is_active": true,
  "created_at": "2025-11-06T10:00:00Z",
  "updated_at": "2025-11-06T10:00:00Z"
}
```

#### Get User Detail
GET `/api/users/{id}/`
Headers: `Authorization: Bearer <access>` (requires admin or super_admin role)
Response 200: (same format as list)

#### Update User
PUT/PATCH `/api/users/{id}/`
Headers: `Authorization: Bearer <access>` (requires admin or super_admin role)
Request:
```json
{
  "email": "updated@example.com",
  "role": 3,
  "is_active": false
}
```
Response 200: (updated user object)

#### Delete User
DELETE `/api/users/{id}/`
Headers: `Authorization: Bearer <access>` (requires admin or super_admin role)
Response 204: No content

## Roles & Permissions (Admin/Super Admin only)

### List Permissions
GET `/api/auth/permissions/`
Headers: `Authorization: Bearer <access>` (requires admin or super_admin role)
Response 200: Array of permission objects

### List/Create Roles
GET/POST `/api/auth/roles/`
Headers: `Authorization: Bearer <access>` (requires admin or super_admin role)
Response 200/201: Role objects

### Role Detail
GET/PUT/PATCH/DELETE `/api/auth/roles/{id}/`
Headers: `Authorization: Bearer <access>` (requires admin or super_admin role)

### Assign Role to User
POST `/api/auth/assign-role/{user_id}/`
Headers: `Authorization: Bearer <access>` (requires admin or super_admin role)
Request:
```json
{ "role": "sales_person" }
```
Response 200:
```json
{ "detail": "Role assigned" }
```

## Dynamic Menu
GET `/api/auth/menu/`
Headers: `Authorization: Bearer <access>`
Response 200:
```json
[
  {"id":1,"slug":"dashboard","title":"Dashboard","path":"/dashboard","icon":"dashboard","order":1,"children":[]}
]
```

## Prospects

### List / Create
GET/POST `/api/customers/prospects/`
Headers: `Authorization: Bearer <access>`
Query params (GET): `status`, `source`, `search`, `ordering`
Request (POST):
```json
{
  "name": "Acme Prospect",
  "company_name": "Acme",
  "email": "p@acme.com",
  "phone": "+1 555 111 2222",
  "address": "456 Prospect Ave",
  "potential_revenue": 1000.00,
  "contact_person": "Jane Smith",
  "source": "website",
  "follow_up_date": "2025-12-01",
  "notes": "Interested in premium package"
}
```
Response 201:
```json
{
  "id": 1,
  "name": "Acme Prospect",
  "status": "new",
  "sales_person": 1,
  "created_at": "2025-11-13T09:45:00Z",
  "updated_at": "2025-11-13T09:45:00Z"
}
```

### Detail
GET/PUT/PATCH/DELETE `/api/customers/prospects/{id}/`
Headers: `Authorization: Bearer <access>`

## Customers

### List / Create
GET/POST `/api/customers/`
Headers: `Authorization: Bearer <access>`
Query params (GET): `assigned_sales_person`, `status`, `search`, `ordering`
Request (POST):
```json
{
  "name": "Acme Inc",
  "company_name": "Acme",
  "email": "c@acme.com",
  "phone": "+1 555 333 4444",
  "address": "123 Main St",
  "monthly_revenue": "5000.00",
  "potential_revenue": "10000.00",
  "assigned_sales_person": 2
}
```
Response 201:
```json
{
  "id": 1,
  "name": "Acme Inc",
  "email": "c@acme.com",
  "monthly_revenue": "5000.00",
  "calculated_monthly_revenue": 4500.00,
  "status": "Active",
  "assigned_sales_person_details": {
    "id": 2,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

### Detail
GET/PUT/PATCH/DELETE `/api/customers/{id}/`
Headers: `Authorization: Bearer <access>`

### Import
POST `/api/customers/import/`
Headers: `Authorization: Bearer <access>`
Form-Data: `file` (CSV/XLSX)
Response 200:
```json
{
  "success": true,
  "processed": 5,
  "created": 3,
  "updated": 2,
  "errors": []
}
```

### Export
GET `/api/customers/export/?format=excel` or `?format=csv`
Headers: `Authorization: Bearer <access>`
Downloads Excel/CSV file

## Bills (BillRecord)

### List / Create
GET/POST `/api/bills/`
Headers: `Authorization: Bearer <access>`
Query params (GET): `status`, `customer`, `billing_date`, `search`, `ordering`
Request (POST):
```json
{
  "customer": 1,
  "nttn_cap": "CAP-01",
  "nttn_com": "COM-01",
  "billing_date": "2025-11-30",
  "iig_qt": "10.00", "iig_qt_price": "100.00",
  "fna": "1.00", "fna_price": "10.00",
  "ggc": "2.00", "ggc_price": "20.00",
  "discount": "0.00", "total_received": "100.00",
  "status": "Active",
  "remarks": "Monthly bill"
}
```
Response 201:
```json
{
  "id": 1,
  "customer": 1,
  "billing_date": "2025-11-30",
  "total_bill": "130.00",
  "total_received": "100.00",
  "total_due": "30.00",
  "status": "Active",
  "customer_details": {
    "id": 1,
    "name": "Acme Inc",
    "email": "c@acme.com"
  }
}
```

### Detail
GET/PUT/PATCH/DELETE `/api/bills/{id}/`
Headers: `Authorization: Bearer <access>`

### Import
POST `/api/bills/import/`
Headers: `Authorization: Bearer <access>`
Form-Data: `file` (CSV/XLSX)
Response 200:
```json
{
  "success": true,
  "processed": 10,
  "customers_created": 2,
  "bills_created": 10,
  "errors": []
}
```

### Export
GET `/api/bills/export/?format=excel` or `?format=csv`
Headers: `Authorization: Bearer <access>`
Downloads Excel/CSV file

## Dashboard Analytics

### KPIs Summary
GET `/api/dashboard/kpis/`
Headers: `Authorization: Bearer <access>`
Response 200:
```json
{
  "total_revenue": 150000.50,
  "total_revenue_change": 12.5,
  "total_customers": 25,
  "total_customers_change": 8.3,
  "active_customers": 22,
  "active_customers_change": 4.5,
  "collection_rate": 87.5,
  "collection_rate_change": 2.1
}
```

### Weekly Revenue
GET `/api/dashboard/weekly-revenue/`
Headers: `Authorization: Bearer <access>`
Response 200:
```json
[
  {
    "week": "2025-11-04",
    "revenue": 12500.00
  },
  {
    "week": "2025-11-11",
    "revenue": 15200.50
  }
]
```

### Monthly Revenue
GET `/api/dashboard/monthly-revenue/`
Headers: `Authorization: Bearer <access>`
Response 200:
```json
[
  {
    "month": "2025-08",
    "revenue": 45000.00
  },
  {
    "month": "2025-09",
    "revenue": 52000.25
  }
]
```

### Yearly Revenue
GET `/api/dashboard/yearly-revenue/`
Headers: `Authorization: Bearer <access>`
Response 200:
```json
[
  {
    "year": 2024,
    "revenue": 580000.75
  },
  {
    "year": 2025,
    "revenue": 620000.50
  }
]
```

### Customer-wise Revenue
GET `/api/dashboard/customer-wise-revenue/`
Headers: `Authorization: Bearer <access>`
Response 200:
```json
[
  {
    "customer_id": 1,
    "customerName": "Acme Inc",
    "email": "c@acme.com",
    "status": "Active",
    "joinDate": "2025-01-15",
    "leaveDate": null,
    "totalRevenue": 25000.00,
    "totalDue": 2500.00,
    "collectionRate": 90.0,
    "kam": "john_doe"
  }
]
```

### KAM Performance
GET `/api/dashboard/kam-performance/`
Headers: `Authorization: Bearer <access>`
Response 200:
```json
[
  {
    "kam": "john_doe",
    "kam_id": 2,
    "total_customers": 5,
    "active_customers": 4,
    "total_revenue": 125000.00,
    "avg_revenue_per_customer": 25000.0
  }
]
```

## Error format (typical)
```json
{ "detail": "Invalid refresh token" }
```

