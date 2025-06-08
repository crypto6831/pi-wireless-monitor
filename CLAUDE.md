# CLAUDE.md

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

### AWS Server SSH Access
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
```

### Raspberry Pi Monitor
```bash
cd raspberry-pi
pip install -r requirements.txt  # Install dependencies
python src/main.py              # Run monitor manually
sudo systemctl start pi-monitor # Start as service
sudo systemctl status pi-monitor # Check service status
```

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

### Monitor Authentication
- Monitors register with server to get auth token
- Token stored in `raspberry-pi/.env` as `MONITOR_AUTH_TOKEN`
- All monitor API calls require this token in headers

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

## Deployment Notes

### Production Environment
- **Server Location**: AWS Ubuntu Server (EC2 instance)
- **NOT running locally** - All testing must be done on AWS server
- Production uses Docker Compose configuration
- AWS deployment guides available for EC2 and ECS
- Raspberry Pi uses systemd service for auto-start
- MongoDB and Redis should be properly secured in production
- Frontend builds to `dashboard/build/` for static hosting

### Git Workflow for AWS Deployment

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

### Testing Notes
- **Local testing is NOT possible** - server runs only on AWS
- All API endpoints must be tested on AWS server after deployment
- Dashboard access requires AWS server to be running
- Monitor connections require AWS server endpoints
- Use AWS server IP/domain for all API calls

### Production URLs
- **Dashboard**: `http://47.128.13.65:3000`
- **API Base**: `http://47.128.13.65:3001/api`
- **Socket.IO**: `http://47.128.13.65:3001`


### Critical Reminders
1. **ALWAYS push code changes to git before testing**
2. **Server is on AWS, not local machine**
3. **Pull changes on AWS server after pushing**
4. **Restart Docker services after pulling updates**
5. **Check AWS server logs for debugging**

## Floor Plan Feature Implementation Status

### ✅ COMPLETED (Phase 1 - Backend)
- **Database Models**: Location, Monitor (with positioning), CoverageArea models
- **File Storage**: Floor plan upload/storage with Sharp image processing
- **API Endpoints**: Complete CRUD for locations, floor plans, monitor positioning
- **Migration Script**: `server/scripts/migrate-monitors-location.js` for existing monitors

### ✅ COMPLETED (Phase 2 - Frontend UI)
- **Location Hierarchy Component**: Cascading dropdowns, tree view, search, add new locations
- **Floor Plan Viewer**: Canvas-based display, zoom/pan, grid overlay, coordinate mapping
- **Monitor Management**: Drag & drop positioning, status indicators, bulk operations, info panels
- **Coverage Visualization**: Signal heatmap, coverage areas, interference zones, real-time updates

### Frontend Components
- `LocationHierarchy.js` - Address → Building → Floor selection with tree view and search
- `FloorPlanViewer.js` - HTML5 Canvas floor plan viewer with zoom/pan controls
- `MonitorOverlay.js` - Drag & drop monitor management with visual status indicators
- `CoverageOverlay.js` - Signal strength heatmap and coverage area visualization
- `FloorPlans.js` - Main page integrating all floor plan components

### Redux State Management
- `locationsSlice.js` - Location hierarchy, CRUD operations, floor plan uploads
- `floorPlanSlice.js` - Monitor positioning, coverage areas, view settings (zoom/pan)

### Key Floor Plan Features
- **Location Management**: Create locations, hierarchical organization (address → building → floor)
- **Floor Plan Upload**: Drag-and-drop image upload with processing and validation
- **Monitor Positioning**: Visual drag-and-drop monitor placement on floor plans
- **Coverage Visualization**: Real-time signal strength heatmaps and coverage areas
- **Interactive Controls**: Zoom, pan, grid overlay, toggle coverage layers
- **Multi-selection**: Bulk monitor operations with context menus

### API Integration
- Complete API service functions in `dashboard/src/services/api.js`
- Real-time updates via Redux state management
- Error handling and loading states throughout UI

