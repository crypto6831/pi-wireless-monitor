# Pi Wireless Monitor - Server Component

This is the backend server for the Pi Wireless Monitor system. It receives data from Raspberry Pi monitors, stores it in a database, and provides APIs for the dashboard.

## Features

- **RESTful API**: Complete API for data ingestion and retrieval
- **Real-time Updates**: WebSocket support via Socket.IO
- **Data Storage**: MongoDB for persistent storage, Redis for caching
- **Authentication**: API key-based auth for monitors
- **Rate Limiting**: Protect against abuse
- **Data Aggregation**: Automatic data aggregation for long-term storage
- **Alert System**: Threshold-based alerting with notifications
- **Scalable Architecture**: Ready for horizontal scaling

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Primary database
- **Redis** - Caching and pub/sub
- **Socket.IO** - Real-time communication
- **JWT** - Authentication tokens
- **Winston** - Logging

## Prerequisites

- Node.js 14+ 
- MongoDB 4.4+
- Redis 6+
- npm or yarn

## Installation

1. **Clone and navigate to server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration

4. **Start MongoDB and Redis**:
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   docker run -d -p 6379:6379 --name redis redis:latest
   
   # Or use your local installations
   ```

5. **Run the server**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Configuration

Key configuration options in `.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/pi-wireless-monitor

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGIN=http://localhost:3000
```

## API Documentation

### Monitor Endpoints

#### Register Monitor
```http
POST /api/monitors/register
Content-Type: application/json

{
  "monitor_id": "pi-001",
  "name": "Office Pi",
  "location": "Main Office",
  "capabilities": {
    "network_scan": true,
    "device_detection": true
  }
}
```

#### Send Heartbeat
```http
POST /api/monitors/heartbeat
X-API-Key: your-api-key
X-Monitor-ID: pi-001

{
  "status": "active",
  "uptime": 3600
}
```

### Network Data Endpoints

#### Submit Network Scan
```http
POST /api/networks
X-API-Key: your-api-key
X-Monitor-ID: pi-001

{
  "networks": [
    {
      "ssid": "Office-WiFi",
      "bssid": "AA:BB:CC:DD:EE:FF",
      "signal_strength": -45,
      "channel": 6,
      "encryption": true
    }
  ]
}
```

#### Get Networks
```http
GET /api/networks?monitorId=pi-001&active=true
```

### Metrics Endpoints

#### Submit Metrics
```http
POST /api/metrics
X-API-Key: your-api-key
X-Monitor-ID: pi-001

{
  "metrics": {
    "system": {
      "cpuPercent": 45.2,
      "memoryPercent": 62.1,
      "temperature": 52.3
    },
    "network": {
      "ping": {
        "avg": 23.5,
        "packetLoss": 0
      }
    }
  }
}
```

#### Get Metrics History
```http
GET /api/metrics/monitor/pi-001/history?period=24h&metric=all
```

### Alert Endpoints

#### Get Active Alerts
```http
GET /api/alerts/active?monitorId=pi-001
```

#### Acknowledge Alert
```http
PUT /api/alerts/:alertId/acknowledge
```

## WebSocket Events

### Client to Server

- `monitor:subscribe` - Subscribe to monitor updates
- `monitor:command` - Send command to monitor
- `ping` - Keepalive

### Server to Client

- `monitors:list` - List of active monitors
- `networks:update` - Real-time network updates
- `metrics:update` - Real-time metrics updates
- `alert:new` - New alert notification
- `monitor:heartbeat` - Monitor status update

## Database Schema

### Collections

- **monitors** - Registered Pi monitors
- **networks** - WiFi network data
- **metrics** - Performance metrics
- **alerts** - System alerts
- **devices** - Connected devices (future)

### Data Retention

- Raw metrics: 7 days
- Aggregated metrics: 90 days
- Network data: 30 days
- Alerts: 180 days

## Development

### Project Structure

```
server/
├── src/
│   ├── index.js          # Entry point
│   ├── routes/           # API routes
│   ├── models/           # Database models
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic
│   ├── db/              # Database connections
│   └── utils/           # Utilities
├── config/              # Configuration
├── logs/                # Log files
└── package.json
```

### Running Tests

```bash
npm test
npm run test:watch
```

### Linting

```bash
npm run lint
```

## Deployment

### Using Docker

```bash
docker build -t pi-monitor-server .
docker run -p 3001:3001 --env-file .env pi-monitor-server
```

### Using PM2

```bash
npm install -g pm2
pm2 start src/index.js --name pi-monitor-server
pm2 save
pm2 startup
```

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb://user:pass@host:port/database
REDIS_HOST=redis.example.com
JWT_SECRET=strong-secret-key
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

### Logs

Logs are stored in the `logs/` directory:
- `app-YYYY-MM-DD.log` - Application logs
- `error-YYYY-MM-DD.log` - Error logs

### Metrics

Monitor these key metrics:
- API response times
- Database query performance
- WebSocket connections
- Memory usage
- CPU usage

## Troubleshooting

### MongoDB Connection Issues

1. Check MongoDB is running:
   ```bash
   mongosh --eval "db.adminCommand('ping')"
   ```

2. Verify connection string in `.env`

### Redis Connection Issues

1. Check Redis is running:
   ```bash
   redis-cli ping
   ```

2. Verify Redis configuration

### High Memory Usage

1. Check for memory leaks in Socket.IO connections
2. Verify data aggregation is running
3. Check Redis memory usage

## Security Considerations

- Always use HTTPS in production
- Rotate API keys regularly
- Enable rate limiting
- Use strong JWT secrets
- Keep dependencies updated
- Monitor for suspicious activity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file in root directory 