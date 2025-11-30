# PostgreSQL Database Management Guide

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

## SECTION 2: CREATE DATABASE & USER

### Access PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# You'll see prompt like:
# postgres=#
```

### Create Database

```sql
-- Inside PostgreSQL prompt, create database
CREATE DATABASE sales_dashboard;

-- List all databases
\l

-- Exit
\q
```

### Create Database User

```sql
-- Connect to PostgreSQL as admin
sudo -u postgres psql

-- Create user with password
CREATE USER sales_user WITH PASSWORD 'Sales@2025Secure';

-- Grant permissions (IMPORTANT!)
ALTER ROLE sales_user SET client_encoding TO 'utf8';
ALTER ROLE sales_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE sales_user SET default_transaction_deferrable TO on;
ALTER ROLE sales_user SET timezone TO 'UTC';

-- Grant ALL privileges on database to user
GRANT ALL PRIVILEGES ON DATABASE sales_dashboard TO sales_user;

-- Connect to the database
\c sales_dashboard

-- Grant schema privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO sales_user;

-- Grant all tables privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sales_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sales_user;

-- Exit
\q
```

### Change Database Password

```bash
# Access PostgreSQL
sudo -u postgres psql

# Change password
ALTER USER sales_user WITH PASSWORD 'NewPassword@2025';

# Exit
\q
```

---

## SECTION 3: CONFIGURE POSTGRESQL FOR REMOTE CONNECTION

### Edit PostgreSQL Configuration

```bash
# Find postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Find and modify these lines:

```conf
# Listen on all IP addresses (not recommended for public internet)
listen_addresses = '*'

# Or listen only on localhost and your VM IP
listen_addresses = 'localhost,172.31.82.254'
```

### Edit pg_hba.conf for Authentication

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Add this line at the end to allow local connections:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    sales_dashboard sales_user      127.0.0.1/32            md5
host    sales_dashboard sales_user      172.31.82.254/32        md5
host    all             all             0.0.0.0/0               md5
```

### Restart PostgreSQL

```bash
sudo systemctl restart postgresql

# Verify
sudo systemctl status postgresql
```

---

## SECTION 4: TEST DATABASE CONNECTION

### From Local Machine (Your Computer)

```bash
# Test connection
psql -h 172.31.82.254 -U sales_user -d sales_dashboard

# If successful, you'll get psql prompt
# Exit with \q
```

### From VM (Local)

```bash
# Connect locally
psql -U sales_user -d sales_dashboard

