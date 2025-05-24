# Pi Wireless Monitor - Dashboard

A modern, real-time web dashboard for monitoring WiFi networks using distributed Raspberry Pi devices.

## Features

- **Real-time Monitoring**: Live updates via WebSocket connection
- **Multi-Monitor Support**: Manage multiple Raspberry Pi monitors
- **Network Analysis**: View detected WiFi networks with signal strength, encryption, and more
- **System Metrics**: Monitor CPU, memory, temperature, and network performance
- **Alert Management**: Real-time alerts with severity levels and acknowledgment
- **Dark Theme**: Modern dark UI optimized for monitoring
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 18** - UI framework
- **Redux Toolkit** - State management
- **Material-UI 5** - Component library
- **Socket.IO Client** - Real-time communication
- **React Router 6** - Routing
- **Chart.js / Recharts** - Data visualization
- **Axios** - HTTP client
- **date-fns** - Date formatting

## Prerequisites

- Node.js 14+
- npm or yarn
- Running backend server (port 3001 by default)

## Installation

1. **Navigate to dashboard directory**:
   ```bash
   cd dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional):
   ```bash
   # Create .env.local file
   REACT_APP_API_URL=http://localhost:3001/api
   REACT_APP_SOCKET_URL=http://localhost:3001
   ```

4. **Start development server**:
   ```bash
   npm start
   ```

   The dashboard will open at http://localhost:3000

## Project Structure

```
dashboard/
├── public/
│   └── index.html
├── src/
│   ├── components/        # Reusable components
│   │   ├── common/       # Shared components
│   │   ├── dashboard/    # Dashboard widgets
│   │   └── layout/       # Layout components
│   ├── pages/            # Route pages
│   ├── services/         # API and Socket services
│   ├── store/            # Redux store
│   │   └── slices/       # Redux slices
│   ├── App.js           # Main app component
│   ├── index.js         # Entry point
│   └── index.css        # Global styles
└── package.json
```

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Core Components

### Layout Components
- **Sidebar** - Navigation menu
- **TopBar** - Status indicators and controls
- **NotificationPanel** - Toast notifications

### Dashboard Widgets
- **MonitorStatusCard** - Individual monitor status
- **SystemHealth** - CPU, memory, temperature metrics
- **AlertSummary** - Active alerts overview
- **NetworkOverview** - Network statistics
- **MetricsChart** - Performance charts
- **RecentActivity** - Activity feed

### Pages
- **Dashboard** - Main overview page
- **Monitors** - Monitor management
- **Networks** - Network list and details
- **Metrics** - Detailed metrics and analytics
- **Alerts** - Alert management
- **Settings** - Application settings

## State Management

The app uses Redux Toolkit with the following slices:

- **monitors** - Monitor list and status
- **networks** - Network data and statistics
- **metrics** - Performance metrics
- **alerts** - Alert management
- **ui** - UI state (sidebar, notifications, etc.)

## Real-time Updates

Socket.IO events handled:

- `monitor:heartbeat` - Monitor status updates
- `networks:update` - Network scan results
- `metrics:update` - Performance metrics
- `alert:new` - New alerts
- `monitor:disconnected` - Monitor offline

## API Integration

All API calls go through the centralized API service:

```javascript
import api from './services/api';

// Example usage
const response = await api.get('/monitors');
```

## Styling

- Material-UI theming with dark mode
- Custom CSS in `index.css` and `App.css`
- Responsive grid layout
- Smooth animations and transitions

## Building for Production

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Serve static files**:
   The `build` folder contains optimized static files ready to be served.

3. **Environment variables**:
   Create `.env.production` with production API URLs.

## Deployment Options

### Using Nginx

```nginx
server {
    listen 80;
    server_name monitor.example.com;
    root /var/www/dashboard/build;
    
    location / {
        try_files $uri /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
    }
    
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Using Docker

```dockerfile
FROM node:14-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

## Development Tips

1. **Redux DevTools**: Install browser extension for debugging state
2. **React DevTools**: Inspect component tree and props
3. **Network Tab**: Monitor API calls and WebSocket frames
4. **Console**: Check for real-time event logs

## Future Enhancements

- [ ] Detailed network history charts
- [ ] Monitor configuration UI
- [ ] Alert notification settings
- [ ] Data export functionality
- [ ] User authentication
- [ ] Multi-tenant support
- [ ] Mobile app version
- [ ] Advanced filtering and search
- [ ] Custom alert rules
- [ ] Report generation

## Troubleshooting

### Cannot connect to server
- Check backend server is running on port 3001
- Verify CORS settings in backend
- Check browser console for errors

### No real-time updates
- Check WebSocket connection in Network tab
- Verify Socket.IO configuration
- Check for proxy/firewall issues

### Build errors
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify all dependencies are installed

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License - see LICENSE file in root directory
