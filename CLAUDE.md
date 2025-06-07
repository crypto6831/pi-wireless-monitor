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

All endpoints require JWT authentication (except monitor registration).

### Real-time Updates
- Server uses Socket.IO for WebSocket connections
- Events: `monitor:update`, `network:update`, `metric:update`, `alert:new`
- Redis pub/sub pattern for scalability

### Database Schema
- **monitors**: Raspberry Pi devices with auth tokens, location positioning (x,y coordinates)
- **networks**: WiFi networks with signal strength
- **metrics**: Performance data (latency, packet loss)
- **devices**: Detected devices on networks
- **alerts**: System notifications
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