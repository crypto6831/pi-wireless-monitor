# Docker Setup Guide for Pi Wireless Monitor

This guide explains how to run the entire Pi Wireless Monitor system using Docker containers.

## Prerequisites

1. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
2. **Docker Compose** (usually included with Docker Desktop)
3. **Git** (to clone the repository)

### Installing Docker

#### Windows
1. Download Docker Desktop from https://docker.com/products/docker-desktop
2. Install and restart your computer
3. Verify installation: `docker --version`

#### macOS
1. Download Docker Desktop from https://docker.com/products/docker-desktop
2. Install the .dmg file
3. Verify installation: `docker --version`

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/pi-wireless-monitor.git
cd pi-wireless-monitor
```

### 2. Configure Environment Variables

**IMPORTANT**: Before starting, you must update the security credentials in `docker-compose.yml`:

```yaml
# Change these default passwords in docker-compose.yml:
MONGO_INITDB_ROOT_PASSWORD=your-secure-mongo-password
command: redis-server --appendonly yes --requirepass your-secure-redis-password
API_KEY=your-secure-api-key-here
JWT_SECRET=your-jwt-secret-here
```

### 3. Start All Services
```bash
# Start everything in background
docker-compose up -d

# Or start with logs visible
docker-compose up
```

### 4. Verify Everything is Running
```bash
# Check all services
docker-compose ps

# Should show:
# - pi-monitor-mongodb (port 27017)
# - pi-monitor-redis (port 6379)
# - pi-monitor-server (port 3001)
# - pi-monitor-dashboard (port 3000)
# - pi-monitor-mongo-express (port 8081)
# - pi-monitor-redis-commander (port 8082)
```

## Service Access Points

Once running, you can access:

| Service | URL | Purpose |
|---------|-----|---------|
| **Dashboard** | http://localhost:3000 | Main web interface |
| **API Server** | http://localhost:3001 | Backend API |
| **API Health** | http://localhost:3001/health | Server health check |
| **MongoDB Admin** | http://localhost:8081 | Database management |
| **Redis Admin** | http://localhost:8082 | Cache management |

### Default Credentials

**MongoDB Express**: admin / admin123  
**Redis Commander**: No login required

## Docker Commands

### Starting Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d mongodb redis

# Start and see logs
docker-compose up server dashboard
```

### Stopping Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes data!)
docker-compose down -v

# Stop specific service
docker-compose stop server
```

### Viewing Logs
```bash
# All services logs
docker-compose logs

# Specific service logs
docker-compose logs server
docker-compose logs dashboard

# Follow logs in real-time
docker-compose logs -f server
```

### Managing Data
```bash
# View volumes
docker volume ls

# Backup MongoDB data
docker run --rm -v pi-wireless-monitor_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb-backup.tar.gz -C /data .

# Restore MongoDB data
docker run --rm -v pi-wireless-monitor_mongodb_data:/data -v $(pwd):/backup alpine tar xzf /backup/mongodb-backup.tar.gz -C /data
```

## Development Workflow

### Hot Reload Setup

The docker-compose.yml is configured for development with hot reload:

- **Server**: Changes to `./server/` files trigger automatic restart
- **Dashboard**: Changes to `./dashboard/` files trigger automatic refresh

### Making Changes

1. **Edit files locally** in your favorite editor
2. **Changes are automatically reflected** in the containers
3. **No need to rebuild** for most changes

### Rebuilding Containers

If you modify `package.json` or `Dockerfile`:

```bash
# Rebuild specific service
docker-compose build server
docker-compose build dashboard

# Rebuild and restart
docker-compose up -d --build server

# Rebuild everything
docker-compose build
```

## Raspberry Pi Integration

### Connecting Raspberry Pis

1. **Update Raspberry Pi configuration** (`raspberry-pi/.env`):
   ```env
   SERVER_URL=http://your-docker-host-ip:3001
   ```

2. **Find your Docker host IP**:
   ```bash
   # Windows/Mac (Docker Desktop)
   # Use your computer's local IP address
   
   # Linux
   ip addr show docker0
   ```

3. **Ensure firewall allows connections** on port 3001

### Testing Connection

From Raspberry Pi:
```bash
# Test server connectivity
curl http://your-docker-host-ip:3001/health

# Should return: {"status":"ok","timestamp":"..."}
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find what's using the port
netstat -tulpn | grep :3001

# Kill the process or change docker-compose ports
```

#### 2. Container Won't Start
```bash
# Check logs
docker-compose logs service-name

# Check container status
docker-compose ps
```

#### 3. Database Connection Failed
```bash
# Restart database services
docker-compose restart mongodb redis

# Check if databases are ready
docker-compose logs mongodb | grep "waiting for connections"
```

#### 4. Permission Issues (Linux)
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Add user to docker group
sudo usermod -aG docker $USER
# Log out and log back in
```

### Advanced Debugging

#### Access Container Shell
```bash
# Server container
docker-compose exec server sh

# Dashboard container
docker-compose exec dashboard sh

# MongoDB container
docker-compose exec mongodb mongo
```

#### Monitor Resource Usage
```bash
# Container resource usage
docker stats

# Specific service usage
docker stats pi-monitor-server
```

## Production Deployment

### Security Checklist

1. **Change all default passwords**
2. **Use environment files** instead of hardcoded values
3. **Enable HTTPS** (add reverse proxy like nginx)
4. **Restrict network access** (firewall rules)
5. **Regular backups** of volumes
6. **Monitor container health**

### Production docker-compose.override.yml

Create a production override:

```yaml
services:
  server:
    environment:
      - NODE_ENV=production
    restart: always
  
  dashboard:
    build:
      target: production
    restart: always
  
  mongodb:
    restart: always
    
  redis:
    restart: always

  # Remove admin interfaces in production
  mongo-express:
    profiles: ["debug"]
  
  redis-commander:
    profiles: ["debug"]
```

Deploy with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

## Monitoring and Maintenance

### Health Checks
```bash
# Quick health check of all services
docker-compose ps

# Detailed health status
docker inspect pi-monitor-server | grep Health -A 10
```

### Log Rotation
```bash
# Configure Docker log rotation in /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### Updates
```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

## Environment Variables Reference

| Variable | Service | Description | Default |
|----------|---------|-------------|---------|
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB | MongoDB root password | admin123 |
| `MONGODB_URI` | Server | MongoDB connection string | auto-generated |
| `REDIS_URL` | Server | Redis connection string | auto-generated |
| `API_KEY` | Server | API authentication key | your-secure-api-key-here |
| `JWT_SECRET` | Server | JWT signing secret | your-jwt-secret-here |
| `REACT_APP_API_URL` | Dashboard | Backend API URL | http://localhost:3001 |
| `REACT_APP_SOCKET_URL` | Dashboard | WebSocket URL | http://localhost:3001 |

## Getting Help

1. **Check service logs**: `docker-compose logs service-name`
2. **Verify service health**: `docker-compose ps`
3. **Test connectivity**: Use curl commands above
4. **Reset everything**: `docker-compose down -v && docker-compose up -d`

For more detailed configuration options, see the individual service documentation in their respective directories. 