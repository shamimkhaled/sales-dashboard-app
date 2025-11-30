# Complete VM Deployment Guide - Sales Dashboard

## PROJECT OVERVIEW
Your application has 3 main parts:
1. **Backend** - Django REST API (Python)
2. **Frontend** - React with Vite (JavaScript)
3. **Database** - PostgreSQL

---

## PHASE 1: INITIAL VM SETUP

### Step 1: Connect to Your VM
```bash
ssh kloud@172.31.82.254
# Password: kloud@2025
```

### Step 2: Update System Packages
```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git nano
```

### Step 3: Install Required Tools
```bash
# Install Python & pip
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker kloud

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
python3 --version
node --version
docker --version
docker-compose --version
```

---

## PHASE 2: POSTGRESQL DATABASE SETUP

### Step 4: Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 5: Create Database & User
```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL prompt, run:
CREATE DATABASE sales_dashboard;
CREATE USER sales_user WITH PASSWORD 'Sales@2025Secure';
ALTER ROLE sales_user SET client_encoding TO 'utf8';
ALTER ROLE sales_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE sales_user SET default_transaction_deferrable TO on;
ALTER ROLE sales_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE sales_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE sales_dashboard TO sales_user;
\q
```

### Step 6: Verify PostgreSQL Connection
```bash
psql -U sales_user -d sales_dashboard -h localhost

# If successful, you'll see the prompt
# Type \q to exit
```

---

## PHASE 3: PROJECT PREPARATION

### Step 7: Clone/Upload Project to VM
```bash
cd /opt
sudo mkdir -p sales-dashboard
sudo chown kloud:kloud sales-dashboard
cd sales-dashboard

# If project is on GitHub:
git clone https://your-repo-url.git .

# OR manually upload using SCP
# From your local machine:
# scp -r /path/to/project kloud@172.31.82.254:/opt/sales-dashboard
```

### Step 8: Create Environment Files

#### Backend `.env` file
```bash
nano backend-api/.env
```

Add this content:
```env
# Django Settings
DEBUG=False
SECRET_KEY=your-super-secret-key-change-this-in-production-$(python -c 'import secrets; print(secrets.token_urlsafe(50))')
ALLOWED_HOSTS=172.31.82.254,yourdomain.com,localhost,127.0.0.1

# Database Configuration
DB_ENGINE=django.db.backends.postgresql
DB_NAME=sales_dashboard
DB_USER=sales_user
DB_PASSWORD=Sales@2025Secure
DB_HOST=localhost
DB_PORT=5432

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-$(python -c 'import secrets; print(secrets.token_urlsafe(50))')
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS Settings
CORS_ALLOWED_ORIGINS=http://172.31.82.254,http://yourdomain.com,http://localhost:3000

# Activity Logging
ACTIVITY_LOG_ENABLED=True
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

---

## PHASE 4: BACKEND DEPLOYMENT

### Step 9: Install Backend Dependencies
```bash
cd /opt/sales-dashboard/backend-api

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install psycopg2-binary  # PostgreSQL adapter

# Deactivate for now
deactivate
```

### Step 10: Run Django Migrations
```bash
cd /opt/sales-dashboard/backend-api

# Activate virtual environment
source venv/bin/activate

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
# Follow prompts to create admin account

# Collect static files
python manage.py collectstatic --noinput

# Seed RBAC (roles, permissions, menu)
python manage.py seed_rbac

# Deactivate
deactivate
```

### Step 11: Setup Gunicorn Service
```bash
# Create systemd service file
sudo nano /etc/systemd/system/gunicorn-sales-dashboard.service
```

Add this content:
```ini
[Unit]
Description=Gunicorn Service for Sales Dashboard
After=network.target postgresql.service

[Service]
User=kloud
Group=www-data
WorkingDirectory=/opt/sales-dashboard/backend-api

Environment="PATH=/opt/sales-dashboard/backend-api/venv/bin"
ExecStart=/opt/sales-dashboard/backend-api/venv/bin/gunicorn \
    --workers 4 \
    --worker-class sync \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    config.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable gunicorn-sales-dashboard
sudo systemctl start gunicorn-sales-dashboard

# Check status
sudo systemctl status gunicorn-sales-dashboard
```

---

## PHASE 5: FRONTEND DEPLOYMENT

### Step 12: Build Frontend
```bash
cd /opt/sales-dashboard/frontend

# Install dependencies
npm install

# Create .env file
nano .env
```

Add:
```env
VITE_API_URL=http://172.31.82.254/api
VITE_APP_NAME=Sales Dashboard
```

Build the project:
```bash
npm run build

