# Quick Start: Deploy Sales Dashboard in 30 Minutes

This is a **simplified, step-by-step guide** for complete beginners. Each step has explanations.

---

## ⏱️ TIME ESTIMATE: 30 minutes

---

## STEP 1️⃣: CONNECT TO YOUR VM (2 minutes)

### What is SSH?
SSH = Secure Shell = secure way to access your server from your computer

### Mac/Linux Users:
```bash
# Open Terminal and type:
ssh kloud@172.31.82.254

# When asked, type password:
# kloud@2025
```

### Windows Users:
- Download **PuTTY** from putty.org
- Host: `172.31.82.254`
- Username: `kloud`
- Password: `kloud@2025`

**Result:** You should see a command prompt ending with `$` or `#`

---

## STEP 2️⃣: INSTALL DEPENDENCIES (5 minutes)

Copy and paste this entire block:

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Python
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Database
sudo apt install -y postgresql postgresql-contrib

# Install Web Server
sudo apt install -y nginx

# Verify installations worked
python3 --version
node --version
psql --version
nginx -v
```

**What was installed:**
- Python = runs Django backend
- Node.js = builds React frontend
- PostgreSQL = database that stores data
- Nginx = web server that serves your app

**Wait for all commands to finish** ✅

---

## STEP 3️⃣: CREATE DATABASE (3 minutes)

### What's a database?
Database = place where all your customer data, bills, etc are stored safely

### Create it:

```bash
# Go into PostgreSQL
sudo -u postgres psql

# You'll see: postgres=#

# Copy-paste this entire block:
CREATE DATABASE sales_dashboard;
CREATE USER sales_user WITH PASSWORD 'Sales@2025Secure';
ALTER ROLE sales_user SET client_encoding TO 'utf8';
ALTER ROLE sales_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE sales_user SET default_transaction_deferrable TO on;
ALTER ROLE sales_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE sales_dashboard TO sales_user;
\q

# You'll be back at the $ prompt
```

### Verify database was created:

```bash
# Login with the new user
psql -U sales_user -d sales_dashboard -h localhost

# If you see: sales_dashboard=>
# Success! ✅

# Exit
\q
```

---

## STEP 4️⃣: PREPARE PROJECT FOLDER (2 minutes)

```bash
# Create project directory
sudo mkdir -p /opt/sales-dashboard
sudo chown kloud:kloud /opt/sales-dashboard
cd /opt/sales-dashboard

# Option A: If you have the files on GitHub
git clone https://github.com/your-username/your-repo.git .

# Option B: Or upload files manually (use SCP from your computer)
# From your computer, NOT the VM:
# scp -r /path/to/sales-dashboard kloud@172.31.82.254:/opt/sales-dashboard
```

**Check if files are there:**
```bash
ls -la /opt/sales-dashboard
# Should show: backend-api, frontend, docker-compose.yml, etc
```

---

## STEP 5️⃣: CREATE ENVIRONMENT FILE (2 minutes)

This file tells Django how to connect to the database.

```bash
# Create .env file for Django
nano /opt/sales-dashboard/backend-api/.env
```

**Paste this content** (right-click to paste):

```env
DEBUG=False
SECRET_KEY=your-super-secret-key-12345-change-this-later
ALLOWED_HOSTS=172.31.82.254,localhost,127.0.0.1

DB_ENGINE=django.db.backends.postgresql
DB_NAME=sales_dashboard
DB_USER=sales_user
DB_PASSWORD=Sales@2025Secure
DB_HOST=localhost
DB_PORT=5432

JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ALLOWED_ORIGINS=http://172.31.82.254,http://localhost:3000
ACTIVITY_LOG_ENABLED=True
```

**To save:**
- Press `Ctrl+X`
- Press `Y`
- Press `Enter`

---

## STEP 6️⃣: INSTALL BACKEND (5 minutes)

```bash
cd /opt/sales-dashboard/backend-api

# Create isolated Python environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# You'll see (venv) before your prompt

# Install all Python packages
pip install --upgrade pip
pip install -r requirements.txt
pip install psycopg2-binary

# Run database setup
python manage.py migrate

# Create admin account (answer the questions)
python manage.py createsuperuser
# Email: admin@example.com
# Username: admin
# Password: Admin@2025

# Seed initial data
python manage.py seed_rbac

# Collect static files
python manage.py collectstatic --noinput

# Deactivate environment
deactivate
```

**If successful**, you'll see no error messages ✅

---

## STEP 7️⃣: SETUP BACKEND SERVICE (2 minutes)

This makes your backend run automatically.

```bash
# Create a service file
sudo nano /etc/systemd/system/gunicorn-sales-dashboard.service
```

**Paste this:**

```ini
[Unit]
Description=Gunicorn for Sales Dashboard
After=network.target