### Navigation
- New "Floor Plans" menu item in sidebar (`/floor-plans` route)
- Integrated with existing dashboard navigation structure

## Floor Plan Drag-and-Drop Implementation

### Monitor Positioning via Drag-and-Drop
The floor plan feature includes drag-and-drop functionality for positioning monitors visually on floor plans.

#### Key Components:
- **MonitorListPanel.js**: Shows draggable monitors in "Unpositioned" section
- **FloorPlanViewer.js**: Canvas-based floor plan with drop zone handling
- **MonitorOverlayNew.js**: Renders positioned monitors on the floor plan

#### Implementation Details:
1. **Drag Source**: Unpositioned monitors in MonitorListPanel
   - Uses HTML5 drag-and-drop API
   - Transfers monitor data as JSON via dataTransfer
   - Visual feedback: cursor changes, drag indicators

2. **Drop Target**: FloorPlanViewer canvas container
   - Handles dragover, dragleave, and drop events
   - Calculates world coordinates from mouse position
   - Updates monitor position via API

3. **Monitor States**:
   - **Unpositioned**: `locationId: null, floorId: null` or different floor
   - **Positioned**: Has valid locationId, floorId, and x,y coordinates

#### Common Issues and Solutions:

1. **Removed monitors not draggable**:
   - **Issue**: Monitors with null locationId/floorId weren't showing as draggable
   - **Solution**: Updated filtering logic to always show null location monitors as unpositioned

2. **Drag events not firing**:
   - **Issue**: `canDrag` variable was an object instead of boolean
   - **Solution**: Use `!!selectedFloor` to ensure boolean value for draggable attribute

3. **Component remounting issues**:
   - **Issue**: Event listeners being constantly removed/re-added
   - **Solution**: Moved drag-drop handlers to stable FloorPlanViewer component

#### API Integration:
- **Update Position**: `PUT /api/monitors/:id/position`
  ```javascript
  {
    x: number,
    y: number,
    locationId: string,
    floorId: string
  }
  ```
- **Remove from Floor**: Set locationId and floorId to null, x and y to 0

#### Testing Drag-and-Drop:
1. Select a floor in the location hierarchy
2. Drag monitors from "Unpositioned" list
3. Drop on floor plan to position
4. Remove monitors via info dialog
5. Removed monitors appear back in "Unpositioned" list

## WiFi Connection Tooltip Feature

### Enhanced Monitor Tooltips
Monitors on floor plans now display detailed WiFi connection information when hovered.

#### Frontend Implementation:
- **MonitorTooltip.js**: Rich tooltip component showing complete WiFi connection details
- **Enhanced tooltip displays**:
  - **SSID**: Connected network name with WiFi icon
  - **BSSID**: Access Point MAC address in monospace font
  - **Signal Strength (RSSI)**: in dBm with color-coded quality indicator
  - **Channel**: WiFi channel with automatic 5GHz/2.4GHz band detection
  - **Frequency**: Operating frequency in MHz
  - **RX Rate**: Receive data rate in Mbps/Gbps
  - **TX Rate**: Transmit data rate in Mbps/Gbps
  - **Link Speed**: Connection speed in Mbps/Gbps
  - **Quality**: Connection quality percentage
  - **Last seen**: Human-readable timestamp

- **Signal Quality Indicators**:
  - Excellent: ≥ -50 dBm (green)
  - Good: -50 to -60 dBm (green)  
  - Fair: -60 to -70 dBm (orange)
  - Poor: -70 to -80 dBm (red)
  - Very Poor: < -80 dBm (red)

- **Visual Features**:
  - Icons for visual clarity (WiFi, Router, Speed)
  - Proper spacing and alignment
  - Band detection (5GHz/2.4GHz) based on frequency
  - Monospace font for BSSID readability
  - Data rates properly formatted (Mbps/Gbps conversion)

