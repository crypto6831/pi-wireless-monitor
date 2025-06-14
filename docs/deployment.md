# Deployment Documentation

## AWS Server SSH Access
**Production server runs on AWS Lightsail at IP: 47.128.13.65**

```bash
# SSH to AWS server (interactive)
ssh -i ~/.ssh/docker-dashboard.pem ubuntu@47.128.13.65

# SSH with remote command execution (preferred for Claude Code)
ssh -i ~/.ssh/docker-dashboard.pem ubuntu@47.128.13.65 "cd /home/ubuntu/pi-wireless-monitor && [command]"

# Standard deployment workflow
ssh -i ~/.ssh/docker-dashboard.pem ubuntu@47.128.13.65 "cd /home/ubuntu/pi-wireless-monitor && git pull origin main"
ssh -i ~/.ssh/docker-dashboard.pem ubuntu@47.128.13.65 "cd /home/ubuntu/pi-wireless-monitor && docker-compose down"
ssh -i ~/.ssh/docker-dashboard.pem ubuntu@47.128.13.65 "cd /home/ubuntu/pi-wireless-monitor && docker-compose up -d --build"

# Note: SSH key is now at ~/.ssh/docker-dashboard.pem with permissions 600
```

## Git Workflow for AWS Deployment

**IMPORTANT**: After implementing code changes locally, follow this workflow:

1. **Commit Changes Locally**:
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

2. **Push to Repository**:
   ```bash
   git push origin main
   ```

3. **Deploy to AWS Server**:
   - SSH into AWS Ubuntu server
   - Navigate to project directory
   - Pull latest changes:
     ```bash
     git pull origin main
     ```
   - Restart services as needed:
     ```bash
     docker-compose down
     docker-compose up -d --build
     ```

## Production Environment
- **Server Location**: AWS Ubuntu Server (EC2 instance)
- **NOT running locally** - All testing must be done on AWS server
- Production uses Docker Compose configuration
- AWS deployment guides available for EC2 and ECS
- Raspberry Pi uses systemd service for auto-start
- MongoDB and Redis should be properly secured in production
- Frontend builds to `dashboard/build/` for static hosting

## Testing Notes
- **Local testing is NOT possible** - server runs only on AWS
- All API endpoints must be tested on AWS server after deployment
- Dashboard access requires AWS server to be running
- Monitor connections require AWS server endpoints
- Use AWS server IP/domain for all API calls

## Critical Reminders
1. **ALWAYS push code changes to git before testing**
2. **Server is on AWS, not local machine**
3. **Pull changes on AWS server after pushing**
4. **Restart Docker services after pulling updates**
5. **Check AWS server logs for debugging**