[Service]
User=kloud
Group=www-data
WorkingDirectory=/opt/sales-dashboard/backend-api
Environment="PATH=/opt/sales-dashboard/backend-api/venv/bin"
ExecStart=/opt/sales-dashboard/backend-api/venv/bin/gunicorn \
    --workers 4 --bind 0.0.0.0:8000 config.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Save:** Ctrl+X, Y, Enter

**Start the service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable gunicorn-sales-dashboard
sudo systemctl start gunicorn-sales-dashboard

# Check if running
sudo systemctl status gunicorn-sales-dashboard

# Should show: "active (running)" ✅
```

---

## STEP 8️⃣: BUILD FRONTEND (3 minutes)

```bash
cd /opt/sales-dashboard/frontend

# Install Node packages
npm install

# Build for production
npm run build

# This creates a 'dist' folder ✅
```

---

## STEP 9️⃣: SETUP WEB SERVER (3 minutes)

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/sales-dashboard
```

**Paste this:**

```nginx
server {
    listen 80;
    server_name 172.31.82.254;
    client_max_body_size 100M;

    # Frontend
    location / {
        root /opt/sales-dashboard/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin Panel
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static Files
    location /static/ {
        alias /opt/sales-dashboard/backend-api/staticfiles/;
    }
}
```

**Save:** Ctrl+X, Y, Enter

**Enable it:**
```bash
sudo ln -s /etc/nginx/sites-available/sales-dashboard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl restart nginx

# Check if running
sudo systemctl status nginx
# Should show: "active (running)" ✅
```

---

## STEP 🔟: VERIFY DEPLOYMENT (2 minutes)

```bash
# Check all services are running
sudo systemctl status gunicorn-sales-dashboard
sudo systemctl status nginx
sudo systemctl status postgresql

# All should show: active (running) ✅
```

---

## ✨ DONE! ACCESS YOUR APPLICATION

### Open your browser and go to:

```
http://172.31.82.254
```

### Login with credentials you created:
- **Username:** admin
- **Password:** Admin@2025

### Access admin panel:
```
http://172.31.82.254/admin
```

### View API documentation:
```
http://172.31.82.254/api/docs/
```

---

## 🔧 COMMON OPERATIONS

### View logs (if something breaks)
```bash
# Backend errors
sudo journalctl -u gunicorn-sales-dashboard -f

# Nginx errors
sudo tail -f /var/log/nginx/error.log
```

### Restart all services
```bash
sudo systemctl restart gunicorn-sales-dashboard nginx
```

### Backup database (daily!)
```bash
# Backup
pg_dump -U sales_user -d sales_dashboard | gzip > backup.sql.gz

# Restore (if needed)
gunzip -c backup.sql.gz | psql -U sales_user -d sales_dashboard
```

### Deploy new code
```bash
cd /opt/sales-dashboard

# Get latest code
git pull origin main

# Install backend changes
cd backend-api && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
deactivate

# Build frontend changes
cd ../frontend
npm install
npm run build

# Restart services
sudo systemctl restart gunicorn-sales-dashboard nginx
```

---

## ❓ TROUBLESHOOTING

### "Connection refused" or "502 Bad Gateway"
```bash
# Make sure backend is running
sudo systemctl restart gunicorn-sales-dashboard

# Check it's listening
sudo netstat -tlnp | grep 8000
```

### Frontend not loading
```bash
# Rebuild frontend
cd /opt/sales-dashboard/frontend
npm run build

# Restart nginx
sudo systemctl restart nginx
```

### Database connection error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U sales_user -d sales_dashboard
# If it connects, type \q to exit
```

### Static files not showing
```bash
# Recollect static files
cd /opt/sales-dashboard/backend-api
source venv/bin/activate
python manage.py collectstatic --noinput --clear
deactivate

# Restart nginx
sudo systemctl restart nginx
```

---

## 📞 NEED HELP?

### Check logs first!
```bash
# Backend logs
sudo journalctl -u gunicorn-sales-dashboard -n 50

# Nginx logs
sudo tail -20 /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -20 /var/log/postgresql/postgresql.log
```

### SSH back in if disconnected
```bash
ssh kloud@172.31.82.254
```

### Stop/start services
```bash
sudo systemctl stop gunicorn-sales-dashboard
sudo systemctl start gunicorn-sales-dashboard
sudo systemctl restart nginx
```

---

## 🎉 CONGRATULATIONS!

Your Sales Dashboard is now deployed and running!

**What you've done:**
- ✅ Installed all required software
- ✅ Created PostgreSQL database
- ✅ Deployed Django backend
- ✅ Built React frontend
- ✅ Setup web server (Nginx)
- ✅ Made everything run automatically

**Next steps:**
1. Login and test the application
2. Add users in admin panel
3. Setup SSL certificate (optional but recommended)
4. Setup automated backups
5. Configure CI/CD for automatic deployments

**Happy deploying! 🚀**

