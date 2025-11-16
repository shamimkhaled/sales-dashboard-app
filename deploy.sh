#!/bin/bash

set -e  # Exit on error

echo "🚀 Starting deployment..."
echo "📅 $(date)"

# Navigate to project
cd /opt/sales-dashboard-app

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main || {
    git fetch origin main
    git reset --hard origin/main
}

echo "✅ Code pulled successfully"

# Backend deployment
echo ""
echo "🔧 Deploying backend..."
cd backend-api

# Activate virtual environment
source venv/bin/activate

# Install packages
echo "📦 Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# Run migrations
echo "🗄️  Running database migrations..."
python manage.py migrate

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Seed RBAC if needed
python manage.py seed_rbac || true

# Deactivate venv
deactivate

echo "✅ Backend deployment complete"

# Frontend deployment
echo ""
echo "🎨 Deploying frontend..."
cd ../frontend

# Install Node packages
echo "📦 Installing Node packages..."
npm install

# Build
echo "🔨 Building frontend..."
npm run build

echo "✅ Frontend deployment complete"

# Restart services
echo ""
echo "🔄 Restarting services..."
cd /opt/sales-dashboard-app

sudo systemctl restart postgresql
sudo systemctl restart gunicorn-sales-dashboard
sudo systemctl restart nginx

# Verify services
echo "🔍 Verifying services..."
sleep 2
sudo systemctl status gunicorn-sales-dashboard | grep "active"
sudo systemctl status nginx | grep "active"

echo ""
echo "✨ Deployment completed successfully!"
echo "📅 $(date)"
echo "🌐 Visit: http://172.31.82.254"
echo "🌐 Visit: http://103.146.220.225:223"



