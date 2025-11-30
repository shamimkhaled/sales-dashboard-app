# PostgreSQL Database Setup Guide - Sales Dashboard

Complete guide for setting up and managing PostgreSQL databases for both production and testing environments.

---

## SECTION 1: POSTGRESQL INSTALLATION & SETUP

### Installation

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verify installation
psql --version
```

### Check PostgreSQL Service

```bash
# Check if running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Enable on boot
sudo systemctl enable postgresql

# Stop PostgreSQL (when needed)
sudo systemctl stop postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## SECTION 2: CREATE DATABASES & USERS

### Access PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# You'll see prompt like:
# postgres=#
```

### Create Production Database

```sql
-- Inside PostgreSQL prompt, create production database
CREATE DATABASE sales_dashboard_prod;

-- Create production user
CREATE USER prod_user WITH PASSWORD 'Kloud@2025Secure##';

-- Configure user settings
ALTER ROLE prod_user SET client_encoding TO 'utf8';
ALTER ROLE prod_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE prod_user SET default_transaction_deferrable TO on;
ALTER ROLE prod_user SET timezone TO 'UTC';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sales_dashboard_prod TO prod_user;

-- Connect to the database
\c sales_dashboard_prod

-- Grant schema privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO prod_user;
ALTER SCHEMA public OWNER TO prod_user;

-- Grant all tables privileges (for existing and future)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prod_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prod_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prod_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prod_user;

-- Exit
\q
```

### Create Testing Database

```sql
-- Connect to PostgreSQL as admin
sudo -u postgres psql

-- Create testing database
CREATE DATABASE sales_dashboard_db;

-- Create testing user
CREATE USER sales_user WITH PASSWORD 'Kloud@2025Secure##';

-- Configure user settings
ALTER ROLE sales_user SET client_encoding TO 'utf8';
ALTER ROLE sales_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE sales_user SET default_transaction_deferrable TO on;
ALTER ROLE sales_user SET timezone TO 'UTC';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sales_dashboard_db TO sales_user;

-- Connect to the database
\c sales_dashboard_db

-- Grant schema privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO sales_user;
ALTER SCHEMA public OWNER TO sales_user;

-- Grant all tables privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sales_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sales_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sales_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sales_user;

-- Exit
\q
```

### Verify Database Creation

```bash
# List all databases
sudo -u postgres psql -c "\l"

# Should show:
# sales_dashboard_prod
# sales_dashboard_db
```

### Change Database Password

```bash
# Access PostgreSQL
sudo -u postgres psql

# Change production user password
ALTER USER prod_user WITH PASSWORD 'NewPassword@2025';

# Change testing user password
ALTER USER sales_user WITH PASSWORD 'NewPassword@2025';

# Exit
\q
```

---

## SECTION 3: CONFIGURE POSTGRESQL FOR REMOTE CONNECTION

### Edit PostgreSQL Configuration

```bash
# Find postgresql.conf (version may vary)
sudo find /etc/postgresql -name postgresql.conf

# Edit the file (replace 15 with your version)
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Find and modify these lines:

```conf
# Listen on all IP addresses (for remote access)
listen_addresses = '*'

# Or listen only on specific IPs
listen_addresses = 'localhost,172.31.82.254'

# Set max connections
max_connections = 100

# Shared memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
```

### Edit pg_hba.conf for Authentication

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Add these lines at the end:

```
# TYPE  DATABASE                USER            ADDRESS                 METHOD

# Local connections
local   all                     all                                     trust

# Production database - localhost
host    sales_dashboard_prod    prod_user      127.0.0.1/32            md5

# Production database - VM IP
host    sales_dashboard_prod    prod_user      172.31.82.254/32        md5

# Testing database - localhost
host    sales_dashboard_db      sales_user     127.0.0.1/32            md5

# Testing database - VM IP
host    sales_dashboard_db      sales_user     172.31.82.254/32        md5

# Remote connections (if needed)
host    all                     all             0.0.0.0/0               md5
```

### Restart PostgreSQL

```bash
sudo systemctl restart postgresql

# Verify
sudo systemctl status postgresql
```

---

## SECTION 4: TEST DATABASE CONNECTION

### From VM (Local)

```bash
# Test production database
psql -U prod_user -d sales_dashboard_prod -h localhost

# Test testing database
psql -U sales_user -d sales_dashboard_db -h localhost

# If success, you see:
# sales_dashboard_prod=>
# sales_dashboard_db=>
```

### From Remote Machine

```bash
# Test production database
psql -h 172.31.82.254 -U prod_user -d sales_dashboard_prod

# Test testing database
psql -h 172.31.82.254 -U sales_user -d sales_dashboard_db

# If successful, you'll get psql prompt
# Exit with \q
```

---

## SECTION 5: CONFIGURE DJANGO TO USE POSTGRESQL

