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
Request (POST):
```json
{ "name":"Acme Prospect", "company_name":"Acme", "email":"p@acme.com", "phone":"+1 555 111 2222", "potential_revenue":1000 }
```
Response 201:
```json
{ "id":1, "name":"Acme Prospect", "status":"new", "sales_person":1, "created_at":"..." }
```

### Detail
GET/PUT/PATCH/DELETE `/api/customers/prospects/{id}/`

## Customers

### List / Create
GET/POST `/api/customers/`
Request (POST):
```json
{ "name":"Acme Inc", "company_name":"Acme", "email":"c@acme.com", "phone":"+1 555 333 4444", "monthly_revenue":"5000.00" }
```
Response 201:
```json
{ "id":1, "name":"Acme Inc", "email":"c@acme.com", "monthly_revenue":"5000.00" }
```

### Detail
GET/PUT/PATCH/DELETE `/api/customers/{id}/`

### Import (placeholder)
POST `/api/customers/import/`
Form-Data: `file` (CSV/XLSX)
Response 200:
```json
{ "success": true, "processed": 0, "errors": [] }
```

### Export
GET `/api/customers/export/`
Downloads CSV

### Revenue
GET `/api/customers/revenue/`
Response 200:
```json
{ "monthly": 5000.0, "weekly": 1250.0, "yearly": 60000.0 }
```

## Bills (BillRecord)

### List / Create
GET/POST `/api/bills/`
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
  "status": "Active"
}
```

### Detail
GET/PUT/PATCH/DELETE `/api/bills/{id}/`

### Import (placeholder)
POST `/api/bills/import/`
Form-Data: `file` (CSV/XLSX)
Response 200:
```json
{ "success": true, "processed": 0, "errors": [] }
```

### Export
GET `/api/bills/export/`
Downloads CSV

## Error format (typical)
```json
{ "detail": "Invalid refresh token" }
```

