# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Structure

This project uses a **split documentation approach** for better performance and organization:

- **[docs/main.md](docs/main.md)** - Project overview, development commands, environment setup
- **[docs/deployment.md](docs/deployment.md)** - AWS deployment, SSH access, git workflow
- **[docs/architecture.md](docs/architecture.md)** - System architecture, API endpoints, database schema
- **[docs/features.md](docs/features.md)** - Implementation status, completed features, recent fixes
- **[docs/troubleshooting.md](docs/troubleshooting.md)** - Common issues, debugging guides, solutions
- **[docs/development.md](docs/development.md)** - Development workflows, coding standards, best practices

## Quick Reference

### Essential Commands
```bash
# Development
npm run dev          # Start backend server
npm start            # Start frontend dashboard
docker-compose up -d # Start all services

# AWS Deployment
git push origin main
ssh -i ~/.ssh/docker-dashboard.pem ubuntu@47.128.13.65 "cd /home/ubuntu/pi-wireless-monitor && git pull origin main && docker-compose down && docker-compose up -d --build"

# Testing/Debugging
docker-compose exec server node scripts/nodejs-dns-latency.js test 5  # Real DNS latency
curl -s http://localhost:3001/api/ssid-analyzer/status/PI-living       # Check SSID status
```

### Production URLs
- **Dashboard**: http://47.128.13.65:3000
- **API**: http://47.128.13.65:3001/api
- **Socket.IO**: http://47.128.13.65:3001

### Current Status
- ✅ **SSID Connection Analyzer** - Fully implemented with real DNS latency
- ✅ **Floor Plans Feature** - Complete with drag-and-drop monitor positioning  
- ✅ **Enhanced Metrics Dashboard** - MUI X-Charts with system/network performance
- ✅ **Coverage Settings** - Global configuration and coverage area management
- ✅ **Activity Tracking** - Real-time activity feed and logging system

### Recent Fixes
- ✅ **DNS Latency Min/Max Values** - No longer shows "N/A" in Performance Summary
- ✅ **Stability Score Min/Max Values** - Complete statistical display implemented
- ✅ **Real DNS Measurements** - Node.js-based DNS latency collection (2.31ms - 19.54ms range)

## Important Notes

### Development Workflow
1. **Code changes locally** → `git commit` → `git push origin main`
2. **Deploy to AWS**: SSH in → `git pull` → `docker-compose up -d --build`
3. **Always test on AWS server** - local testing not possible
4. **Always run lint/typecheck** before considering tasks complete

### Critical Instructions
- **Do what has been asked; nothing more, nothing less**
- **NEVER create files** unless absolutely necessary 
- **ALWAYS prefer editing** existing files to creating new ones
- **NEVER proactively create documentation** unless explicitly requested
- **Use TodoWrite tool** for complex tasks (3+ steps)
- **Keep responses concise** (under 4 lines unless detail requested)

*For detailed information on any topic, refer to the appropriate documentation file in the `docs/` directory.*