#### Backend Implementation:
- **Extended Monitor model** with `wifiConnection` schema:
  ```javascript
  wifiConnection: {
    ssid: String,           // Connected network name
    bssid: String,          // Access point MAC
    rssi: Number,           // Signal strength in dBm
    channel: Number,        // WiFi channel
    frequency: Number,      // Frequency in MHz
    rxRate: Number,         // RX data rate in Mbps
    txRate: Number,         // TX data rate in Mbps
    linkSpeed: Number,      // Link speed in Mbps
    quality: Number,        // Link quality percentage
    lastUpdated: Date       // Timestamp of last update
  }
  ```
- **API endpoint**: `PUT /monitors/:id/wifi-connection`

#### Raspberry Pi Integration:
- **Enhanced WiFi data collection** using nmcli and system commands
- **Dependencies removed**: No longer requires netifaces module
- **Real-time monitoring**: Data sent every 60 seconds (when enabled)
- **Data collection methods**:
  - `nmcli device wifi list` for comprehensive WiFi information
  - `ip addr show` for interface details
  - `/proc/net/wireless` for link quality
  - Regex parsing to handle escaped MAC addresses correctly

#### Collected WiFi Metrics:
- **SSID**: Network name from active connection
- **BSSID**: Access point MAC address (6C:5A:B0:7B:09:2F format)
- **RSSI**: Signal strength converted from percentage to dBm
- **Channel**: WiFi channel number (1-14 for 2.4GHz, 36+ for 5GHz)
- **Frequency**: Operating frequency in MHz (2412-2484 for 2.4GHz, 5000+ for 5GHz)
- **Data Rates**: RX/TX speeds from nmcli in Mbps
- **Quality**: Link quality percentage from /proc/net/wireless

#### Implementation Notes:
- **Parsing Challenges**: BSSID contains escaped colons in nmcli output (6C\:5A\:B0\:7B\:09\:2F)
- **Regex Solution**: Custom parsing to handle escaped characters correctly
- **Data Validation**: All numeric values validated and converted appropriately
- **Error Handling**: Graceful fallbacks for missing or invalid data
- **Performance**: Lightweight data collection using system commands

#### Testing the Feature:
1. Navigate to Floor Plans page: `http://47.128.13.65:3000/floor-plans`
2. Select a floor with positioned monitors
3. Hover over any monitor icon on the floor plan
4. View comprehensive tooltip with all WiFi connection details:
   - SSID: SmartHome
   - BSSID: 6C:5A:B0:7B:09:2F
   - Signal: -70 dBm (Fair)
   - Channel: 48 (5GHz channel)
   - Frequency: 5240 MHz
   - RX Rate: 540 Mbps
   - TX Rate: 540 Mbps
   - Link Speed: 540 Mbps
   - Quality: 60%
5. Signal quality is color-coded for quick visual assessment

#### Troubleshooting:
- **Missing Data**: Ensure Pi monitor service is running and sending data
- **Incomplete Fields**: Check nmcli output and regex parsing in scanner.py
- **Authentication Errors**: Verify API key and monitor ID in Pi configuration
- **Data Overwriting**: Disable WiFi data collection scheduling if needed to preserve manual data

## Activity Tracking System Implementation

### ✅ COMPLETED - Full Activity Tracking and Recent Activity Dashboard

#### Backend Implementation:
- **Activity Model** (`server/src/models/Activity.js`): Comprehensive activity logging with types, metadata, and real-time events
- **Activity Routes** (`server/src/routes/activities.js`): Full REST API for activity management
- **Activity Service** (`server/src/services/activityService.js`): Helper service for easy activity logging across the application
- **Integration**: Activity logging hooks added to monitor registration, system startup/shutdown

#### Activity Types:
- `monitor_connected`, `monitor_disconnected` - Monitor status changes
- `network_discovered`, `network_lost` - WiFi network detection
- `alert_triggered`, `alert_resolved` - Alert lifecycle
- `device_connected`, `device_disconnected` - Device detection
- `system_startup`, `system_shutdown` - System lifecycle
- `coverage_changed` - Coverage area modifications

