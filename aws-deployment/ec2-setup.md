# AWS EC2 Deployment Guide for Pi Wireless Monitor

## Prerequisites
- AWS Account with billing enabled
- AWS CLI installed (optional but recommended)
- SSH key pair for EC2 access

## Step 1: Launch EC2 Instance

### Via AWS Console:
1. **Go to EC2 Dashboard**: https://console.aws.amazon.com/ec2/
2. **Click "Launch Instance"**
3. **Configure Instance**:
   ```
   Name: pi-wireless-monitor-server
   AMI: Ubuntu Server 22.04 LTS (Free Tier Eligible)
   Instance Type: t3.small (or t2.micro for testing)
   Key Pair: Create new or select existing
   Security Group: Create new (see below)
   Storage: 20GB gp3 (minimum)
   ```

### Security Group Configuration:
```
Inbound Rules:
- SSH (22): Your IP address
- HTTP (80): 0.0.0.0/0 (for web access)
- HTTPS (443): 0.0.0.0/0 (for secure web access)
- Custom TCP (3000): 0.0.0.0/0 (React dashboard)
- Custom TCP (3001): 0.0.0.0/0 (API server)
- Custom TCP (8081): Your IP (MongoDB admin - restrict!)
- Custom TCP (8082): Your IP (Redis admin - restrict!)
```

## Step 2: Connect to Instance

```bash
# Connect via SSH (replace with your key and instance IP)
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip

# Update system
sudo apt update && sudo apt upgrade -y
```

## Step 3: Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Log out and back in for group changes
exit
# SSH back in
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

## Step 4: Deploy Your Application

```bash
# Clone your repository
git clone https://github.com/yourusername/pi-wireless-monitor.git
cd pi-wireless-monitor

# Create production environment file
cp .env.example .env
nano .env
```

### Production Environment (.env):
```env
# CHANGE THESE FOR PRODUCTION!
MONGO_INITDB_ROOT_PASSWORD=secure-production-password
REDIS_PASSWORD=secure-redis-password
API_KEY=your-production-api-key
JWT_SECRET=your-production-jwt-secret

# Use EC2 instance IP for Raspberry Pi connections
SERVER_URL=http://your-ec2-public-ip:3001
```

### Update docker-compose.yml for production:
```bash
# Create production override
cp docker-compose.override.yml.example docker-compose.override.yml
nano docker-compose.override.yml
```

Production override:
```yaml
services:
  server:
    environment:
      - NODE_ENV=production
    restart: always
  
  dashboard:
    environment:
      - REACT_APP_API_URL=http://your-ec2-public-ip:3001
      - REACT_APP_SOCKET_URL=http://your-ec2-public-ip:3001
    restart: always
  
  mongodb:
    restart: always
    # Don't expose port in production
    ports: []
    
  redis:
    restart: always
    # Don't expose port in production
    ports: []

  # Disable admin interfaces in production
  mongo-express:
    profiles: ["debug"]
  
  redis-commander:
    profiles: ["debug"]
```

## Step 5: Start Services

```bash
# Update passwords in docker-compose.yml first!
nano docker-compose.yml

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs
```

## Step 6: Configure Domain (Optional)

### Using AWS Route 53:
1. **Register domain** or use existing
2. **Create hosted zone** in Route 53
3. **Add A record** pointing to EC2 public IP
4. **Update environment variables** to use domain

### Using Nginx Reverse Proxy:
```bash
# Install nginx
sudo apt install nginx -y

# Create nginx config
sudo nano /etc/nginx/sites-available/pi-monitor
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pi-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: SSL Certificate (Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 8: Configure Raspberry Pi Connections

Update your Raspberry Pi `.env` files:
```env
# Use your EC2 public IP or domain
SERVER_URL=http://your-ec2-public-ip:3001
# or
SERVER_URL=https://your-domain.com/api
```

## Monitoring and Maintenance

### View logs:
```bash
docker-compose logs -f

# Specific service
docker-compose logs -f server
```

### Update application:
```bash
git pull
docker-compose build
docker-compose up -d
```

### Backup data:
```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups

# Backup MongoDB
docker-compose exec -T mongodb mongodump --archive | gzip > backups/mongodb_$DATE.gz

# Backup volumes
docker run --rm -v pi-wireless-monitor_mongodb_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/volumes_$DATE.tar.gz -C /data .

echo "Backup completed: $DATE"
```

```bash
chmod +x backup.sh
./backup.sh

# Schedule daily backups
sudo crontab -e
# Add: 0 2 * * * /home/ubuntu/pi-wireless-monitor/backup.sh
```

## Cost Optimization

### Instance Types:
- **t2.micro**: Free tier, good for testing
- **t3.small**: $15-20/month, good for production
- **t3.medium**: $30-40/month, better performance

### Storage:
- **gp3**: More cost-effective than gp2
- **20GB minimum** for logs and data

### Monitoring:
```bash
# Monitor resource usage
htop
docker stats
df -h
```

## Troubleshooting

### Instance not accessible:
- Check Security Group rules
- Verify instance is running
- Check SSH key permissions: `chmod 400 your-key.pem`

### Services not starting:
```bash
# Check logs
docker-compose logs
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker
docker-compose up -d
```

### Performance issues:
```bash
# Monitor resources
top
iostat
docker stats

# Consider upgrading instance type
```

## Security Best Practices

1. **Change all default passwords**
2. **Use IAM roles** instead of access keys
3. **Restrict Security Group** access
4. **Enable CloudTrail** for audit logging
5. **Regular security updates**: `sudo apt update && sudo apt upgrade`
6. **Use HTTPS** in production
7. **Backup regularly**
8. **Monitor with CloudWatch** 