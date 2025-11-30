# Sales Dashboard - Complete Deployment Documentation

This directory contains comprehensive documentation for deploying and managing the Sales Dashboard application.

---

## 📚 Documentation Files

### 1. **01_QUICK_START_DEPLOYMENT.md**
   - **Purpose:** Get your application running in 30 minutes
   - **Audience:** Beginners, quick setup
   - **Contents:**
     - Step-by-step deployment guide
     - Basic configuration
     - Troubleshooting common issues
     - Quick reference commands

### 2. **02_VM_DEPLOYMENT_GUIDE.md**
   - **Purpose:** Complete VM deployment for production and testing
   - **Audience:** System administrators, DevOps
   - **Contents:**
     - Full VM setup process
     - Production and testing server configuration
     - Service management (Gunicorn, Nginx)
     - SSL/HTTPS setup
     - Security best practices
     - CI/CD integration

### 3. **03_POSTGRESQL_SETUP_GUIDE.md**
   - **Purpose:** PostgreSQL database setup and management
   - **Audience:** Database administrators, developers
   - **Contents:**
     - Database installation
     - Creating production and testing databases
     - User management
     - Remote connection configuration
     - Schema ownership fixes
     - Database maintenance
     - Monitoring and troubleshooting

### 4. **04_AUTO_BACKUP_GUIDE.md**
   - **Purpose:** Automated backup system setup
   - **Audience:** System administrators, backup managers
   - **Contents:**
     - Automated backup scripts
     - Cron job configuration
     - Backup verification
     - Restore procedures
     - Syncing backups to desktop
     - Monitoring and alerts

---

## 🚀 Quick Start

### For First-Time Deployment:
1. Start with **01_QUICK_START_DEPLOYMENT.md**
2. Follow steps 1-10 sequentially
3. Verify deployment works
4. Then read other guides for advanced configuration

### For Production Deployment:
1. Read **02_VM_DEPLOYMENT_GUIDE.md** for complete setup
2. Follow **03_POSTGRESQL_SETUP_GUIDE.md** for database
3. Setup **04_AUTO_BACKUP_GUIDE.md** for backups

### For Database Setup Only:
- Follow **03_POSTGRESQL_SETUP_GUIDE.md**

### For Backup Setup Only:
- Follow **04_AUTO_BACKUP_GUIDE.md**

---

## 📋 Application Structure

```
sales-dashboard-app/
├── backend-api/          # Django REST API
│   ├── apps/
│   │   ├── authentication/  # Auth & RBAC
│   │   ├── users/           # User management
│   │   ├── customers/       # Customer & KAM master
│   │   ├── bills/           # Entitlements, Invoices
│   │   ├── package/         # Package management
│   │   ├── payment/         # Payment processing
│   │   ├── utility/         # Utility information
│   │   └── feedback/        # Feedback system
│   └── config/              # Django settings
├── frontend/            # React application
└── docs/                # Additional documentation
```

---

## 🗄️ Database Configuration

### Production Database:
- **Name:** `sales_dashboard_prod`
- **User:** `prod_user`
- **Password:** `Kloud@2025Secure##`
- **Host:** `localhost` (or `172.31.82.254` for remote)

### Testing Database:
- **Name:** `sales_dashboard_db`
- **User:** `sales_user`
- **Password:** `Kloud@2025Secure##`
- **Host:** `localhost`

---

## 🔧 Key Services

### Backend Service:
- **Service Name:** `gunicorn-sales-dashboard`
- **Port:** `8000`
- **Status:** `sudo systemctl status gunicorn-sales-dashboard`

### Web Server:
- **Service Name:** `nginx`
- **Port:** `80` (HTTP), `443` (HTTPS)
- **Status:** `sudo systemctl status nginx`

### Database:
- **Service Name:** `postgresql`
- **Port:** `5432`
- **Status:** `sudo systemctl status postgresql`

---

## 📞 Common Commands

### Service Management:
```bash
# Start/Stop/Restart services
sudo systemctl start/stop/restart gunicorn-sales-dashboard
sudo systemctl start/stop/restart nginx
sudo systemctl start/stop/restart postgresql

# Check status
sudo systemctl status gunicorn-sales-dashboard
```

### Database:
```bash
# Connect to production database
psql -U prod_user -d sales_dashboard_prod

# Backup production database
pg_dump -U prod_user -d sales_dashboard_prod | gzip > backup.sql.gz

# Restore from backup
gunzip -c backup.sql.gz | psql -U prod_user -d sales_dashboard_prod
```

### Logs:
```bash
# Backend logs
sudo journalctl -u gunicorn-sales-dashboard -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# Database logs
sudo tail -f /var/log/postgresql/postgresql.log
```

---

## 🔐 Security Checklist

- [ ] Change default passwords
- [ ] Set `DEBUG=False` in production
- [ ] Use strong `SECRET_KEY`
- [ ] Enable SSL/HTTPS
- [ ] Configure firewall
- [ ] Setup automated backups
- [ ] Regular security updates
- [ ] Monitor logs regularly

---

## 📦 Deployment Locations

### VM Server:
- **IP:** `172.31.82.254`
- **User:** `kloud`
- **Project Path:** `/opt/sales-dashboard`
- **Backup Path:** `/opt/backups`

### Application URLs:
- **Frontend:** `http://172.31.82.254`
- **API:** `http://172.31.82.254/api`
- **Admin:** `http://172.31.82.254/admin`
- **API Docs:** `http://172.31.82.254/api/docs/`

---

## 🆘 Troubleshooting

### Application Not Loading:
1. Check all services are running
2. Check Nginx configuration: `sudo nginx -t`
3. Check backend logs: `sudo journalctl -u gunicorn-sales-dashboard -n 50`
4. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### Database Connection Issues:
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Test connection: `psql -U prod_user -d sales_dashboard_prod`
3. Check `.env` file configuration
4. Verify schema ownership (see PostgreSQL guide)

### Backup Issues:
1. Check backup script permissions: `ls -la /opt/backups/*.sh`
2. Test backup manually: `/opt/backups/backup-production.sh`
3. Check cron jobs: `crontab -l`
4. Check logs: `tail -f /opt/backups/logs/*.log`

---

## 📖 Additional Resources

- **Django Documentation:** https://docs.djangoproject.com/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Nginx Documentation:** https://nginx.org/en/docs/
- **Gunicorn Documentation:** https://docs.gunicorn.org/

---

## 🔄 Update Workflow

### Regular Updates:
```bash
cd /opt/sales-dashboard

# Pull latest code
git pull origin main

# Backend updates
cd backend-api
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
deactivate

# Frontend updates
cd ../frontend
npm install
npm run build

# Restart services
sudo systemctl restart gunicorn-sales-dashboard nginx
```

---

## 📝 Notes

- All passwords should be changed in production
- Keep backups in multiple locations
- Test restore procedures regularly
- Monitor disk space for backups
- Keep system packages updated

---

## ✅ Deployment Checklist

### Initial Setup:
- [ ] VM connected and accessible
- [ ] All dependencies installed
- [ ] Databases created
- [ ] Environment files configured
- [ ] Backend deployed and running
- [ ] Frontend built and served
- [ ] Services configured and enabled
- [ ] SSL certificate installed (optional)
- [ ] Backups configured
- [ ] Monitoring setup

### Post-Deployment:
- [ ] Application accessible
- [ ] Admin panel working
- [ ] API endpoints responding
- [ ] Database connections verified
- [ ] Backups running automatically
- [ ] Logs being monitored
- [ ] Security measures in place

---

**Last Updated:** 2025-01-XX
**Version:** 1.0.0