# If success, you see:
# sales_dashboard=>
```

---

## SECTION 5: CONFIGURE DJANGO TO USE POSTGRESQL

### Update Django Settings

Edit `backend-api/config/settings.py`:

```python
# Find DATABASES configuration and replace with:

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'sales_dashboard'),
        'USER': os.environ.get('DB_USER', 'sales_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'Sales@2025Secure'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}
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

### Create .env File

```bash
nano /opt/sales-dashboard/backend-api/.env
```

Add:

```env
# Database Configuration
DB_ENGINE=django.db.backends.postgresql
DB_NAME=sales_dashboard
DB_USER=sales_user
DB_PASSWORD=Sales@2025Secure
DB_HOST=localhost
DB_PORT=5432

# Django Settings
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=172.31.82.254,yourdomain.com,localhost
```

### Run Migrations

```bash
cd /opt/sales-dashboard/backend-api
source venv/bin/activate

# Run migrations
python manage.py migrate

# Output should show:
# Operations to perform:
#   Apply all migrations
# Running migrations:
#   Applying auth.0001_initial... OK
#   Applying auth.0002_alter_permission_options... OK
#   ... and more
```

### Verify Database Tables

```bash
# Connect to database
psql -U sales_user -d sales_dashboard

# List all tables
\dt

# Output shows all created Django tables:
# auth_user, auth_group, django_migrations, etc.

# Describe a table
\d+ auth_user

# Count rows in a table
SELECT COUNT(*) FROM auth_user;

# Exit
\q
```

---

## SECTION 6: BACKUP & RESTORE DATABASE

### Manual Backup

```bash
# Backup entire database
pg_dump -U sales_user -d sales_dashboard > backup.sql

# Backup with compression (smaller file)
pg_dump -U sales_user -d sales_dashboard | gzip > backup.sql.gz

# Backup with verbosity
pg_dump -U sales_user -d sales_dashboard -v > backup.sql 2>&1

# Backup only data (no schema)
pg_dump -U sales_user -d sales_dashboard -a > data_only.sql

# Backup only schema (no data)
pg_dump -U sales_user -d sales_dashboard -s > schema_only.sql

# Check backup file size
ls -lh backup.sql.gz
```

### Manual Restore

```bash
# Restore from backup
psql -U sales_user -d sales_dashboard < backup.sql

# Restore from compressed backup
gunzip -c backup.sql.gz | psql -U sales_user -d sales_dashboard

# Restore with verbose output
psql -U sales_user -d sales_dashboard < backup.sql -v 2>&1 | tail -20
```

### Automated Daily Backup Script

Create `/opt/backups/backup-db.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/opt/backups"
DB_NAME="sales_dashboard"
DB_USER="sales_user"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sales_dashboard_$TIMESTAMP.sql.gz"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup completed: $BACKUP_FILE" >> /var/log/db-backup.log
    echo "File size: $(du -h $BACKUP_FILE | cut -f1)" >> /var/log/db-backup.log
else
    echo "❌ Backup failed: $BACKUP_FILE" >> /var/log/db-backup.log
    exit 1
fi

# Keep only last 30 days of backups
find $BACKUP_DIR -name "sales_dashboard_*.sql.gz" -mtime +30 -exec rm {} \;

# Optional: Upload to cloud storage
# aws s3 cp $BACKUP_FILE s3://your-bucket/backups/
# gsutil cp $BACKUP_FILE gs://your-bucket/backups/

echo "Old backups removed"
```

Make executable:

```bash
chmod +x /opt/backups/backup-db.sh

# Test it
/opt/backups/backup-db.sh

# Check logs
tail -f /var/log/db-backup.log
```

### Setup Automated Backup with Cron

```bash
# Edit crontab
sudo crontab -e

# Add this line to run backup daily at 2 AM
0 2 * * * /opt/backups/backup-db.sh

# Weekly backup at Sunday 3 AM
0 3 * * 0 /opt/backups/backup-db.sh

# List cron jobs
sudo crontab -l
```

### Restore from Automated Backup

```bash
# List available backups
ls -lh /opt/backups/

# Output:
# -rw-r--r-- 1 root root 15M Jan  1 02:00 sales_dashboard_20250101_020000.sql.gz

# Restore from specific backup
gunzip -c /opt/backups/sales_dashboard_20250101_020000.sql.gz | psql -U sales_user -d sales_dashboard

# Monitor restore progress
gunzip -c /opt/backups/sales_dashboard_20250101_020000.sql.gz | psql -U sales_user -d sales_dashboard -e
```

---

## SECTION 7: MONITOR DATABASE

### Check Database Size

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Check database size
SELECT datname, pg_size_pretty(pg_database_size(datname))
FROM pg_database
WHERE datname = 'sales_dashboard';

# Check table sizes
\c sales_dashboard
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
SELECT pid, usename, application_name, state
FROM pg_stat_activity
WHERE state != 'idle';

# Long-running queries
SELECT pid, now() - pg_stat_statements.query_start AS query_duration, query
FROM pg_stat_statements
ORDER BY query_start DESC
LIMIT 10;
```

### Check Disk Usage

```bash
# PostgreSQL data directory size
du -sh /var/lib/postgresql/15/main

# Backup directory size
du -sh /opt/backups

# Total disk usage
df -h /
```

### Create Monitoring Script

```bash
# Create monitor-db.sh
nano /opt/backups/monitor-db.sh
```

Add:

```bash
#!/bin/bash

echo "==== PostgreSQL Monitor ===="
echo "Date: $(date)"
echo ""

echo "📊 Database Size:"
sudo -u postgres psql -d sales_dashboard -c \
"SELECT pg_size_pretty(pg_database_size('sales_dashboard'));"

echo ""
echo "🔗 Active Connections:"
sudo -u postgres psql -d sales_dashboard -c \
"SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

echo ""
echo "💾 Disk Usage:"
df -h /var/lib/postgresql

echo ""
echo "📁 Backup Directory:"
du -sh /opt/backups
```

Make executable and add to cron:

```bash
chmod +x /opt/backups/monitor-db.sh
sudo crontab -e
# Add: 0 * * * * /opt/backups/monitor-db.sh >> /var/log/db-monitor.log
```

---

## SECTION 8: MAINTENANCE

### Vacuum Database

```bash
# Vacuum and analyze (cleans up dead rows)
sudo -u postgres psql -d sales_dashboard -c "VACUUM ANALYZE;"

# Full vacuum (locks table, use during maintenance window)
sudo -u postgres psql -d sales_dashboard -c "VACUUM FULL ANALYZE;"
```

### Reindex Database

```bash
# Reindex entire database
sudo -u postgres psql -d sales_dashboard -c "REINDEX DATABASE sales_dashboard;"

# Reindex specific table
sudo -u postgres psql -d sales_dashboard -c "REINDEX TABLE auth_user;"
```

### Auto Vacuum Configuration

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# For sales_dashboard
\c sales_dashboard

# Set auto vacuum settings
ALTER TABLE auth_user SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE auth_user SET (autovacuum_analyze_scale_factor = 0.005);

# Exit
\q
```

---

## SECTION 9: TROUBLESHOOTING

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
# host    all             all             127.0.0.1/32            md5

# Restart PostgreSQL after changes
sudo systemctl restart postgresql
```

### Database Locked

```bash
# Find and kill blocking queries
sudo -u postgres psql -d sales_dashboard

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
rm /opt/backups/sales_dashboard_*.sql.gz --keep=5

# Or clean PostgreSQL logs
sudo -u postgres psql -d sales_dashboard -c "VACUUM FULL ANALYZE;"
```

### Slow Queries

```bash
# Enable query logging
sudo nano /etc/postgresql/15/main/postgresql.conf

# Find and set:
log_min_duration_statement = 1000  # Log queries taking > 1 second

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check slow queries
sudo tail -f /var/log/postgresql/postgresql.log
```

---

## SECTION 10: QUICK COMMANDS REFERENCE

```bash
# === CONNECTION ===
# Local connection
psql -U sales_user -d sales_dashboard

# Remote connection
psql -h 172.31.82.254 -U sales_user -d sales_dashboard

# === BACKUP & RESTORE ===
# Backup
pg_dump -U sales_user -d sales_dashboard | gzip > backup.sql.gz

# Restore
gunzip -c backup.sql.gz | psql -U sales_user -d sales_dashboard

# === DATABASE MAINTENANCE ===
# Vacuum
sudo -u postgres psql -d sales_dashboard -c "VACUUM ANALYZE;"

# Reindex
sudo -u postgres psql -d sales_dashboard -c "REINDEX DATABASE sales_dashboard;"

# === USER MANAGEMENT ===
# Create user
sudo -u postgres psql -c "CREATE USER newuser WITH PASSWORD 'password';"

# Change password
sudo -u postgres psql -c "ALTER USER sales_user WITH PASSWORD 'newpass';"

# List users
sudo -u postgres psql -c "\du"

# === DATABASE INFO ===
# Database size
sudo -u postgres psql -d sales_dashboard -c "SELECT pg_size_pretty(pg_database_size('sales_dashboard'));"

# Table count
sudo -u postgres psql -d sales_dashboard -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';"

# === SERVICE CONTROL ===
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

---

## SECTION 11: SECURITY BEST PRACTICES

### Set Strong Password

```sql
-- Use a strong password with:
-- - At least 16 characters
-- - Mix of uppercase, lowercase, numbers, special characters

ALTER USER sales_user WITH PASSWORD 'YourStrong!Pass@2025';
```

### Restrict Access

Edit `/etc/postgresql/15/main/pg_hba.conf`:

```
# Allow only specific IPs
host    sales_dashboard sales_user      172.31.82.254/32        md5
host    sales_dashboard sales_user      127.0.0.1/32            md5

# Deny all others (put at end)
host    sales_dashboard sales_user      0.0.0.0/0               reject
```

### Enable SSL

```bash
# Generate SSL certificate
sudo mkdir -p /etc/postgresql/ssl
sudo openssl req -new -x509 -days 365 -nodes \
  -out /etc/postgresql/ssl/server.crt \
  -keyout /etc/postgresql/ssl/server.key

# Set permissions
sudo chmod 700 /etc/postgresql/ssl
sudo chmod 600 /etc/postgresql/ssl/server.key
sudo chown postgres:postgres /etc/postgresql/ssl/server.*

# Edit postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# Add:
ssl = on
ssl_cert_file = '/etc/postgresql/ssl/server.crt'
ssl_key_file = '/etc/postgresql/ssl/server.key'

# Restart
sudo systemctl restart postgresql
```

### Regular Backups

- ✅ Automate daily backups
- ✅ Store backups in multiple locations
- ✅ Test restore procedures monthly
- ✅ Keep at least 30 days of backups

