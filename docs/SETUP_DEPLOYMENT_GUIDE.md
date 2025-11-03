# Setup & Deployment Guide - Sales Dashboard Analytics

## 🚀 Quick Start

Get the Sales Dashboard Analytics system running in under 5 minutes.

### Prerequisites
- **Node.js** 14+ ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### One-Command Setup
```bash
# Clone repository
git clone <repository-url>
cd sales-dashboard-app

# Setup backend
cd backend && npm install && npm start &

# Setup frontend (new terminal)
cd frontend && npm install && npm run dev
```

**That's it!** Your dashboard is now running at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api

---

## 📋 Detailed Installation

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd sales-dashboard-app
```

### Step 2: Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

This installs:
- `express` - Web framework
- `sqlite3` - Database
- `multer` - File uploads
- `xlsx` & `papaparse` - Excel/CSV processing
- `cors` - Cross-origin requests
- `dotenv` - Environment variables

#### Environment Configuration
Create `.env` file in backend directory:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_PATH=./sales_dashboard.db

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Start Backend Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

**Expected Output:**
```
═══════════════════════════════════════════════════════════
Sales Dashboard Server is running!
Open: http://localhost:3000
API Docs: http://localhost:3000/api
✓ Connected to SQLite Database: /path/to/sales_dashboard.db
✓ Customers table ready
✓ Bill Records table ready
✓ Database initialization complete
═══════════════════════════════════════════════════════════
```

### Step 3: Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

This installs:
- `react` & `react-dom` - React framework
- `react-router-dom` - Routing
- `axios` - HTTP client
- `bootstrap` - UI framework (base)
- `tailwindcss` - Utility-first CSS
- `react-icons` - Icon library
- `chart.js` & `react-chartjs-2` - Charts

#### Start Development Server
```bash
npm run dev
```

**Expected Output:**
```
VITE v7.1.7  ready in 300ms
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
➜  press h to show help
```

### Step 4: Verify Installation

#### Test Backend API
```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
{"status":"OK","message":"Server is running"}
```

#### Test Frontend
1. Open http://localhost:5173 in browser
2. Navigate between Dashboard and Data Entry
3. Check browser console for errors

---

## 🐳 Docker Deployment (Alternative)

### Docker Setup
```bash
# Build images
docker build -t sales-dashboard-backend ./backend
docker build -t sales-dashboard-frontend ./frontend

# Run containers
docker run -d -p 3000:3000 --name backend sales-dashboard-backend
docker run -d -p 5173:5173 --name frontend sales-dashboard-frontend
```

### Docker Compose (Recommended)
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/sales_dashboard.db:/app/sales_dashboard.db
    environment:
      - NODE_ENV=production

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

```bash
docker-compose up -d
```

---

## 🏭 Production Deployment

### 1. Server Requirements
- **OS**: Linux (Ubuntu 18.04+), macOS, Windows Server
- **RAM**: 512MB minimum, 1GB recommended
- **Storage**: 1GB for application, plus data storage
- **Node.js**: 14+ LTS
- **Reverse Proxy**: nginx recommended

### 2. Environment Setup
```bash
# Create production directory
sudo mkdir -p /var/www/sales-dashboard
cd /var/www/sales-dashboard

# Clone repository
git clone <repository-url> .
```

### 3. Backend Production Setup
```bash
cd backend

# Install production dependencies only
npm ci --only=production

# Create production environment file
cat > .env << EOF
PORT=3000
NODE_ENV=production
DB_PATH=/var/www/sales-dashboard/data/sales_dashboard.db
MAX_FILE_SIZE=52428800
UPLOAD_PATH=/var/www/sales-dashboard/uploads
ALLOWED_ORIGINS=https://yourdomain.com
EOF

# Create data directories
sudo mkdir -p /var/www/sales-dashboard/data
sudo mkdir -p /var/www/sales-dashboard/uploads
sudo chown -R www-data:www-data /var/www/sales-dashboard
```

### 4. Frontend Production Build
```bash
cd frontend

# Build for production
npm run build

