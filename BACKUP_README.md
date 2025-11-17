# Database Backup System

This document explains how to set up and use the automatic database backup system for the Sales Dashboard application.

## Overview

The backup system supports four types of backups:
- **Daily**: Runs every day at 2:00 AM (retains 30 days)
- **Weekly**: Runs every Sunday at 3:00 AM (retains 90 days)
- **Monthly**: Runs on the 1st of each month at 4:00 AM (retains 365 days)
- **Yearly**: Runs on January 1st at 5:00 AM (retains 10 years)

## Quick Setup

### 1. Run the Setup Script

```bash
cd /home/shamimkhaled/sales-dashboard-app
./setup-backup-cron.sh
```

This will automatically configure cron jobs for all backup types.

### 2. Verify Installation

```bash
# View all cron jobs
crontab -l

# Check if backup script is executable
ls -l backup-db.sh
```

## Manual Setup

If you prefer to set up cron jobs manually:

### 1. Edit Crontab

```bash
crontab -e
```

### 2. Add the Following Lines

```cron
# Sales Dashboard Database Backups
# Daily backup at 2:00 AM
0 2 * * * /home/shamimkhaled/sales-dashboard-app/backup-db.sh daily >> ~/Backups/cron-logs/daily-backup.log 2>&1

# Weekly backup every Sunday at 3:00 AM
0 3 * * 0 /home/shamimkhaled/sales-dashboard-app/backup-db.sh weekly >> ~/Backups/cron-logs/weekly-backup.log 2>&1

# Monthly backup on the 1st of each month at 4:00 AM
0 4 1 * * /home/shamimkhaled/sales-dashboard-app/backup-db.sh monthly >> ~/Backups/cron-logs/monthly-backup.log 2>&1

# Yearly backup on January 1st at 5:00 AM
0 5 1 1 * /home/shamimkhaled/sales-dashboard-app/backup-db.sh yearly >> ~/Backups/cron-logs/yearly-backup.log 2>&1
```

## Manual Backup Execution

You can also run backups manually:

```bash
# Daily backup
./backup-db.sh daily

# Weekly backup
./backup-db.sh weekly

# Monthly backup
./backup-db.sh monthly

# Yearly backup
./backup-db.sh yearly
```

## Backup Locations

All backups are stored in organized directories:

```
~/Backups/DatabaseBackups/
├── daily/      # Daily backups (30 days retention)
├── weekly/     # Weekly backups (90 days retention)
├── monthly/    # Monthly backups (365 days retention)
└── yearly/     # Yearly backups (10 years retention)
```

## Backup File Naming

- **Daily**: `sales_dashboard_daily_YYYYMMDD_HHMMSS.sql.gz`
- **Weekly**: `sales_dashboard_weekly_YYYY-Www.sql.gz`
- **Monthly**: `sales_dashboard_monthly_YYYYMM.sql.gz`
- **Yearly**: `sales_dashboard_yearly_YYYY.sql.gz`

## Monitoring Backups

### View Log Files

```bash
# Daily backup logs
tail -f ~/Backups/cron-logs/daily-backup.log

# Weekly backup logs
tail -f ~/Backups/cron-logs/weekly-backup.log

# Monthly backup logs
tail -f ~/Backups/cron-logs/monthly-backup.log

# Yearly backup logs
tail -f ~/Backups/cron-logs/yearly-backup.log
```

### Check Backup Status

```bash
# Count backups
ls -1 ~/Backups/DatabaseBackups/daily/*.sql.gz | wc -l
ls -1 ~/Backups/DatabaseBackups/weekly/*.sql.gz | wc -l
ls -1 ~/Backups/DatabaseBackups/monthly/*.sql.gz | wc -l
ls -1 ~/Backups/DatabaseBackups/yearly/*.sql.gz | wc -l

# Check backup sizes
du -sh ~/Backups/DatabaseBackups/*
```

## Restoring from Backup

### Restore a PostgreSQL Backup

```bash
# Extract and restore
gunzip -c ~/Backups/DatabaseBackups/daily/sales_dashboard_daily_20240101_020000.sql.gz | \
  psql -U sales_user -d sales_dashboard_db

# Or restore directly from compressed file
gunzip -c backup_file.sql.gz | psql -U sales_user -d sales_dashboard_db
```

## Configuration

### Modify Backup Schedule

Edit the cron jobs:

```bash
crontab -e
```

### Change Backup Retention

Edit `backup-db.sh` and modify the `RETENTION_DAYS` values for each backup type.

### Change Backup Location

Edit `backup-db.sh` and modify the `BACKUP_BASE_DIR` variable.

### Change Database Connection

Edit `backup-db.sh` and modify:
- `VM_HOST`: SSH connection string
- `DB_USER`: Database username
- `DB_NAME`: Database name

## Troubleshooting

### Backup Fails

1. **Check SSH connection:**
   ```bash
   ssh kloud@172.31.82.254
   ```

2. **Check database credentials:**
   ```bash
   ssh kloud@172.31.82.254 "psql -U sales_user -d sales_dashboard_db -c 'SELECT version();'"
   ```

3. **Check log files:**
   ```bash
   tail -n 50 ~/Backups/cron-logs/daily-backup.log
   ```

### Cron Job Not Running

1. **Check if cron service is running:**
   ```bash
   sudo systemctl status cron
   ```

2. **Check cron logs:**
   ```bash
   grep CRON /var/log/syslog
   ```

3. **Verify cron job exists:**
   ```bash
   crontab -l | grep backup-db.sh
   ```

### Permission Issues

```bash
# Make scripts executable
chmod +x backup-db.sh
chmod +x setup-backup-cron.sh

# Ensure backup directories are writable
mkdir -p ~/Backups/DatabaseBackups/{daily,weekly,monthly,yearly}
chmod 755 ~/Backups/DatabaseBackups
```

## Removing Automatic Backups

To remove all backup cron jobs:

```bash
# Edit crontab
crontab -e

# Delete all lines containing "backup-db.sh"
# Save and exit
```

Or use this command:

```bash
crontab -l | grep -v "backup-db.sh" | crontab -
```

## Best Practices

1. **Test backups regularly**: Periodically restore a backup to ensure it works
2. **Monitor disk space**: Ensure you have enough space for backups
3. **Off-site backups**: Consider copying backups to cloud storage (S3, Google Drive, etc.)
4. **Encryption**: For sensitive data, consider encrypting backups
5. **Documentation**: Keep track of backup procedures and recovery steps

## Advanced: Cloud Storage Integration

To upload backups to cloud storage, modify `backup-db.sh` to add:

```bash
# Example: Upload to AWS S3
aws s3 cp "$BACKUP_FILE" s3://your-bucket-name/backups/

# Example: Upload to Google Cloud Storage
gsutil cp "$BACKUP_FILE" gs://your-bucket-name/backups/
```

## Support

For issues or questions, check:
- Backup log files in `~/Backups/cron-logs/`
- System cron logs: `/var/log/syslog`
- Database connection: Test SSH and database access manually

