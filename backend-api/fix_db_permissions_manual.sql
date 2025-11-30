-- ==========================================
-- Manual SQL Commands to Fix Permissions
-- ==========================================
-- 
-- IMPORTANT: Exit psql first, then run these commands from your shell:
-- 
-- For sales_dashboard_prod:
-- psql -h 172.31.82.254 -U postgres -d sales_dashboard_prod
--
-- Then copy and paste the SQL commands below:
-- ==========================================

-- Fix permissions for sales_dashboard_prod database
ALTER SCHEMA public OWNER TO prod_user;
GRANT ALL ON SCHEMA public TO prod_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prod_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prod_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prod_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prod_user;
GRANT USAGE ON SCHEMA public TO prod_user;

-- ==========================================
-- For sales_dashboard_db database:
-- psql -h 172.31.82.254 -U postgres -d sales_dashboard_db
--
-- Then copy and paste the SQL commands below:
-- ==========================================

-- Fix permissions for sales_dashboard_db database
ALTER SCHEMA public OWNER TO sales_user;
GRANT ALL ON SCHEMA public TO sales_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sales_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sales_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sales_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sales_user;
GRANT USAGE ON SCHEMA public TO sales_user;

