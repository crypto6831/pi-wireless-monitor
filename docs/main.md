# Pi Wireless Monitor - Main Documentation

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pi Wireless Monitor is a distributed WiFi network monitoring system with three main components:
- **Raspberry Pi monitors**: Python-based sensors that scan WiFi networks and collect metrics
- **Backend server**: Node.js/Express API with MongoDB/Redis for data storage and real-time updates
- **Frontend dashboard**: React-based web interface with real-time monitoring capabilities

## Development Commands

### Backend Server
```bash
cd server
npm install              # Install dependencies
npm run dev             # Start development server with nodemon
npm start               # Start production server
npm run lint            # Run ESLint
npm test                # Run Jest tests (when implemented)
```

### Frontend Dashboard
```bash
cd dashboard
npm install              # Install dependencies
npm start               # Start development server (port 3000)
npm run build           # Build for production
npm test                # Run tests
```

### Docker Development
```bash
docker-compose up -d    # Start all services
docker-compose down     # Stop all services
docker-compose logs -f  # View logs
```

### Raspberry Pi Monitor
```bash
cd raspberry-pi
pip install -r requirements.txt  # Install dependencies
python src/main.py              # Run monitor manually
sudo systemctl start pi-monitor # Start as service
sudo systemctl status pi-monitor # Check service status
```

## Environment Configuration

### Server (.env)
```
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/pi-monitor
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

### Dashboard (.env)
```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_SOCKET_URL=http://localhost:3001
```

### Raspberry Pi (.env)
```
SERVER_URL=http://your-server:3001
MONITOR_NAME=Monitor-1
MONITOR_AUTH_TOKEN=your-auth-token
SCAN_INTERVAL=60
```

## Common Development Tasks

### Adding a New API Endpoint
1. Create route file in `server/src/routes/`
2. Add mongoose model in `server/src/models/`
3. Register route in `server/src/index.js`
4. Update frontend API service in `dashboard/src/services/api.js`

### Modifying Dashboard Components
- Components in `dashboard/src/components/`
- Redux slices in `dashboard/src/store/slices/`
- Pages in `dashboard/src/pages/`
- Use Material-UI components for consistency

### Updating Monitor Metrics
- Scanner logic in `raspberry-pi/src/scanner.py`
- Metrics collection in `raspberry-pi/src/metrics.py`
- API client in `raspberry-pi/src/api_client.py`

## Production URLs
- **Dashboard**: `http://47.128.13.65:3000`
- **API Base**: `http://47.128.13.65:3001/api`
- **Socket.IO**: `http://47.128.13.65:3001`

## Testing & Debugging Scripts

### Mock Data Generation
```bash
# Send mock SSID connection data
docker-compose exec server node scripts/mock-ssid-data.js test 5

# Send real DNS latency measurements  
docker-compose exec server node scripts/nodejs-dns-latency.js test 5
```

### Quick Status Checks
```bash
# Check SSID analyzer status
curl -s http://localhost:3001/api/ssid-analyzer/status/PI-living

# Check performance metrics
curl -s http://localhost:3001/api/ssid-analyzer/performance/PI-living
```