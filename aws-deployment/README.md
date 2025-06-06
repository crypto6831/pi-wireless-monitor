# AWS Deployment for Pi Wireless Monitor 🚀

## Quick Start (Recommended)

**For immediate deployment**: Follow the [EC2 Setup Guide](ec2-setup.md)  
**Time**: 30 minutes | **Cost**: ~$20/month | **Difficulty**: Easy

## Available Deployment Options

### 🟢 [EC2 with Docker Compose](ec2-setup.md) - RECOMMENDED
- **Best for**: Getting started, development, small production
- **Complexity**: Low
- **Cost**: $15-30/month
- **Setup time**: 30 minutes

### 🟡 [ECS with Fargate](ecs-setup.md) - Advanced
- **Best for**: Large production, high availability
- **Complexity**: High  
- **Cost**: $100-200/month
- **Setup time**: 2-4 hours

### 📊 [Full Comparison](comparison.md) - Decision Help
- Side-by-side comparison of all options
- Cost analysis and recommendations
- Migration paths between options

## What You'll Get

After deployment, you'll have:

✅ **Web Dashboard** - Monitor all your Raspberry Pis  
✅ **REST API** - For Raspberry Pi data collection  
✅ **Real-time Updates** - Live data via WebSockets  
✅ **Database** - MongoDB for data storage  
✅ **Caching** - Redis for performance  
✅ **HTTPS** - Secure connections  
✅ **Backups** - Automated data protection  

## Architecture Overview

```
[Raspberry Pis] → [AWS EC2/ECS] → [Dashboard]
                      ↓
              [MongoDB + Redis]
```

## Prerequisites

Before starting any deployment:

1. **AWS Account** with billing enabled
2. **Domain name** (optional but recommended for production)
3. **SSH key pair** for EC2 access
4. **Basic terminal/command line** knowledge

## Quick Decision Tree

**New to AWS?** → Start with [EC2 Setup](ec2-setup.md)  
**Need high availability?** → Use [ECS Setup](ecs-setup.md)  
**Not sure which?** → Read [Comparison Guide](comparison.md)  

## Step-by-Step (EC2 Quickstart)

### 1. Launch EC2 Instance
- Go to AWS Console → EC2
- Launch Ubuntu 22.04 t3.small instance
- Allow ports: 22, 80, 443, 3000, 3001

### 2. Connect and Install Docker
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
```

### 3. Deploy Application
```bash
git clone https://github.com/yourusername/pi-wireless-monitor.git
cd pi-wireless-monitor
# Update passwords in docker-compose.yml
docker-compose up -d
```

### 4. Access Your Dashboard
Visit: `http://your-ec2-public-ip:3000`

### 5. Connect Raspberry Pis
Update Pi `.env` files:
```env
SERVER_URL=http://your-ec2-public-ip:3001
```

## Post-Deployment

### Security (Important!)
1. **Change default passwords** in docker-compose.yml
2. **Set up HTTPS** with Let's Encrypt
3. **Restrict database access** to your IP only
4. **Regular backups** of data

### Monitoring
- Check logs: `docker-compose logs -f`
- Monitor resources: `htop`, `docker stats`
- Set up CloudWatch for advanced monitoring

### Scaling
- **Vertical**: Upgrade EC2 instance type
- **Horizontal**: Add load balancer + multiple instances
- **Managed**: Migrate to ECS for auto-scaling

## Costs

### Development/Small Production
- **EC2 t3.small**: $15-20/month
- **Storage**: $2-5/month
- **Total**: ~$20-25/month

### High Availability Production
- **ECS Fargate**: $50-100/month
- **Managed databases**: $50-150/month
- **Load balancer**: $20/month
- **Total**: ~$120-270/month

## Support & Troubleshooting

### Common Issues
1. **Can't access dashboard**: Check Security Group rules
2. **Pi can't connect**: Verify SERVER_URL and firewall
3. **Database errors**: Check MongoDB logs and credentials
4. **Performance issues**: Monitor CPU/memory usage

### Getting Help
- Check the detailed guides in each deployment option
- Review AWS documentation
- Monitor CloudWatch logs
- Use `docker-compose logs` for application debugging

## Next Steps

1. **Start with EC2** - Use [ec2-setup.md](ec2-setup.md)
2. **Test thoroughly** - Deploy a few Raspberry Pis
3. **Add HTTPS** - Get SSL certificate
4. **Set up monitoring** - CloudWatch integration
5. **Plan scaling** - Consider ECS migration if needed

## Files in This Directory

- `ec2-setup.md` - Complete EC2 deployment guide
- `ecs-setup.md` - Advanced ECS deployment guide  
- `comparison.md` - Compare all deployment options
- `README.md` - This overview file

Ready to deploy? Start with the [EC2 Setup Guide](ec2-setup.md)! 🚀 