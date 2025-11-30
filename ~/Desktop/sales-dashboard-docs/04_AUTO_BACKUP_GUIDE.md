# Automated Backup Guide - Sales Dashboard

Complete guide for setting up automated database backups for both production and testing environments.

---

## OVERVIEW

This guide covers:
- Automated daily backups
- Backup retention policies
- Backup verification
- Restore procedures
- Backup to desktop/local machine
- Email notifications (optional)

---

## SECTION 1: SETUP BACKUP DIRECTORY

### Create Backup Directory

```bash
# Create backup directory
sudo mkdir -p /opt/backups
sudo chown kloud:kloud /opt/backups
sudo chmod 755 /opt/backups

# Create subdirectories
mkdir -p /opt/backups/production
mkdir -p /opt/backups/testing
mkdir -p /opt/backups/logs
```

---

## SECTION 2: PRODUCTION DATABASE BACKUP SCRIPT

### Create Backup Script

```bash
nano /opt/backups/backup-production.sh
```

Add this content:

```bash
#!/bin/bash

# ============================================
# Production Database Backup Script
# ============================================

# Configuration
BACKUP_DIR="/opt/backups/production"
DB_NAME="sales_dashboard_prod"
DB_USER="prod_user"
DB_HOST="localhost"
DB_PORT="5432"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sales_dashboard_prod_$TIMESTAMP.sql.gz"
LOG_FILE="/opt/backups/logs/backup_prod_$(date +"%Y%m%d").log"
RETENTION_DAYS=30

# Create backup directory if not exists
mkdir -p $BACKUP_DIR
mkdir -p /opt/backups/logs

# Log function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log_message "========================================="
log_message "Starting Production Database Backup"
log_message "========================================="

# Create backup
log_message "Creating backup: $BACKUP_FILE"
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    log_message "✅ Backup completed successfully"
    log_message "   File: $BACKUP_FILE"
    log_message "   Size: $BACKUP_SIZE"
    
    # Verify backup file exists and is not empty
    if [ -f $BACKUP_FILE ] && [ -s $BACKUP_FILE ]; then
        log_message "✅ Backup file verified"
    else
        log_message "❌ ERROR: Backup file is missing or empty!"
        exit 1
    fi
else
    log_message "❌ ERROR: Backup failed!"
    exit 1
fi

# Remove old backups (keep only last 30 days)
log_message "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "sales_dashboard_prod_*.sql.gz" -mtime +$RETENTION_DAYS -delete
DELETED_COUNT=$(find $BACKUP_DIR -name "sales_dashboard_prod_*.sql.gz" -mtime +$RETENTION_DAYS | wc -l)
if [ $DELETED_COUNT -gt 0 ]; then
    log_message "   Deleted $DELETED_COUNT old backup(s)"
else
    log_message "   No old backups to delete"
fi

# List current backups
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/sales_dashboard_prod_*.sql.gz 2>/dev/null | wc -l)
log_message "Total backups in directory: $BACKUP_COUNT"

# Calculate total backup size
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
log_message "Total backup directory size: $TOTAL_SIZE"

log_message "========================================="
log_message "Backup process completed"
log_message "========================================="
```

Make it executable:

```bash
chmod +x /opt/backups/backup-production.sh
```

---

## SECTION 3: TESTING DATABASE BACKUP SCRIPT

### Create Testing Backup Script

```bash
nano /opt/backups/backup-testing.sh
```

Add this content:

```bash
#!/bin/bash

# ============================================
# Testing Database Backup Script
# ============================================

# Configuration
BACKUP_DIR="/opt/backups/testing"
DB_NAME="sales_dashboard_db"
DB_USER="sales_user"
DB_HOST="localhost"
DB_PORT="5432"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sales_dashboard_db_$TIMESTAMP.sql.gz"
LOG_FILE="/opt/backups/logs/backup_test_$(date +"%Y%m%d").log"
RETENTION_DAYS=7  # Keep testing backups for 7 days only

# Create backup directory if not exists
mkdir -p $BACKUP_DIR
mkdir -p /opt/backups/logs

# Log function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log_message "========================================="
log_message "Starting Testing Database Backup"
log_message "========================================="

# Create backup
log_message "Creating backup: $BACKUP_FILE"
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    log_message "✅ Backup completed successfully"
    log_message "   File: $BACKUP_FILE"
    log_message "   Size: $BACKUP_SIZE"
    
    # Verify backup file
    if [ -f $BACKUP_FILE ] && [ -s $BACKUP_FILE ]; then
        log_message "✅ Backup file verified"
    else
        log_message "❌ ERROR: Backup file is missing or empty!"
        exit 1
    fi
else
    log_message "❌ ERROR: Backup failed!"
    exit 1
fi

# Remove old backups (keep only last 7 days)
log_message "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "sales_dashboard_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete

log_message "========================================="
log_message "Backup process completed"
log_message "========================================="
```

