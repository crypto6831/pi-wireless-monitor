# Ubuntu Docker Dashboard Installation Guide

## Prerequisites
- Ubuntu Docker container (18.04 or newer)
- Root or sudo access
- Internet connection

## Step-by-Step Installation

### Step 1: Update Ubuntu and Install Dependencies

```bash
# Update package list
sudo apt-get update

# Install basic dependencies
sudo apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg

# Install Node.js 18.x (recommended for React)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### Step 2: Clone the Repository

```bash
# Clone the repository (or copy the dashboard folder)
git clone https://github.com/your-repo/pi-wireless-monitor.git
cd pi-wireless-monitor/dashboard

# Alternative: If you're copying files directly
# Copy dashboard folder to container and navigate to it
cd /path/to/dashboard
```

### Step 3: Install Dashboard Dependencies

```bash
# Install npm packages
npm install

# If you encounter permission issues, try:
npm install --unsafe-perm=true --allow-root
```

### Step 4: Configure Environment Variables

```bash
# Create .env file for dashboard configuration
cat > .env << EOF
REACT_APP_API_URL=http://47.128.72.232:5003/api
REACT_APP_SOCKET_URL=47.128.72.232:5003
EOF

# Replace 'your-server-ip' with actual server IP or hostname
# For local development, use: localhost or host.docker.internal
```

### Step 5: Build for Production

```bash
# Build the production bundle
npm run build

# The build output will be in the 'build' directory
```

### Step 6: Serve the Dashboard

#### Option A: Using serve (Quick method)
```bash
# Install serve globally
npm install -g serve

# Serve the build directory on port 3000
serve -s build -l 3000
```

#### Option B: Using nginx (Production method)
```bash
# Install nginx
sudo apt-get install -y nginx

# Copy build files to nginx directory
sudo cp -r build/* /var/www/html/

# Configure nginx (create config file)
sudo tee /etc/nginx/sites-available/dashboard << EOF
server {
    listen 80;
    server_name _;
    
    root /var/www/html;
    index index.html;
    
    location / {
        try_files \$uri /index.html;
    }
    
    location /api {
        proxy_pass http://your-server-ip:5003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t
sudo service nginx restart
```

### Step 7: Dockerfile for Automated Build

Create a Dockerfile for easy deployment:

```dockerfile
FROM ubuntu:20.04

# Prevent timezone prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    nginx \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dashboard files
COPY dashboard/package*.json ./
RUN npm install --production

COPY dashboard/ ./

# Build the application
RUN npm run build

# Copy build to nginx
RUN cp -r build/* /var/www/html/

# Copy nginx config
COPY nginx-dashboard.conf /etc/nginx/sites-available/default

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Step 8: Docker Compose Integration

Add to your docker-compose.yml:

```yaml
dashboard:
  build:
    context: .
    dockerfile: dashboard/Dockerfile
  ports:
    - "3000:80"
  environment:
    - REACT_APP_API_URL=http://server:5003/api
    - REACT_APP_SOCKET_URL=http://server:5003
  depends_on:
    - server
  networks:
    - pi-monitor-network
```

## Verification Steps

1. **Check if dashboard is running:**
   ```bash
   curl http://localhost:3000
   # Should return HTML content
   ```

2. **Check nginx status (if using nginx):**
   ```bash
   sudo service nginx status
   ```

3. **View logs:**
   ```bash
   # For serve
   # Logs appear in terminal
   
   # For nginx
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

## Troubleshooting

### Common Issues:

1. **npm install fails:**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Try with different registry
   npm install --registry https://registry.npmjs.org/
   ```

2. **Build fails with memory error:**
   ```bash
   # Increase Node memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

3. **Cannot connect to API:**
   - Verify REACT_APP_API_URL is correct
   - Check if server is running and accessible
   - Ensure no firewall blocking the connection

4. **Permission denied errors:**
   ```bash
   # Run as root or use sudo
   sudo npm install
   
   # Or fix npm permissions
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

## Security Considerations

1. **Production builds:**
   - Always use `npm run build` for production
   - Enable gzip compression in nginx
   - Set proper CORS headers

2. **Environment variables:**
   - Never commit .env files
   - Use Docker secrets for sensitive data
   - Validate all API URLs

3. **Network security:**
   - Use HTTPS in production
   - Implement proper authentication
   - Restrict API access to dashboard only

## Quick Start Script

Save this as `install-dashboard.sh`:

```bash
#!/bin/bash
set -e

echo "Installing Pi Wireless Monitor Dashboard..."

# Update system
sudo apt-get update
sudo apt-get install -y curl git build-essential

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone or navigate to dashboard
cd /app/dashboard

# Install dependencies
npm install

# Configure environment
echo "REACT_APP_API_URL=http://localhost:5003/api" > .env
echo "REACT_APP_SOCKET_URL=http://localhost:5003" >> .env

# Build
npm run build

# Install and serve
npm install -g serve
serve -s build -l 3000 &

echo "Dashboard installed and running on port 3000!"
```

Make it executable: `chmod +x install-dashboard.sh`