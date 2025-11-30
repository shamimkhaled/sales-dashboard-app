# Complete VM Deployment Guide - Sales Dashboard

## PROJECT OVERVIEW
Your application has 3 main parts:
1. **Backend** - Django REST API (Python) - Located in `backend-api/`
2. **Frontend** - React with Vite (JavaScript) - Located in `frontend/`
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

# Install Docker (optional, for containerized deployment)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker kloud

# Install Docker Compose (optional)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
python3 --version
node --version
docker --version
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

**For Production Database:**
```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL prompt, run:
CREATE DATABASE sales_dashboard_prod;
CREATE USER prod_user WITH PASSWORD 'Kloud@2025Secure##';
ALTER ROLE prod_user SET client_encoding TO 'utf8';
ALTER ROLE prod_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE prod_user SET default_transaction_deferrable TO on;
ALTER ROLE prod_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE sales_dashboard_prod TO prod_user;
\c sales_dashboard_prod
GRANT ALL PRIVILEGES ON SCHEMA public TO prod_user;
ALTER SCHEMA public OWNER TO prod_user;
\q
```

**For Testing Database:**
```bash
sudo -u postgres psql

CREATE DATABASE sales_dashboard_db;
CREATE USER sales_user WITH PASSWORD 'Kloud@2025Secure##';
ALTER ROLE sales_user SET client_encoding TO 'utf8';
ALTER ROLE sales_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE sales_user SET default_transaction_deferrable TO on;
ALTER ROLE sales_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE sales_dashboard_db TO sales_user;
\c sales_dashboard_db
GRANT ALL PRIVILEGES ON SCHEMA public TO sales_user;
ALTER SCHEMA public OWNER TO sales_user;
\q
```

### Step 6: Verify PostgreSQL Connection
```bash
# Test production database
psql -U prod_user -d sales_dashboard_prod -h localhost

# Test testing database
psql -U sales_user -d sales_dashboard_db -h localhost

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

#### Production Backend `.env` file
```bash
nano backend-api/.env
```

Add this content:
```env
# Django Settings
DEBUG=False
SECRET_KEY=your-super-secret-key-change-this-in-production
ALLOWED_HOSTS=172.31.82.254,yourdomain.com,localhost,127.0.0.1

# Database Configuration - PRODUCTION
DB_ENGINE=django.db.backends.postgresql
DB_NAME=sales_dashboard_prod
DB_USER=prod_user
DB_PASSWORD=Kloud@2025Secure##
DB_HOST=localhost
DB_PORT=5432

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS Settings
CORS_ALLOWED_ORIGINS=http://172.31.82.254,http://yourdomain.com,http://localhost:3000

# Activity Logging
ACTIVITY_LOG_ENABLED=True
```

#### Testing Backend `.env.test` file (optional)
```bash
nano backend-api/.env.test
```

```env
DEBUG=True
SECRET_KEY=test-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

DB_ENGINE=django.db.backends.postgresql
DB_NAME=sales_dashboard_db
DB_USER=sales_user
DB_PASSWORD=Kloud@2025Secure##
DB_HOST=localhost
DB_PORT=5432
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

---

## PHASE 7: VERIFY DEPLOYMENT

### Step 15: Test the Application
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

### Step 16: Access the Application
```
Frontend:  http://172.31.82.254
Admin:     http://172.31.82.254/admin
API Docs:  http://172.31.82.254/api/docs/
```

Login with superuser credentials created in Step 10.

---

## TESTING SERVER SETUP

### Separate Testing Environment

If you want a separate testing server:

1. **Create separate systemd service:**
```bash
sudo nano /etc/systemd/system/gunicorn-sales-dashboard-test.service
```

2. **Use different port (e.g., 8001):**
```ini
[Service]
ExecStart=/opt/sales-dashboard/backend-api/venv/bin/gunicorn \
    --workers 2 \
    --bind 0.0.0.0:8001 \
    config.wsgi:application
```

3. **Create separate Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/sales-dashboard-test
```

4. **Use different port (e.g., 8080):**
```nginx
server {
    listen 8080;
    server_name 172.31.82.254;
    # ... rest of config pointing to port 8001
}
```

---

## PRODUCTION SERVER SETUP

### Production Best Practices

1. **Set DEBUG=False** in `.env`
2. **Use strong SECRET_KEY**
3. **Enable SSL/HTTPS**
4. **Configure firewall:**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

5. **Monitor logs:**
```bash
# Setup log rotation
sudo nano /etc/logrotate.d/sales-dashboard
```

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
sudo -u postgres psql -d sales_dashboard_prod
\dt  # List tables
\q   # Exit psql

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
- [ ] Regular database backups (see backup guide)
- [ ] Monitor logs for errors
- [ ] Keep system packages updated
- [ ] Use strong database passwords
- [ ] Enable CORS only for trusted domains

---

## DEPLOYMENT WORKFLOW

### Initial Deployment
1. Setup VM and install dependencies
2. Create databases
3. Deploy code
4. Run migrations
5. Setup services
6. Configure Nginx
7. Test application

### Regular Updates
1. Pull latest code
2. Install new dependencies
3. Run migrations
4. Rebuild frontend
5. Restart services
6. Verify deployment

---

**For detailed PostgreSQL setup, see: `03_POSTGRESQL_SETUP_GUIDE.md`**
**For automated backups, see: `04_AUTO_BACKUP_GUIDE.md`**

