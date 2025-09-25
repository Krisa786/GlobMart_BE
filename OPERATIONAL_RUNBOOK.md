# GlobeMart Backend API - Operational Runbook

## Table of Contents
1. [Overview](#overview)
2. [Quick Start Guide](#quick-start-guide)
3. [Environment Setup](#environment-setup)
4. [Database Operations](#database-operations)
5. [Service Management](#service-management)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Logging & Debugging](#logging--debugging)
8. [Troubleshooting](#troubleshooting)
9. [Security Operations](#security-operations)
10. [Performance Optimization](#performance-optimization)
11. [Backup & Recovery](#backup--recovery)
12. [Deployment Procedures](#deployment-procedures)

## Overview

The GlobeMart Backend API is a Node.js/Express.js application that provides RESTful APIs for a global e-commerce platform specializing in hospitality and healthcare supplies. This runbook provides operational procedures for maintaining and troubleshooting the system.

### Key Components
- **API Server**: Express.js application with JWT authentication
- **Database**: MySQL with Sequelize ORM
- **Search Engine**: Meilisearch for product search
- **Cache**: Redis for session management and caching
- **Storage**: AWS S3 for media files
- **Logging**: Winston with request correlation

## Quick Start Guide

### Prerequisites
- Node.js 16+ 
- MySQL 8.0+
- Redis 6.0+
- Meilisearch (optional, for search functionality)

### 1. Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd GlobeMart_BE

# Install dependencies
npm install

# Copy environment file
cp env.sample .env

# Edit .env with your configuration
nano .env
```

### 2. Database Setup
```bash
# Run migrations
npm run db:migrate

# Seed with Sprint-2 data
npm run seed:sprint2

# Or seed with all data
npm run db:seed
```

### 3. Start Services
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 4. Verify Installation
```bash
# Check API status
curl http://localhost:3001/

# Check health
curl http://localhost:3001/health

# View API documentation
open http://localhost:3001/api/docs
```

## Environment Setup

### Required Environment Variables

#### Database Configuration
```bash
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=globe_mart
DB_HOST=localhost
DB_PORT=3306
```

#### JWT Configuration
```bash
# Generate keys first
npm run generate-keys

# Then set in .env
JWT_PRIVATE_KEY=your_private_key
JWT_PUBLIC_KEY=your_public_key
```

#### Search Engine (Optional)
```bash
SEARCH_ENGINE=meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_master_key
```

#### Redis (Optional)
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Environment-Specific Configurations

#### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=true
ENABLE_DOCS=true
```

#### Production
```bash
NODE_ENV=production
LOG_LEVEL=info
DEBUG=false
ENABLE_CLEANUP=true
```

## Database Operations

### Migration Commands
```bash
# Run all pending migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Undo all migrations
npm run db:migrate:undo:all

# Check migration status
npx sequelize db:migrate:status
```

### Seeding Commands
```bash
# Seed Sprint-2 comprehensive data
npm run seed:sprint2

# Seed all available seeders
npm run db:seed

# Run specific seeder
npx sequelize db:seed --seed 20241221000001-sprint2-comprehensive-seed.js
```

### Database Maintenance
```bash
# Connect to database
mysql -u root -p globe_mart

# Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'globe_mart'
ORDER BY (data_length + index_length) DESC;

# Check slow queries
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

## Service Management

### Process Management

#### Using PM2 (Recommended for Production)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/index.js --name "globemart-api"

# Monitor
pm2 monit

# View logs
pm2 logs globemart-api

# Restart
pm2 restart globemart-api

# Stop
pm2 stop globemart-api
```

#### Using systemd (Linux)
```bash
# Create service file
sudo nano /etc/systemd/system/globemart-api.service

# Enable and start
sudo systemctl enable globemart-api
sudo systemctl start globemart-api

# Check status
sudo systemctl status globemart-api
```

### Service Dependencies

#### MySQL Service
```bash
# Start MySQL
sudo systemctl start mysql

# Check status
sudo systemctl status mysql

# Connect and verify
mysql -u root -p -e "SHOW DATABASES;"
```

#### Redis Service
```bash
# Start Redis
sudo systemctl start redis

# Check status
redis-cli ping
# Should return: PONG
```

#### Meilisearch Service
```bash
# Start Meilisearch (Docker)
docker run -it --rm -p 7700:7700 getmeili/meilisearch:latest

# Or using systemd
sudo systemctl start meilisearch
```

## Monitoring & Health Checks

### Health Check Endpoints

#### Basic Health Check
```bash
curl http://localhost:3001/health
```

#### Database Health
```bash
curl http://localhost:3001/health/db
```

#### Search Service Health
```bash
curl http://localhost:3001/health/search
```

#### System Information
```bash
curl http://localhost:3001/health/system
```

### Monitoring Scripts

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh

API_URL="http://localhost:3001"
LOG_FILE="/var/log/globemart-health.log"

check_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [ "$response" = "200" ]; then
        echo "$timestamp - Health check passed" >> "$LOG_FILE"
        return 0
    else
        echo "$timestamp - Health check failed (HTTP $response)" >> "$LOG_FILE"
        return 1
    fi
}

check_health
```

#### Performance Monitoring
```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health

# Create curl-format.txt
cat > curl-format.txt << EOF
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF
```

## Logging & Debugging

### Log Locations
- **Application Logs**: `logs/combined.log`
- **Error Logs**: `logs/error.log`
- **Access Logs**: Available in console output (development)

### Log Analysis

#### View Recent Logs
```bash
# View last 100 lines
tail -n 100 logs/combined.log

# Follow logs in real-time
tail -f logs/combined.log

# Search for errors
grep -i error logs/combined.log

# Search by request ID
grep "requestId.*abc123" logs/combined.log
```

#### Log Rotation
```bash
# Install logrotate
sudo apt-get install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/globemart

# Add configuration
/path/to/GlobeMart_BE/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 node node
    postrotate
        # Restart application if needed
        systemctl reload globemart-api
    endscript
}
```

### Debugging Commands

#### Enable Debug Mode
```bash
# Set debug environment variable
export DEBUG=*
npm run dev

# Or specific debug modules
export DEBUG=globemart:*
npm run dev
```

#### Database Debugging
```bash
# Enable Sequelize logging
export SEQUELIZE_LOG=true
npm run dev

# Check database connections
mysql -u root -p -e "SHOW PROCESSLIST;"
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
**Symptoms**: `ECONNREFUSED` or `ETIMEDOUT` errors
**Solutions**:
```bash
# Check MySQL service
sudo systemctl status mysql

# Check connection parameters
mysql -h localhost -u root -p

# Verify database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'globe_mart';"

# Check firewall
sudo ufw status
```

#### 2. Search Service Issues
**Symptoms**: Search endpoints return errors or timeouts
**Solutions**:
```bash
# Check Meilisearch status
curl http://localhost:7700/health

# Restart Meilisearch
docker restart meilisearch-container

# Reindex products
npm run reindex
```

#### 3. Memory Issues
**Symptoms**: Application crashes with `FATAL ERROR: Ineffective mark-compacts`
**Solutions**:
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 src/index.js

# Monitor memory usage
ps aux | grep node
free -h
```

#### 4. Rate Limiting Issues
**Symptoms**: `429 Too Many Requests` errors
**Solutions**:
```bash
# Check rate limit configuration
grep -i "rate" .env

# Monitor rate limit logs
grep "Rate limit" logs/combined.log

# Adjust rate limits in .env
RATE_LIMIT_GENERAL=200
```

### Performance Issues

#### Slow API Responses
```bash
# Check database performance
mysql -u root -p -e "SHOW PROCESSLIST;"

# Monitor slow queries
tail -f /var/log/mysql/slow.log

# Check system resources
top
htop
iostat -x 1
```

#### High Memory Usage
```bash
# Monitor Node.js memory
node --inspect src/index.js

# Use Chrome DevTools
chrome://inspect

# Check for memory leaks
npm install -g clinic
clinic doctor -- node src/index.js
```

## Security Operations

### SSL/TLS Configuration
```bash
# Generate SSL certificates (Let's Encrypt)
sudo certbot certonly --standalone -d api.globemart.com

# Update .env
SSL_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/api.globemart.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/api.globemart.com/privkey.pem
```

### Security Monitoring
```bash
# Monitor failed login attempts
grep "authentication failed" logs/combined.log

# Check for suspicious activity
grep "security" logs/combined.log

# Monitor rate limit violations
grep "Rate limit exceeded" logs/combined.log
```

### Key Rotation
```bash
# Rotate JWT keys
npm run rotate-keys

# Update environment variables
# Restart application
pm2 restart globemart-api
```

## Performance Optimization

### Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);

-- Analyze query performance
EXPLAIN SELECT * FROM products WHERE category_id = 1 AND status = 'published';
```

### Application Optimization
```bash
# Enable compression
npm install compression

# Use cluster mode
npm install cluster

# Enable caching
npm install redis
```

### System Optimization
```bash
# Increase file descriptor limits
ulimit -n 65536

# Optimize TCP settings
echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf
sysctl -p
```

## Backup & Recovery

### Database Backup
```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/globemart"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/globemart_$DATE.sql"

mkdir -p "$BACKUP_DIR"

mysqldump -u root -p globe_mart > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Remove old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x backup-db.sh
```

### Application Backup
```bash
# Backup application files
tar -czf globemart-backup-$(date +%Y%m%d).tar.gz \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=.git \
    /path/to/GlobeMart_BE
```

### Recovery Procedures
```bash
# Restore database
gunzip -c globemart_20241221_120000.sql.gz | mysql -u root -p globe_mart

# Restore application
tar -xzf globemart-backup-20241221.tar.gz -C /path/to/restore/
```

## Deployment Procedures

### Development Deployment
```bash
# Pull latest changes
git pull origin develop

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Restart application
pm2 restart globemart-api
```

### Production Deployment
```bash
# Create deployment script
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

# Pull latest changes
git pull origin main

# Install dependencies
npm ci --production

# Run migrations
npm run db:migrate

# Run tests
npm test

# Restart application
pm2 restart globemart-api

# Verify deployment
curl -f http://localhost:3001/health || exit 1

echo "Deployment completed successfully"
EOF

chmod +x deploy.sh
```

### Rollback Procedures
```bash
# Rollback database migrations
npm run db:migrate:undo

# Rollback application
git checkout HEAD~1
npm install
pm2 restart globemart-api
```

## Emergency Procedures

### Service Outage Response
1. **Check service status**
   ```bash
   pm2 status
   systemctl status mysql
   systemctl status redis
   ```

2. **Check logs for errors**
   ```bash
   tail -n 100 logs/error.log
   journalctl -u globemart-api -n 50
   ```

3. **Restart services if needed**
   ```bash
   pm2 restart globemart-api
   sudo systemctl restart mysql
   ```

4. **Verify recovery**
   ```bash
   curl http://localhost:3001/health
   ```

### Data Corruption Recovery
1. **Stop application**
   ```bash
   pm2 stop globemart-api
   ```

2. **Restore from backup**
   ```bash
   # Restore database
   gunzip -c latest_backup.sql.gz | mysql -u root -p globe_mart
   
   # Reindex search
   npm run reindex
   ```

3. **Restart application**
   ```bash
   pm2 start globemart-api
   ```

## Contact Information

### Support Contacts
- **Technical Lead**: [Contact Information]
- **DevOps Team**: [Contact Information]
- **Database Admin**: [Contact Information]

### Escalation Procedures
1. **Level 1**: Check logs and restart services
2. **Level 2**: Contact technical lead
3. **Level 3**: Contact DevOps team
4. **Level 4**: Contact database admin

### Documentation Links
- [API Documentation](http://localhost:3001/api/docs)
- [OpenAPI Specification](http://localhost:3001/api/openapi.json)
- [Health Dashboard](http://localhost:3001/health)

---

**Last Updated**: December 21, 2024  
**Version**: 1.0.0  
**Maintained By**: GlobeMart Development Team
