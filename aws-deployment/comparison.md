# AWS Deployment Options Comparison

## Quick Decision Guide

### For Beginners: 🟢 **EC2 with Docker Compose**
- ✅ Most similar to local development
- ✅ Full control over environment  
- ✅ Lowest cost (~$15-30/month)
- ✅ Your existing docker-compose.yml works

### For Production at Scale: 🟡 **ECS with Fargate**
- ✅ Fully managed, auto-scaling
- ✅ High availability
- ❌ Higher cost (~$100-200/month)
- ❌ More complex setup

### For Simple Apps: 🟢 **AWS App Runner**
- ✅ Easiest deployment
- ✅ Auto-scaling
- ❌ Limited to stateless apps
- ❌ No MongoDB/Redis hosting

## Detailed Comparison

| Feature | EC2 + Docker | ECS Fargate | App Runner |
|---------|--------------|-------------|------------|
| **Setup Complexity** | Easy | Complex | Very Easy |
| **Cost (Monthly)** | $15-30 | $100-200 | $20-50 |
| **Scaling** | Manual | Automatic | Automatic |
| **Maintenance** | You manage | AWS manages | AWS manages |
| **Database** | Self-hosted | Managed services | External required |
| **Learning Curve** | Low | High | Very Low |
| **Best For** | Development, Small production | Large production | Simple web apps |

## Recommended Approach

### Phase 1: Start with EC2
```bash
# Quick deployment to test everything works
# Use the EC2 guide for fastest time-to-market
```

### Phase 2: Scale with ECS (if needed)
```bash
# When you need high availability and auto-scaling
# Migrate existing containers to ECS
```

## Step-by-Step for EC2 (Recommended First Step)

### 1. Launch EC2 Instance
- **Instance Type**: t3.small ($20/month)
- **Storage**: 20GB
- **Security Group**: Allow ports 22, 80, 443, 3000, 3001

### 2. Install Docker
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Deploy Your App
```bash
# Clone your repo
git clone https://github.com/yourusername/pi-wireless-monitor.git
cd pi-wireless-monitor

# Update security passwords in docker-compose.yml
nano docker-compose.yml

# Start services
docker-compose up -d
```

### 4. Configure Raspberry Pis
Update your Pi `.env` files:
```env
SERVER_URL=http://your-ec2-public-ip:3001
```

### 5. Access Your Dashboard
Visit: `http://your-ec2-public-ip:3000`

## Cost Breakdown (EC2 Approach)

| Service | Monthly Cost |
|---------|--------------|
| t3.small EC2 | $15-20 |
| 20GB Storage | $2 |
| Data Transfer | $1-5 |
| **Total** | **$18-27** |

## Security Considerations

### For Production:
1. **Get a domain name** (~$12/year)
2. **Set up HTTPS** with Let's Encrypt (free)
3. **Restrict admin interfaces** (MongoDB/Redis admin)
4. **Use strong passwords**
5. **Regular backups**

### Quick Security Setup:
```bash
# Install nginx reverse proxy
sudo apt install nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## When to Upgrade to ECS

Consider ECS when you need:
- **High availability** (99.9%+ uptime)
- **Auto-scaling** (handle traffic spikes)
- **Multiple environments** (dev, staging, prod)
- **Team collaboration** (multiple developers)

## Migration Path

### EC2 → ECS Migration:
1. Your containers already work
2. Push to ECR (Elastic Container Registry)
3. Create ECS task definitions
4. Set up load balancer
5. Migrate traffic

This gives you a clear upgrade path without starting over.

## Getting Started Today

**Recommended**: Start with EC2 approach using the [EC2 Setup Guide](ec2-setup.md)

**Time to deploy**: ~30 minutes  
**Monthly cost**: ~$20  
**Skill level**: Beginner-friendly  

You can always migrate to ECS later when you need more advanced features! 