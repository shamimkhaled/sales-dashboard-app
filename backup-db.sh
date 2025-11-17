#!/bin/bash

###############################################################################
# Database Backup Script for Sales Dashboard
# Supports: Daily, Weekly, Monthly, Yearly backups
# Database: PostgreSQL
###############################################################################

# Configuration
BACKUP_BASE_DIR="$HOME/Backups/DatabaseBackups"
VM_HOST="kloud@172.31.82.254"
DB_USER="sales_user"
DB_NAME="sales_dashboard_db"

# Backup type: daily, weekly, monthly, yearly (default: daily)
BACKUP_TYPE="${1:-daily}"

# Create backup directories
DAILY_DIR="$BACKUP_BASE_DIR/daily"
WEEKLY_DIR="$BACKUP_BASE_DIR/weekly"
MONTHLY_DIR="$BACKUP_BASE_DIR/monthly"
YEARLY_DIR="$BACKUP_BASE_DIR/yearly"

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR" "$YEARLY_DIR"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_ONLY=$(date +"%Y%m%d")
WEEK=$(date +"%Y-W%V")
MONTH=$(date +"%Y%m")
YEAR=$(date +"%Y")

# Determine backup directory and filename based on type
case "$BACKUP_TYPE" in
    daily)
        BACKUP_DIR="$DAILY_DIR"
        BACKUP_FILE="$BACKUP_DIR/sales_dashboard_daily_$TIMESTAMP.sql.gz"
        RETENTION_DAYS=30
        ;;
    weekly)
        BACKUP_DIR="$WEEKLY_DIR"
        BACKUP_FILE="$BACKUP_DIR/sales_dashboard_weekly_$WEEK.sql.gz"
        RETENTION_DAYS=90
        ;;
    monthly)
        BACKUP_DIR="$MONTHLY_DIR"
        BACKUP_FILE="$BACKUP_DIR/sales_dashboard_monthly_$MONTH.sql.gz"
        RETENTION_DAYS=365
        ;;
    yearly)
        BACKUP_DIR="$YEARLY_DIR"
        BACKUP_FILE="$BACKUP_DIR/sales_dashboard_yearly_$YEAR.sql.gz"
        RETENTION_DAYS=3650  # 10 years
        ;;
    *)
        echo "❌ Invalid backup type: $BACKUP_TYPE"
        echo "Usage: $0 [daily|weekly|monthly|yearly]"
        exit 1
        ;;
esac

echo "🔄 Starting $BACKUP_TYPE backup..."
echo "📁 Backup directory: $BACKUP_DIR"
echo "📄 Backup file: $(basename $BACKUP_FILE)"

# Create backup and download
echo "📥 Downloading database backup from $VM_HOST..."
ssh $VM_HOST "pg_dump -U $DB_USER -d $DB_NAME | gzip" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $FILE_SIZE"
    
    # Clean up old backups based on retention policy
    echo "🧹 Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
    find "$BACKUP_DIR" -name "sales_dashboard_${BACKUP_TYPE}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Count backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/sales_dashboard_${BACKUP_TYPE}_*.sql.gz 2>/dev/null | wc -l)
    echo "📊 Total $BACKUP_TYPE backups: $BACKUP_COUNT"
    
    # Optional: Send notification (uncomment and configure if needed)
    # echo "Backup completed: $BACKUP_FILE ($FILE_SIZE)" | mail -s "Database Backup Success" admin@example.com
    
    exit 0
else
    echo "❌ Backup failed!"
    
    # Optional: Send error notification
    # echo "Database backup failed at $(date)" | mail -s "Database Backup Failed" admin@example.com
    
    exit 1
fi