# This creates a 'dist' folder with production files
```

### Step 13: Setup Nginx as Reverse Proxy
```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/sales-dashboard
```

Add this content:
```nginx
upstream django_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name 172.31.82.254 yourdomain.com;
    client_max_body_size 100M;

    # Frontend Static Files
    location / {
        root /opt/sales-dashboard/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API Requests to Django
    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Admin Panel
    location /admin/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Files (CSS, JS)
    location /static/ {
        alias /opt/sales-dashboard/backend-api/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media Files
    location /media/ {
        alias /opt/sales-dashboard/backend-api/media/;
        expires 7d;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/sales-dashboard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

---

## PHASE 6: SSL CERTIFICATE (OPTIONAL BUT RECOMMENDED)

### Step 14: Setup HTTPS with Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace yourdomain.com with your actual domain)
sudo certbot certonly --nginx -d yourdomain.com

# Auto-renewal should be automatic
sudo systemctl enable certbot.timer
```

Update Nginx config to use SSL:
```bash
sudo nano /etc/nginx/sites-available/sales-dashboard
```

Add this section after the first server block:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # [Keep the same content as http server block]
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## PHASE 7: BACKUP & MAINTENANCE

### Step 15: PostgreSQL Backup Script
```bash
# Create backup directory
mkdir -p /opt/backups
cd /opt/backups

# Create backup script
nano backup-database.sh
```

Add this content:
```bash
#!/bin/bash

BACKUP_DIR="/opt/backups"
DB_NAME="sales_dashboard"
DB_USER="sales_user"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sales_dashboard_$TIMESTAMP.sql.gz"

# Create backup
pg_dump -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "sales_dashboard_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

Make it executable and setup cron:
```bash
chmod +x /opt/backups/backup-database.sh

# Edit crontab (runs daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /opt/backups/backup-database.sh
```

### Step 16: Restore Database from Backup
```bash
# List backups
ls -lh /opt/backups/

# Restore from backup (replace filename)
gunzip -c /opt/backups/sales_dashboard_20250101_020000.sql.gz | psql -U sales_user -d sales_dashboard
```

---

## PHASE 8: VERIFY DEPLOYMENT

### Step 17: Test the Application
```bash
# Check if backend is running
curl http://172.31.82.254/api/auth/menu/

# Check system services
sudo systemctl status gunicorn-sales-dashboard
sudo systemctl status nginx
sudo systemctl status postgresql

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# View Django logs
sudo journalctl -u gunicorn-sales-dashboard -f
```

### Step 18: Access the Application
```
Frontend:  http://172.31.82.254
Admin:     http://172.31.82.254/admin
API Docs:  http://172.31.82.254/api/docs/
```

Login with superuser credentials created in Step 10.

---

## PHASE 9: DOCKER DEPLOYMENT (ALTERNATIVE)

### Step 19: Using Docker Compose (Recommended)
```bash
cd /opt/sales-dashboard

# Create docker-compose.yml if not exists
nano docker-compose.yml
```

Content provided in separate section below.

Build and run:
```bash
docker-compose up -d

# Check running containers
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## PHASE 10: CI/CD SETUP (GITHUB ACTIONS)

### Step 20: GitHub Actions Workflow
```bash
mkdir -p /opt/sales-dashboard/.github/workflows
nano /opt/sales-dashboard/.github/workflows/deploy.yml
```

Workflow content provided in separate section.

---

## TROUBLESHOOTING COMMON ISSUES

### Issue 1: PostgreSQL Connection Error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Issue 2: Static Files Not Loading
```bash
# Recollect static files
cd /opt/sales-dashboard/backend-api
source venv/bin/activate
python manage.py collectstatic --noinput --clear
```

### Issue 3: Gunicorn Not Starting
```bash
# Check error logs
sudo journalctl -u gunicorn-sales-dashboard -n 50

# Manually test Gunicorn
cd /opt/sales-dashboard/backend-api
source venv/bin/activate
gunicorn --bind 0.0.0.0:8000 config.wsgi:application
```

### Issue 4: Nginx 502 Bad Gateway
```bash
# Ensure Gunicorn is running
sudo systemctl status gunicorn-sales-dashboard

# Check Nginx configuration
sudo nginx -t

# Restart both services
sudo systemctl restart gunicorn-sales-dashboard
sudo systemctl restart nginx
```

---

## QUICK REFERENCE COMMANDS

```bash
# Start/Stop Services
sudo systemctl start/stop/restart gunicorn-sales-dashboard
sudo systemctl start/stop/restart nginx
sudo systemctl start/stop/restart postgresql

# View Logs
sudo journalctl -u gunicorn-sales-dashboard -f
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Database Commands
sudo -u postgres psql -d sales_dashboard
\dt  # List tables
\q   # Exit psql

# Backup Database
pg_dump -U sales_user -d sales_dashboard > backup.sql

# Restore Database
psql -U sales_user -d sales_dashboard < backup.sql

# Update Application
cd /opt/sales-dashboard
git pull origin main
cd backend-api && source venv/bin/activate && pip install -r requirements.txt
python manage.py migrate && python manage.py collectstatic --noinput
cd ../frontend && npm install && npm run build
sudo systemctl restart gunicorn-sales-dashboard nginx
```

---

## SECURITY CHECKLIST

- [ ] Change default passwords in .env file
- [ ] Set Django DEBUG=False in production
- [ ] Use strong SECRET_KEY
- [ ] Enable SSL/HTTPS with Let's Encrypt
- [ ] Configure firewall (only allow 22, 80, 443)
- [ ] Regular database backups
- [ ] Monitor logs for errors
- [ ] Keep system packages updated
- [ ] Use strong database passwords
- [ ] Enable CORS only for trusted domains