### Update Django Settings

The settings are already configured in `backend-api/config/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default=''),
        'USER': config('DB_USER', default=''),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}
```

### Create .env File for Production

```bash
nano /opt/sales-dashboard/backend-api/.env
```

Add:

```env
# Database Configuration - PRODUCTION
DB_ENGINE=django.db.backends.postgresql
DB_NAME=sales_dashboard_prod
DB_USER=prod_user
DB_PASSWORD=Kloud@2025Secure##
DB_HOST=localhost
DB_PORT=5432

# Django Settings
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=172.31.82.254,yourdomain.com,localhost
```

### Create .env File for Testing (Optional)

```bash
nano /opt/sales-dashboard/backend-api/.env.test
```

Add:

```env
# Database Configuration - TESTING
DB_ENGINE=django.db.backends.postgresql
DB_NAME=sales_dashboard_db
DB_USER=sales_user
DB_PASSWORD=Kloud@2025Secure##
DB_HOST=localhost
DB_PORT=5432

# Django Settings
DEBUG=True
SECRET_KEY=test-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Install PostgreSQL Adapter

```bash
# Activate Django virtual environment
cd /opt/sales-dashboard/backend-api
source venv/bin/activate

# Install psycopg2 (PostgreSQL adapter for Python)
pip install psycopg2-binary

# Or for compiled version:
pip install psycopg2
```

### Run Migrations

```bash
cd /opt/sales-dashboard/backend-api
source venv/bin/activate

# Run migrations for production
python manage.py migrate

# Output should show:
# Operations to perform:
#   Apply all migrations
# Running migrations:
#   Applying auth.0001_initial... OK
#   Applying customers.0001_initial... OK
#   Applying bills.0001_initial... OK
#   ... and more
```

### Verify Database Tables

```bash
# Connect to production database
psql -U prod_user -d sales_dashboard_prod

# List all tables
\dt

# Output shows all created Django tables:
# auth_user, auth_group, django_migrations, customer_master, etc.

# Describe a table
\d+ customer_master

# Count rows in a table
SELECT COUNT(*) FROM customer_master;

# Exit
\q
```

---

## SECTION 6: FIX SCHEMA OWNERSHIP ISSUES

If you encounter "must be owner of schema public" errors:

### Option 1: Using the Fix Script

```bash
cd /opt/sales-dashboard/backend-api
./fix_db_permissions.sh
```

### Option 2: Manual Fix

```bash
# Connect as postgres superuser
sudo -u postgres psql -d sales_dashboard_prod

# Run these commands:
ALTER SCHEMA public OWNER TO prod_user;
GRANT ALL ON SCHEMA public TO prod_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prod_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prod_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prod_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prod_user;
GRANT USAGE ON SCHEMA public TO prod_user;
\q

# Do the same for testing database
sudo -u postgres psql -d sales_dashboard_db

ALTER SCHEMA public OWNER TO sales_user;
GRANT ALL ON SCHEMA public TO sales_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sales_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sales_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sales_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sales_user;
GRANT USAGE ON SCHEMA public TO sales_user;
\q
```

---

## SECTION 7: BACKUP & RESTORE DATABASE

### Manual Backup

```bash
# Backup production database
pg_dump -U prod_user -d sales_dashboard_prod > backup_prod.sql

# Backup with compression (smaller file)
pg_dump -U prod_user -d sales_dashboard_prod | gzip > backup_prod.sql.gz

# Backup testing database
pg_dump -U sales_user -d sales_dashboard_db | gzip > backup_test.sql.gz

# Backup only data (no schema)
pg_dump -U prod_user -d sales_dashboard_prod -a > data_only.sql

# Backup only schema (no data)
pg_dump -U prod_user -d sales_dashboard_prod -s > schema_only.sql

# Check backup file size
ls -lh backup_prod.sql.gz
```

### Manual Restore

```bash
# Restore from backup
psql -U prod_user -d sales_dashboard_prod < backup_prod.sql

# Restore from compressed backup
gunzip -c backup_prod.sql.gz | psql -U prod_user -d sales_dashboard_prod

# Restore with verbose output
psql -U prod_user -d sales_dashboard_prod < backup_prod.sql -v 2>&1 | tail -20
```

**Note:** For automated backups, see `04_AUTO_BACKUP_GUIDE.md`

---

## SECTION 8: MONITOR DATABASE

### Check Database Size

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Check production database size
SELECT datname, pg_size_pretty(pg_database_size(datname))
FROM pg_database
WHERE datname IN ('sales_dashboard_prod', 'sales_dashboard_db');

# Check table sizes
\c sales_dashboard_prod
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Exit
\q
```

### Check Database Statistics

