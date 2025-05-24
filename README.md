# Pi Wireless Monitor

A comprehensive wireless network monitoring solution using Raspberry Pi devices to collect network data and display it on a web dashboard.

## 🚀 Project Overview

Pi Wireless Monitor is a distributed network monitoring system that uses Raspberry Pi devices as wireless network sensors to collect real-time data about WiFi networks, signal strength, connected devices, and network performance metrics. The collected data is sent to a central server and displayed on a modern web dashboard.

### Key Features

- **Real-time Monitoring**: Live updates of wireless network status and performance
- **Multi-Pi Support**: Monitor multiple locations with different Raspberry Pi devices
- **Network Discovery**: Automatic detection of available WiFi networks
- **Signal Strength Tracking**: Monitor RSSI values and signal quality over time
- **Device Detection**: Track connected devices on monitored networks
- **Performance Metrics**: Measure latency, packet loss, and throughput
- **Historical Data**: Store and analyze network performance trends
- **Alerts & Notifications**: Set up alerts for network issues or anomalies
- **Modern Dashboard**: Responsive web interface with real-time charts and graphs

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Raspberry Pi   │────▶│    Server    │────▶│   Dashboard     │
│   (Monitor)     │     │   (Backend)  │     │   (Frontend)    │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │                      │
        │                       │                      │
    WiFi Scan              API & Database          Web Interface
    Network Stats          Data Processing         Real-time Updates
    Device Detection       WebSocket Server       Charts & Graphs
```

## 📁 Project Structure

```
pi-wireless-monitor/
├── dashboard/          # React-based web dashboard
│   ├── public/         # Static assets
│   ├── src/            # React components and logic
│   └── package.json    # Frontend dependencies
│
├── server/             # Node.js backend server
│   ├── src/            # Server source code
│   ├── config/         # Configuration files
│   ├── Dockerfile      # Server containerization
│   └── package.json    # Backend dependencies
│
├── raspberry-pi/       # Python monitoring scripts
│   ├── src/            # Python source code
│   ├── config/         # Pi configuration
│   ├── scripts/        # Utility scripts
│   └── requirements.txt # Python dependencies
│
├── docs/               # Documentation
├── docker-compose.yml  # Multi-container setup
└── README.md          # This file
```

## 🛠️ Technology Stack

### Frontend (Dashboard)
- **React** - UI framework
- **Material-UI** or **Ant Design** - Component library
- **Chart.js** or **Recharts** - Data visualization
- **Socket.io-client** - Real-time updates
- **Axios** - HTTP client

### Backend (Server)
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - WebSocket server
- **MongoDB** or **PostgreSQL** - Database
- **Redis** - Caching and pub/sub
- **JWT** - Authentication

### Raspberry Pi (Monitor)
- **Python 3** - Main programming language
- **iwlist/iwconfig** - WiFi scanning
- **scapy** - Network packet analysis
- **requests** - HTTP client for API
- **schedule** - Task scheduling

## 📋 Prerequisites

- **Raspberry Pi** (3B+ or newer recommended) with WiFi capability
- **Node.js** (v14 or newer)
- **Python** (3.7 or newer)
- **Docker** and **Docker Compose** (optional, for containerized deployment)
- **MongoDB** or **PostgreSQL** database

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/pi-wireless-monitor.git
cd pi-wireless-monitor
```

### 2. Set Up the Server

```bash
cd server
npm install
cp config/config.example.js config/config.js
# Edit config/config.js with your settings
npm run dev
```

### 3. Set Up the Dashboard

```bash
cd dashboard
npm install
cp .env.example .env
# Edit .env with your API endpoint
npm start
```

### 4. Set Up Raspberry Pi Monitor

```bash
cd raspberry-pi
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp config/config.example.py config/config.py
# Edit config/config.py with your server details
python src/main.py
```

### 5. Using Docker (Alternative)

```bash
docker-compose up -d
```

## 📡 Raspberry Pi Setup

### Enable Monitor Mode (Optional, for advanced features)

```bash
sudo apt-get update
sudo apt-get install aircrack-ng
sudo airmon-ng start wlan0
```

### Install System Dependencies

```bash
sudo apt-get install python3-pip python3-venv wireless-tools
```

### Configure Auto-start

```bash
sudo cp raspberry-pi/scripts/pi-monitor.service /etc/systemd/system/
sudo systemctl enable pi-monitor
sudo systemctl start pi-monitor
```

## 🔧 Configuration

### Server Configuration

Edit `server/config/config.js`:

```javascript
module.exports = {
  port: 3001,
  mongodb: {
    uri: 'mongodb://localhost:27017/pi-wireless-monitor'
  },
  jwt: {
    secret: 'your-secret-key',
    expiresIn: '7d'
  },
  redis: {
    host: 'localhost',
    port: 6379
  }
};
```

### Raspberry Pi Configuration

Edit `raspberry-pi/config/config.py`:

```python
SERVER_URL = "http://your-server-ip:3001"
API_KEY = "your-api-key"
SCAN_INTERVAL = 60  # seconds
MONITOR_INTERFACE = "wlan0"
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token

### Monitoring Data
- `GET /api/networks` - List all detected networks
- `GET /api/networks/:id` - Get specific network details
- `POST /api/networks/scan` - Trigger network scan
- `GET /api/devices` - List connected devices
- `GET /api/metrics` - Get performance metrics

### Raspberry Pi Management
- `GET /api/monitors` - List all Pi monitors
- `POST /api/monitors` - Register new Pi monitor
- `PUT /api/monitors/:id` - Update Pi monitor
- `DELETE /api/monitors/:id` - Remove Pi monitor

## 🎯 Features Roadmap

- [x] Basic project structure
- [ ] Raspberry Pi monitoring scripts
- [ ] Backend API server
- [ ] Frontend dashboard
- [ ] Real-time WebSocket updates
- [ ] Network scanning functionality
- [ ] Signal strength monitoring
- [ ] Device detection
- [ ] Historical data storage
- [ ] Data visualization charts
- [ ] Alert system
- [ ] Multi-Pi support
- [ ] Authentication & authorization
- [ ] Docker containerization
- [ ] Automated deployment scripts

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Raspberry Pi Foundation for the amazing hardware
- Open source community for the tools and libraries used
- Contributors and testers

## 📞 Support

For support, email support@example.com or open an issue in the GitHub repository.
