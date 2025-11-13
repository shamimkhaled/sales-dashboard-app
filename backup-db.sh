
#!/bin/bash

BACKUP_DIR="$HOME/Backups/DatabaseBackups"
VM_HOST="kloud@172.31.82.254"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sales_dashboard_$TIMESTAMP.sql.gz"

# Create directory if not exists
mkdir -p "$BACKUP_DIR"

echo "🔄 Backing up database..."

# Create backup and download
ssh $VM_HOST "pg_dump -U sales_user -d sales_dashboard_db | gzip" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed: $BACKUP_FILE ($FILE_SIZE)"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Keep only last 30 days
find "$BACKUP_DIR" -name "sales_dashboard_*.sql.gz" -mtime +30 -delete

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/sales_dashboard_*.sql.gz 2>/dev/null | wc -l)
echo "📁 Total backups: $BACKUP_COUNT"