```bash
# Active connections
sudo -u postgres psql -d sales_dashboard_prod -c \
"SELECT pid, usename, application_name, state FROM pg_stat_activity WHERE state != 'idle';"

# Database size
sudo -u postgres psql -d sales_dashboard_prod -c \
"SELECT pg_size_pretty(pg_database_size('sales_dashboard_prod'));"
```

### Check Disk Usage

```bash
# PostgreSQL data directory size
du -sh /var/lib/postgresql/15/main

# Total disk usage
df -h /
```

---

## SECTION 9: MAINTENANCE

### Vacuum Database

```bash
# Vacuum and analyze (cleans up dead rows)
sudo -u postgres psql -d sales_dashboard_prod -c "VACUUM ANALYZE;"

# Full vacuum (locks table, use during maintenance window)
sudo -u postgres psql -d sales_dashboard_prod -c "VACUUM FULL ANALYZE;"
```

### Reindex Database

```bash
# Reindex entire database
sudo -u postgres psql -d sales_dashboard_prod -c "REINDEX DATABASE sales_dashboard_prod;"

# Reindex specific table
sudo -u postgres psql -d sales_dashboard_prod -c "REINDEX TABLE customer_master;"
```

---

## SECTION 10: TROUBLESHOOTING

### Connection Refused

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Check which port PostgreSQL is listening on
sudo netstat -tlnp | grep postgres

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log
```

### Authentication Failed

```bash
# Check PostgreSQL is configured for password auth
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Should have:
# host    sales_dashboard_prod    prod_user      127.0.0.1/32            md5

# Restart PostgreSQL after changes
sudo systemctl restart postgresql
```

### Database Locked

```bash
# Find and kill blocking queries
sudo -u postgres psql -d sales_dashboard_prod

-- Find blocking queries
SELECT pid, usename, application_name, wait_event
FROM pg_stat_activity
WHERE wait_event IS NOT NULL;

-- Kill a blocking query (replace PID)
SELECT pg_terminate_backend(PID);

-- Exit
\q
```

### Disk Space Full

```bash
# Check disk usage
df -h

# If full, create backups and remove old ones
find /opt/backups -name "*.sql.gz" -mtime +30 -delete

# Or clean PostgreSQL logs
sudo -u postgres psql -d sales_dashboard_prod -c "VACUUM FULL ANALYZE;"
```

---

## SECTION 11: QUICK COMMANDS REFERENCE

```bash
# === CONNECTION ===
# Local connection - Production
psql -U prod_user -d sales_dashboard_prod

# Local connection - Testing
psql -U sales_user -d sales_dashboard_db

# Remote connection
psql -h 172.31.82.254 -U prod_user -d sales_dashboard_prod

# === BACKUP & RESTORE ===
# Backup production
pg_dump -U prod_user -d sales_dashboard_prod | gzip > backup_prod.sql.gz

# Backup testing
pg_dump -U sales_user -d sales_dashboard_db | gzip > backup_test.sql.gz

# Restore
gunzip -c backup_prod.sql.gz | psql -U prod_user -d sales_dashboard_prod

# === DATABASE MAINTENANCE ===
# Vacuum
sudo -u postgres psql -d sales_dashboard_prod -c "VACUUM ANALYZE;"

# Reindex
sudo -u postgres psql -d sales_dashboard_prod -c "REINDEX DATABASE sales_dashboard_prod;"

# === USER MANAGEMENT ===
# Change password
sudo -u postgres psql -c "ALTER USER prod_user WITH PASSWORD 'newpass';"

# List users
sudo -u postgres psql -c "\du"

# === DATABASE INFO ===
# Database size
sudo -u postgres psql -d sales_dashboard_prod -c "SELECT pg_size_pretty(pg_database_size('sales_dashboard_prod'));"

# Table count
sudo -u postgres psql -d sales_dashboard_prod -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';"

# === SERVICE CONTROL ===
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

---

## SECTION 12: SECURITY BEST PRACTICES

### Set Strong Passwords

```sql
-- Use a strong password with:
-- - At least 16 characters
-- - Mix of uppercase, lowercase, numbers, special characters

ALTER USER prod_user WITH PASSWORD 'YourStrong!Pass@2025';
ALTER USER sales_user WITH PASSWORD 'YourStrong!Pass@2025';
```

### Restrict Access

Edit `/etc/postgresql/15/main/pg_hba.conf`:

```
# Allow only specific IPs
host    sales_dashboard_prod    prod_user      172.31.82.254/32        md5
host    sales_dashboard_prod    prod_user      127.0.0.1/32            md5

# Deny all others (put at end)
host    sales_dashboard_prod    prod_user      0.0.0.0/0               reject
```

### Regular Backups

- ✅ Automate daily backups (see backup guide)
- ✅ Store backups in multiple locations
- ✅ Test restore procedures monthly
- ✅ Keep at least 30 days of backups

---

**For automated backup setup, see: `04_AUTO_BACKUP_GUIDE.md`**

