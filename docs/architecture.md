# Architecture & API Documentation

## Architecture & Key Concepts

### API Endpoints
The server exposes REST APIs at `http://localhost:3001/api/`:
- `/monitors` - Raspberry Pi monitor management, positioning, coverage areas
- `/networks` - WiFi network data
- `/metrics` - Performance metrics
- `/devices` - Connected devices
- `/alerts` - System alerts
- `/locations` - Building/floor hierarchy, floor plan management
- `/service-monitors` - Service monitoring (ping, HTTP, TCP, UDP checks)
- `/activities` - System activity tracking and logging
- `/ssid-analyzer` - SSID connection monitoring and analysis

All endpoints require JWT authentication (except monitor registration).

### Real-time Updates
- Server uses Socket.IO for WebSocket connections
- Events: `monitor:update`, `network:update`, `metric:update`, `alert:new`, `activity:new`
- Redis pub/sub pattern for scalability

### Database Schema
- **monitors**: Raspberry Pi devices with auth tokens, location positioning (x,y coordinates)
- **networks**: WiFi networks with signal strength
- **metrics**: Performance data (latency, packet loss, system stats)
- **devices**: Detected devices on networks
- **alerts**: System notifications
- **activities**: System activity logs with timestamps and metadata
- **locations**: Building/floor hierarchy with floor plan storage
- **coverageAreas**: WiFi coverage zones for monitors (circle, polygon, rectangle)
- **serviceMonitors**: Service monitoring configurations (ping, HTTP, TCP, UDP)
- **ssidConnections**: SSID connection status and performance data

### Monitor Authentication
- Monitors register with server to get auth token
- Token stored in `raspberry-pi/.env` as `MONITOR_AUTH_TOKEN`
- All monitor API calls require this token in headers

## Key API Endpoints

### SSID Analyzer API
```bash
# Get connection status
GET /api/ssid-analyzer/status/:monitorId

# Get performance metrics
GET /api/ssid-analyzer/performance/:monitorId?period=24h

# Get incident timeline
GET /api/ssid-analyzer/incidents/:monitorId?timeRange=24h

# Post connection data (from Pi)
POST /api/ssid-analyzer/connection
```

### Monitor Management
```bash
# List all monitors
GET /api/monitors

# Update monitor position
PUT /api/monitors/:id/position

# Update WiFi connection info
PUT /api/monitors/:id/wifi-connection
```

### Location & Floor Plans
```bash
# Get location hierarchy
GET /api/locations

# Upload floor plan
POST /api/locations/:id/floor-plan

# Get floor plan image
GET /api/floor-plans/:id/image
```