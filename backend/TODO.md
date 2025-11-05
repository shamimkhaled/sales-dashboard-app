# Backend Improvement TODO List

## Phase 1: Database & Environment Setup ✅
- [x] Update database config with MySQL credentials
- [x] Ensure MySQL tables are created properly
- [x] Test database connections for both dev/prod
- [x] Add Prospects table to database schema

## Phase 2: Enhanced Models & Database Schema ✅
- [x] Create Prospect Model with all required fields
- [x] Update Customer model with connection_type, area fields
- [x] Update Bill model with calculation verification fields
- [x] Create AuditLog Model for enhanced audit trail
- [x] Update database initialization with new tables

## Phase 3: Enhanced Authentication & RBAC
- [ ] Add sales_person role to default roles
- [ ] Update permissions for prospects access
- [ ] Implement role-specific data filtering
- [ ] Update middleware for new permissions

## Phase 4: Prospects Management System ✅
- [x] Create prospectController.js
- [x] Create prospectRoutes.js
- [x] Implement CRUD operations for prospects
- [x] Add convert prospect to customer functionality
- [x] Implement status tracking and history
- [x] Add follow-up date management
- [x] Add auto-calculations for potential revenue

## Phase 5: Calculation Verification System ✅
- [x] Add monthly/weekly/yearly revenue calculation endpoints
- [x] Implement calculation verification logic
- [x] Add audit trail for calculations
- [x] Create calculation utility functions

## Phase 6: Data Validation & Cross-check
- [ ] Enhanced email/phone validation
- [ ] Revenue amount validation
- [ ] Date range validation
- [ ] Duplicate customer/prospect checks
- [ ] Data entry error alerts
- [ ] Update validation middleware

## Phase 7: Import/Export System
- [ ] Excel/CSV import with validation
- [ ] Export filtered data by role
- [ ] PDF report generation
- [ ] Error reporting and rollback functionality
- [ ] Update excelImport.js and excelExport.js utilities

## Phase 8: Sales Person Features
- [ ] Dedicated endpoints for sales operations
- [ ] Prospect conversion tracking
- [ ] Performance metrics endpoints
- [ ] Role-based data access

## Phase 9: Testing & Documentation
- [ ] Update Swagger documentation
- [ ] Test all new endpoints
- [ ] Test role access scenarios
- [ ] Validate all workflows
- [ ] Create/update Postman collection

## Files to be Created/Modified:
- backend/config/database.js
- backend/models/Prospect.js (new)
- backend/models/Customer.js (update)
- backend/models/Bill.js (update)
- backend/models/AuditLog.js (new)
- backend/controllers/prospectController.js (new)
- backend/routes/prospectRoutes.js (new)
- backend/middleware/validation.js (update)
- backend/utils/excelImport.js (update)
- backend/utils/excelExport.js (update)
- backend/package.json (check dependencies)