#### Frontend Implementation:
- **Activities Redux Slice** (`dashboard/src/store/slices/activitiesSlice.js`): State management for activity data
- **Enhanced RecentActivity Component** (`dashboard/src/components/dashboard/RecentActivity.js`): Rich UI with icons, severity colors, and timestamps
- **API Integration**: Complete API service functions for fetching activities
- **Real-time Updates**: Socket.IO integration for live activity updates

#### API Endpoints:
- `GET /api/activities/recent?limit=20` - Get recent activities
- `GET /api/activities/type/:type?limit=20` - Get activities by type
- `GET /api/activities/monitor/:id?limit=20` - Get activities for specific monitor
- `GET /api/activities/stats` - Get activity statistics
- `POST /api/activities` - Create new activity (protected)

#### Features:
- **Rich UI Display**: Activity icons, severity color coding, human-readable timestamps
- **Real-time Updates**: Live activity feed via Socket.IO
- **Activity Metadata**: Structured data storage for detailed context
- **Sample Data**: Auto-generated sample activities on system startup
- **Error Handling**: Graceful fallbacks and loading states

#### Testing the Feature:
1. Dashboard shows Recent Activity section with live data
2. Activities display with proper icons and timestamps
3. Sample activities created on system startup
4. New activities logged when monitors connect/disconnect
5. Real-time updates appear automatically

## System Metrics Dashboard Implementation

### ✅ COMPLETED - Interactive System Metrics Charts

#### Backend Metrics API:
- **Historical Data Endpoint**: `GET /api/metrics/monitor/:id/history?period=1h&metric=all`
- **Latest Metrics**: `GET /api/metrics/monitor/:id/latest`
- **Health Overview**: `GET /api/metrics/health/overview`
- **Chart-Ready Data**: Pre-formatted data structure with labels and datasets

#### Frontend Implementation:
- **MetricsChart Component** (`dashboard/src/components/dashboard/MetricsChart.js`): Full-featured chart component using MUI X-Charts
- **Tabbed Interface**: System Performance vs Network Performance tabs
- **Period Selector**: 1h, 6h, 24h, 7d time range options
- **Real-time Data**: Fetches from active monitor automatically

#### Chart Features:
- **System Performance Tab**:
  - CPU usage percentage (blue line)
  - Memory usage percentage (red line)  
  - Temperature in Celsius (orange line)
- **Network Performance Tab**:
  - Latency in milliseconds (green line)
  - Packet Loss percentage (red line)

#### Technical Implementation:
- **MUI X-Charts LineChart**: Professional charting with smooth animations
- **Redux Integration**: Connected to monitors store for active monitor detection
- **Error Handling**: Loading states, error messages, and no-data scenarios
- **Responsive Design**: Adapts to container size with proper margins and grid

#### Data Sources:
- **CPU**: System CPU usage percentage from monitor
- **Memory**: RAM usage percentage 
- **Temperature**: CPU temperature in Celsius
- **Latency**: Network ping latency to 8.8.8.8
- **Packet Loss**: Network packet loss percentage

#### UI Features:
- **Time Labels**: Formatted timestamps (HH:MM format)
- **Color Coding**: Consistent colors across chart series
- **Data Info**: Shows data point count and time range
- **Period Selection**: Dropdown to change time window
- **Loading States**: Spinner during data fetching
- **Error Handling**: Alert messages for failures

#### API Data Format:
```javascript
{
  "success": true,
  "period": "1h",
  "count": 58,
  "chartData": {
    "labels": ["2025-06-08T11:09:40.838Z", ...],
    "datasets": {
      "cpu": [0, 0.5, 0.2, ...],
      "memory": [14.6, 14.7, 14.6, ...],
      "temperature": [39.4, 38.9, 39.9, ...],
      "latency": [9.954, 10.071, 9.659, ...],
      "packetLoss": [0, 0, 0, ...]
    }
  }
}
```