# Copy build files to nginx
sudo cp -r dist/* /var/www/html/
```

### 5. Process Management (PM2)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start backend
cd backend
pm2 start server.js --name sales-dashboard-api

# Save PM2 configuration
pm2 save
pm2 startup
```

### 6. Nginx Configuration
```nginx
# /etc/nginx/sites-available/sales-dashboard
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static files)
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File uploads
    location /uploads {
        alias /var/www/sales-dashboard/uploads;
        expires 30d;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/sales-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (already configured)
sudo crontab -l | grep certbot
```

### 8. Database Backup
```bash
# Create backup script
cat > /var/www/sales-dashboard/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/www/sales-dashboard/backups"
DB_PATH="/var/www/sales-dashboard/data/sales_dashboard.db"

mkdir -p $BACKUP_DIR
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/sales_dashboard_$DATE.db'"

# Keep only last 30 backups
cd $BACKUP_DIR
ls -t *.db | tail -n +31 | xargs -r rm
EOF

chmod +x /var/www/sales-dashboard/backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /var/www/sales-dashboard/backup.sh" | crontab -
```

---

## 🔧 Configuration Options

### Backend Configuration

#### Server Settings
```env
# Port (default: 3000)
PORT=3000

# Environment
NODE_ENV=production  # development | production

# Request timeout (milliseconds)
REQUEST_TIMEOUT=30000
```

#### Database Settings
```env
# Database file path
DB_PATH=./sales_dashboard.db

# Connection pool (future feature)
DB_MAX_CONNECTIONS=10

# Query timeout
DB_TIMEOUT=30000
```

#### Security Settings
```env
# CORS allowed origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# File upload restrictions
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=xlsx,xls,csv

# Rate limiting (future)
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=1000       # requests per window
```

#### Logging Settings
```env
# Log level
LOG_LEVEL=info  # error | warn | info | debug

# Log file
LOG_FILE=./logs/app.log

# Max log size
LOG_MAX_SIZE=10m

# Max log files
LOG_MAX_FILES=5
```

### Frontend Configuration

#### Build Configuration (`vite.config.js`)
```javascript
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['react-router-dom', 'axios']
        }
      }
    }
  }
})
```

#### Environment Variables
```env
# .env.production
VITE_API_URL=https://yourdomain.com/api
VITE_APP_NAME=Sales Dashboard Analytics
VITE_APP_VERSION=1.0.0
```

---

## 🔍 Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check if port is in use
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>

# Check Node.js version
node --version

# Check npm version
npm --version
```

#### Database Connection Issues
```bash
# Check database file permissions
ls -la sales_dashboard.db

# Check SQLite installation
sqlite3 --version

# Manual database check
sqlite3 sales_dashboard.db "SELECT name FROM sqlite_master WHERE type='table';"
```

#### Frontend Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js compatibility
node --version

# Check available memory
free -h
```

#### CORS Errors
```bash
# Check backend CORS configuration
curl -H "Origin: http://localhost:5173" http://localhost:3000/api/health

# Update ALLOWED_ORIGINS in .env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### File Upload Issues
```bash
# Check upload directory permissions
ls -la uploads/

# Check file size limits
du -sh uploads/

# Check multer configuration
grep -r "multer" backend/
```

### Performance Issues

#### High Memory Usage
```bash
# Monitor memory usage
pm2 monit

# Check for memory leaks
pm2 logs sales-dashboard-api

# Restart service
pm2 restart sales-dashboard-api
```

#### Slow API Responses
```bash
# Check database performance
sqlite3 sales_dashboard.db "EXPLAIN QUERY PLAN SELECT * FROM customers;"

# Add database indexes
sqlite3 sales_dashboard.db "CREATE INDEX idx_customers_status ON customers(status);"

# Check network latency
ping localhost
```

### Logs and Monitoring

#### PM2 Logs
```bash
# View application logs
pm2 logs sales-dashboard-api

# View error logs only
pm2 logs sales-dashboard-api --err

# Clear logs
pm2 flush
```

#### System Logs
```bash
# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
sudo journalctl -u pm2 -f
```

#### Database Logs
```bash
# SQLite query logging (development only)
export SQLITE_DEBUG=1
npm run dev
```

---

## 🔄 Updates and Maintenance

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Update dependencies
cd backend && npm update
cd frontend && npm update

# Rebuild frontend
cd frontend && npm run build

# Restart services
pm2 restart sales-dashboard-api
sudo systemctl reload nginx
```

### Database Migrations
```bash
# Backup database first
cp sales_dashboard.db sales_dashboard.db.backup

# Run migration scripts (future)
cd backend
node scripts/migrate.js
```

### Security Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js (if using nvm)
nvm install --lts
nvm use --lts

# Update npm
npm install -g npm@latest

# Update dependencies
npm audit fix
```

---

## 📞 Support

### Getting Help
1. **Check Logs**: Review application and system logs
2. **Test API**: Use health check endpoint
3. **Database Check**: Verify database connectivity
4. **Network Test**: Check firewall and proxy settings

### Emergency Contacts
- **System Admin**: [contact information]
- **Developer Support**: [contact information]
- **Documentation**: [link to docs]

### Monitoring Checklist
- [ ] Application is accessible
- [ ] API endpoints respond
- [ ] Database connections work
- [ ] File uploads function
- [ ] Email notifications work (future)
- [ ] Backups are current
- [ ] SSL certificates valid
- [ ] System resources adequate

---

## 📊 Performance Benchmarks

### Expected Performance
- **API Response Time**: < 200ms for simple queries
- **Dashboard Load Time**: < 2 seconds
- **File Upload**: < 30 seconds for 10MB files
- **Concurrent Users**: 100+ simultaneous users
- **Database Queries**: < 100ms average

### Monitoring Commands
```bash
# System load
uptime

# Memory usage
free -h

# Disk usage
df -h

# Network connections
netstat -tlnp | grep :3000

# PM2 status
pm2 status
```

---

**Version**: 1.0.0
**Last Updated**: November 2024
**Status**: Production Ready