Make it executable:

```bash
chmod +x /opt/backups/backup-testing.sh
```

---

## SECTION 4: SETUP AUTOMATED CRON JOBS

### Edit Crontab

```bash
# Edit crontab
crontab -e
```

Add these lines:

```cron
# Production database backup - Daily at 2:00 AM
0 2 * * * /opt/backups/backup-production.sh >> /opt/backups/logs/cron_prod.log 2>&1

# Testing database backup - Daily at 2:30 AM
30 2 * * * /opt/backups/backup-testing.sh >> /opt/backups/logs/cron_test.log 2>&1

# Weekly full backup verification - Every Sunday at 3:00 AM
0 3 * * 0 /opt/backups/verify-backups.sh >> /opt/backups/logs/verify.log 2>&1
```

### Alternative: Multiple Daily Backups

If you want backups multiple times per day:

```cron
# Production database - Every 6 hours
0 */6 * * * /opt/backups/backup-production.sh >> /opt/backups/logs/cron_prod.log 2>&1

# Or specific times: 2 AM, 8 AM, 2 PM, 8 PM
0 2,8,14,20 * * * /opt/backups/backup-production.sh >> /opt/backups/logs/cron_prod.log 2>&1
```

### Verify Cron Jobs

```bash
# List all cron jobs
crontab -l

# Check cron service
sudo systemctl status cron
```

---

## SECTION 5: BACKUP VERIFICATION SCRIPT

### Create Verification Script

```bash
nano /opt/backups/verify-backups.sh
```

Add this content:

```bash
#!/bin/bash

# ============================================
# Backup Verification Script
# ============================================

LOG_FILE="/opt/backups/logs/verify_$(date +"%Y%m%d").log"
PROD_BACKUP_DIR="/opt/backups/production"
TEST_BACKUP_DIR="/opt/backups/testing"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log_message "========================================="
log_message "Starting Backup Verification"
log_message "========================================="

# Check production backups
log_message "Checking production backups..."
LATEST_PROD_BACKUP=$(ls -t $PROD_BACKUP_DIR/sales_dashboard_prod_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_PROD_BACKUP" ]; then
    log_message "❌ ERROR: No production backups found!"
else
    log_message "✅ Latest production backup: $LATEST_PROD_BACKUP"
    
    # Check if backup is recent (within last 25 hours)
    BACKUP_AGE=$(find "$LATEST_PROD_BACKUP" -mtime -1.04 | wc -l)
    if [ $BACKUP_AGE -eq 0 ]; then
        log_message "⚠️  WARNING: Latest backup is older than 25 hours!"
    else
        log_message "✅ Backup is recent"
    fi
    
    # Check backup file integrity
    if gunzip -t "$LATEST_PROD_BACKUP" 2>/dev/null; then
        log_message "✅ Backup file integrity verified"
    else
        log_message "❌ ERROR: Backup file is corrupted!"
    fi
fi

# Check testing backups
log_message "Checking testing backups..."
LATEST_TEST_BACKUP=$(ls -t $TEST_BACKUP_DIR/sales_dashboard_db_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_TEST_BACKUP" ]; then
    log_message "⚠️  WARNING: No testing backups found!"
else
    log_message "✅ Latest testing backup: $LATEST_TEST_BACKUP"
fi

# Check disk space
log_message "Checking disk space..."
DISK_USAGE=$(df -h /opt/backups | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    log_message "⚠️  WARNING: Disk usage is ${DISK_USAGE}%"
else
    log_message "✅ Disk usage: ${DISK_USAGE}%"
fi

log_message "========================================="
log_message "Verification completed"
log_message "========================================="
```

Make it executable:

```bash
chmod +x /opt/backups/verify-backups.sh
```