#### Testing the Feature:
1. Navigate to Dashboard main page
2. Scroll down to see System Metrics section
3. View real-time charts with historical data
4. Switch between System Performance and Network Performance tabs
5. Change time period using dropdown selector
6. Monitor shows "Living" monitor data with 60+ data points

#### Important Notes:
- **MUI X-Charts Required**: Component uses `@mui/x-charts` LineChart component
- **Chart.js Compatibility**: Chart.js implementation had rendering issues, stick with MUI X-Charts
- **Active Monitor Detection**: Automatically finds and displays data from active monitor
- **Real-time Updates**: Charts refresh when monitor data changes

### Dashboard Sections Status:
✅ **Monitor Status Cards** - Live monitor data with positioning and health  
✅ **System Health** - CPU, RAM, temperature with color-coded status  
✅ **Active Alerts** - Real-time alert management (currently no alerts)  
✅ **Network Overview** - Network statistics and signal strength ranges  
✅ **Recent Activity** - Live activity feed with icons and timestamps  
✅ **System Metrics** - Interactive charts with historical performance data  

## Enhanced Metrics Page Implementation

### ✅ COMPLETED - MUI X-Charts Integration for Metrics Page

#### Replaced Chart.js with MUI X-Charts:
- **Removed Chart.js Dependencies**: Eliminated Chart.js imports and complex Chart.js configuration
- **MUI X-Charts Integration**: Implemented `LineChart` from `@mui/x-charts/LineChart` for consistency with Dashboard
- **Professional Charting**: Same high-quality charts as Dashboard System Metrics section

#### Enhanced User Interface:
- **Tabbed Chart Interface**: System Performance vs Network Performance tabs
- **Simplified Controls**: Monitor selection dropdown + Period toggle buttons (1H, 6H, 24H, 7D)
- **Consistent Styling**: Matches Dashboard System Metrics colors and formatting
- **Loading States**: CircularProgress for initial load, LinearProgress for data fetching
- **Error Handling**: Alert messages for failed API calls

#### Chart Configuration:
- **System Performance Tab**:
  - CPU Usage (%) - Blue line (#1976d2)
  - Memory Usage (%) - Red line (#dc004e)
  - Temperature (°C) - Orange line (#ed6c02)

- **Network Performance Tab**:
  - Latency (ms) - Green line (#2e7d32)
  - Packet Loss (%) - Red line (#d32f2f)

#### Technical Implementation:
- **Direct API Integration**: Bypasses Redux store for faster data fetching via `api.get()`
- **Real-time Updates**: Automatic refresh when monitor or period selection changes
- **Data Processing**: Time formatting (HH:MM), chart configuration, and series data mapping
- **Summary Cards**: Dynamic current values using `getCurrentMetricValue()` function

#### API Endpoint Usage:
- **Metrics History**: `GET /api/metrics/monitor/:id/history?period=${period}&metric=all`
- **Chart-Ready Data**: Pre-formatted response with labels and datasets
- **Time Range Support**: 1h, 6h, 24h, 7d periods with data point counts

#### Features:
- **Interactive Charts**: Zoom, hover tooltips, grid lines, professional styling
- **Data Information**: Shows data point count and time range below charts
- **Responsive Design**: Adapts to container size with proper margins
- **Monitor Selection**: Dropdown to switch between available monitors
- **Current Values**: Summary cards display latest metric values with proper formatting

#### Testing the Enhanced Metrics Page:
1. Navigate to: `http://47.128.13.65:3000/metrics`
2. Select monitor from dropdown
3. Switch between System Performance and Network Performance tabs
4. Change time periods using toggle buttons
5. View real-time charts with professional MUI X-Charts styling
6. Check summary cards for current metric values

#### Code Location:
- **Main Component**: `dashboard/src/pages/Metrics.js`
- **Chart Implementation**: MUI X-Charts LineChart with custom configuration
- **API Integration**: Direct API calls bypassing Redux for performance

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.