---

## SECTION 6: SYNC BACKUPS TO DESKTOP/LOCAL MACHINE

### Option 1: Using SCP (Manual)

```bash
# From your local machine (desktop), run:
# Download latest production backup
scp kloud@172.31.82.254:/opt/backups/production/sales_dashboard_prod_*.sql.gz ~/Desktop/backups/

# Download all production backups
scp kloud@172.31.82.254:/opt/backups/production/*.sql.gz ~/Desktop/backups/
```

### Option 2: Automated Sync Script (on VM)

Create a script that syncs backups to a shared location:

```bash
nano /opt/backups/sync-to-desktop.sh
```

Add this content:

```bash
#!/bin/bash

# ============================================
# Sync Backups to Desktop/Local Machine
# ============================================

# Configuration
BACKUP_DIR="/opt/backups/production"
REMOTE_USER="your-desktop-username"
REMOTE_HOST="your-desktop-ip"
REMOTE_PATH="~/Desktop/sales-dashboard-backups"
SSH_KEY="/home/kloud/.ssh/id_rsa"

# Create remote directory if needed
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_PATH"

# Sync latest backup
LATEST_BACKUP=$(ls -t $BACKUP_DIR/sales_dashboard_prod_*.sql.gz | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    echo "Syncing $LATEST_BACKUP to desktop..."
    scp -i $SSH_KEY $LATEST_BACKUP $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/
    echo "✅ Sync completed"
else
    echo "❌ No backup found to sync"
fi
```

### Option 3: Using rsync (Recommended)

```bash
# Install rsync on both machines
sudo apt install -y rsync

# From your desktop, create sync script
nano ~/Desktop/sync-backups.sh
```

Add:

```bash
#!/bin/bash

# Sync backups from VM to desktop
rsync -avz --progress \
    kloud@172.31.82.254:/opt/backups/production/ \
    ~/Desktop/sales-dashboard-backups/production/

rsync -avz --progress \
    kloud@172.31.82.254:/opt/backups/testing/ \
    ~/Desktop/sales-dashboard-backups/testing/
```

Make executable and run:

```bash
chmod +x ~/Desktop/sync-backups.sh
~/Desktop/sync-backups.sh
```

---

## SECTION 7: RESTORE FROM BACKUP

### Restore Production Database

```bash
# List available backups
ls -lh /opt/backups/production/

# Restore from specific backup
gunzip -c /opt/backups/production/sales_dashboard_prod_20250101_020000.sql.gz | \
    psql -U prod_user -d sales_dashboard_prod

# Restore with verbose output
gunzip -c /opt/backups/production/sales_dashboard_prod_20250101_020000.sql.gz | \
    psql -U prod_user -d sales_dashboard_prod -v ON_ERROR_STOP=1
```

### Restore Testing Database

```bash
# List available backups
ls -lh /opt/backups/testing/

# Restore from specific backup
gunzip -c /opt/backups/testing/sales_dashboard_db_20250101_023000.sql.gz | \
    psql -U sales_user -d sales_dashboard_db
```

### Restore to Different Database (for testing)

```bash
# Create temporary database
sudo -u postgres psql -c "CREATE DATABASE sales_dashboard_restore_test;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sales_dashboard_restore_test TO prod_user;"

# Restore backup to temporary database
gunzip -c /opt/backups/production/sales_dashboard_prod_20250101_020000.sql.gz | \
    psql -U prod_user -d sales_dashboard_restore_test
```

---

## SECTION 8: MONITOR BACKUPS

### View Backup Logs

```bash
# View today's production backup log
tail -f /opt/backups/logs/backup_prod_$(date +"%Y%m%d").log

# View all backup logs
ls -lh /opt/backups/logs/

# View latest verification log
tail -20 /opt/backups/logs/verify_$(date +"%Y%m%d").log
```

### Check Backup Status

```bash
# List all production backups
ls -lh /opt/backups/production/

# Check backup sizes
du -sh /opt/backups/production/
du -sh /opt/backups/testing/

# Count backups
ls -1 /opt/backups/production/*.sql.gz | wc -l
```

### Create Monitoring Script

```bash
nano /opt/backups/check-backup-status.sh
```

Add:

```bash
#!/bin/bash

echo "========================================="
echo "Backup Status Report"
echo "========================================="
echo "Date: $(date)"
echo ""

echo "📊 Production Backups:"
ls -lh /opt/backups/production/ | tail -n +2 | wc -l
echo "Latest: $(ls -t /opt/backups/production/*.sql.gz 2>/dev/null | head -1)"
echo ""

echo "📊 Testing Backups:"
ls -lh /opt/backups/testing/ | tail -n +2 | wc -l
echo "Latest: $(ls -t /opt/backups/testing/*.sql.gz 2>/dev/null | head -1)"
echo ""

echo "💾 Disk Usage:"
du -sh /opt/backups/production/
du -sh /opt/backups/testing/
echo ""

echo "📋 Recent Logs:"
tail -5 /opt/backups/logs/backup_prod_$(date +"%Y%m%d").log 2>/dev/null || echo "No logs today"
```

Make executable:

```bash
chmod +x /opt/backups/check-backup-status.sh
```

---

## SECTION 9: EMAIL NOTIFICATIONS (OPTIONAL)

### Install Mail Utilities

```bash
sudo apt install -y mailutils
```

### Update Backup Script with Email

Add to backup script:

```bash
# Email configuration
EMAIL_TO="your-email@example.com"
EMAIL_SUBJECT="Sales Dashboard Backup - $(date +"%Y-%m-%d")"

# Send email on success
if [ $? -eq 0 ]; then
    echo "Backup completed successfully. File: $BACKUP_FILE, Size: $BACKUP_SIZE" | \
        mail -s "$EMAIL_SUBJECT" $EMAIL_TO
else
    echo "Backup failed! Please check logs." | \
        mail -s "BACKUP FAILED - $EMAIL_SUBJECT" $EMAIL_TO
fi
```

---

## SECTION 10: QUICK REFERENCE

### Manual Backup Commands

```bash
# Production backup
/opt/backups/backup-production.sh

# Testing backup
/opt/backups/backup-testing.sh

# Verify backups
/opt/backups/verify-backups.sh

# Check status
/opt/backups/check-backup-status.sh
```

### Restore Commands

```bash
# Restore latest production backup
LATEST=$(ls -t /opt/backups/production/*.sql.gz | head -1)
gunzip -c $LATEST | psql -U prod_user -d sales_dashboard_prod

# Restore specific backup
gunzip -c /opt/backups/production/sales_dashboard_prod_YYYYMMDD_HHMMSS.sql.gz | \
    psql -U prod_user -d sales_dashboard_prod
```

### View Logs

```bash
# Today's production backup log
cat /opt/backups/logs/backup_prod_$(date +"%Y%m%d").log

# All logs
ls -lh /opt/backups/logs/
```

---

## SECTION 11: TROUBLESHOOTING

### Backup Fails

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
psql -U prod_user -d sales_dashboard_prod

# Check disk space
df -h /opt/backups

# Check permissions
ls -la /opt/backups/
```

### Cron Job Not Running

```bash
# Check cron service
sudo systemctl status cron

# Check cron logs
grep CRON /var/log/syslog | tail -20

# Test cron job manually
/opt/backups/backup-production.sh
```

### Backup File Corrupted

```bash
# Test backup file integrity
gunzip -t /opt/backups/production/sales_dashboard_prod_*.sql.gz

# If corrupted, restore from previous backup
```

---

## SECTION 12: BEST PRACTICES

1. ✅ **Test backups regularly** - Restore to test database monthly
2. ✅ **Keep multiple copies** - Local + remote (desktop)
3. ✅ **Monitor backup logs** - Check daily
4. ✅ **Verify backup integrity** - Use verification script
5. ✅ **Document restore procedures** - Keep this guide handy
6. ✅ **Set appropriate retention** - 30 days for production, 7 for testing
7. ✅ **Monitor disk space** - Clean old backups automatically
8. ✅ **Test disaster recovery** - Practice restore quarterly

---

## SUMMARY

You now have:
- ✅ Automated daily backups for production and testing databases
- ✅ Backup verification scripts
- ✅ Automated cleanup of old backups
- ✅ Logging for all backup operations
- ✅ Procedures to restore from backups
- ✅ Methods to sync backups to your desktop

**Backups run automatically every day at 2:00 AM (production) and 2:30 AM (testing).**

**Check backup status anytime with:**
```bash
/opt/backups/check-backup-status.sh
```

