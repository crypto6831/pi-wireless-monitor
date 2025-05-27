const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development',
  });
});

// Mock data for demonstration
const mockMonitors = [
  {
    id: 'pi-living-room',
    monitorId: 'pi-living-room',
    name: 'Living Room Pi',
    location: 'Living Room',
    status: 'online',
    lastSeen: new Date(),
    ipAddress: '192.168.1.100',
    interface: 'wlan0',
    version: '1.0.0',
    systemInfo: {
      cpu: 45,
      memory: 60,
      temperature: 52,
      uptime: 86400,
      disk: 75
    }
  },
  {
    id: 'pi-kitchen',
    monitorId: 'pi-kitchen', 
    name: 'Kitchen Pi',
    location: 'Kitchen',
    status: 'online',
    lastSeen: new Date(),
    ipAddress: '192.168.1.101',
    interface: 'wlan0',
    version: '1.0.0',
    systemInfo: {
      cpu: 32,
      memory: 45,
      temperature: 48,
      uptime: 172800,
      disk: 60
    }
  },
  {
    id: 'pi-bedroom',
    monitorId: 'pi-bedroom',
    name: 'Bedroom Pi', 
    location: 'Bedroom',
    status: 'offline',
    lastSeen: new Date(Date.now() - 300000), // 5 minutes ago
    ipAddress: '192.168.1.102',
    interface: 'wlan0',
    version: '1.0.0',
    systemInfo: {
      cpu: 0,
      memory: 0,
      temperature: 0,
      uptime: 0,
      disk: 0
    }
  }
];

const mockNetworks = [
  {
    id: 1,
    ssid: 'MyHomeWiFi',
    bssid: '00:11:22:33:44:55',
    signalStrength: -45,
    frequency: 2412,
    channel: 1,
    security: 'WPA2',
    monitorId: 'pi-living-room',
    connectedDevices: 8,
    lastSeen: new Date(),
    timestamp: new Date()
  },
  {
    id: 2,
    ssid: 'Neighbor_WiFi',
    bssid: '00:11:22:33:44:66',
    signalStrength: -65,
    frequency: 2437,
    channel: 6,
    security: 'WPA2',
    monitorId: 'pi-living-room',
    connectedDevices: 3,
    lastSeen: new Date(),
    timestamp: new Date()
  },
  {
    id: 3,
    ssid: 'MyHomeWiFi_5G',
    bssid: '00:11:22:33:44:77',
    signalStrength: -52,
    frequency: 5180,
    channel: 36,
    security: 'WPA3',
    monitorId: 'pi-kitchen',
    connectedDevices: 12,
    lastSeen: new Date(),
    timestamp: new Date()
  }
];

// API Routes

// Get all monitors
app.get('/api/monitors', (req, res) => {
  console.log('📡 API Call: GET /api/monitors');
  res.json({
    success: true,
    data: mockMonitors,
    total: mockMonitors.length
  });
});

// Get monitor by ID
app.get('/api/monitors/:id', (req, res) => {
  console.log(`📡 API Call: GET /api/monitors/${req.params.id}`);
  const monitor = mockMonitors.find(m => m.id === req.params.id || m.monitorId === req.params.id);
  if (!monitor) {
    return res.status(404).json({
      success: false,
      error: 'Monitor not found'
    });
  }
  res.json({
    success: true,
    data: monitor
  });
});

// Get networks
app.get('/api/networks', (req, res) => {
  console.log('📡 API Call: GET /api/networks');
  res.json({
    success: true,
    data: mockNetworks,
    total: mockNetworks.length
  });
});

// Get network statistics  
app.get('/api/networks/stats/summary', (req, res) => {
  console.log('📡 API Call: GET /api/networks/stats/summary');
  const onlineMonitors = mockMonitors.filter(m => m.status === 'online').length;
  const totalNetworks = mockNetworks.length;
  const averageSignal = mockNetworks.reduce((sum, n) => sum + n.signalStrength, 0) / totalNetworks;
  
  res.json({
    success: true,
    data: {
      totalMonitors: mockMonitors.length,
      onlineMonitors,
      offlineMonitors: mockMonitors.length - onlineMonitors,
      totalNetworks,
      averageSignalStrength: Math.round(averageSignal),
      totalConnectedDevices: mockNetworks.reduce((sum, n) => sum + n.connectedDevices, 0),
      timestamp: new Date()
    }
  });
});

// Get metrics
app.get('/api/metrics/health/overview', (req, res) => {
  console.log('📡 API Call: GET /api/metrics/health/overview');
  const onlineMonitors = mockMonitors.filter(m => m.status === 'online');
  const avgCpu = onlineMonitors.length > 0 ? onlineMonitors.reduce((sum, m) => sum + m.systemInfo.cpu, 0) / onlineMonitors.length : 0;
  const avgMemory = onlineMonitors.length > 0 ? onlineMonitors.reduce((sum, m) => sum + m.systemInfo.memory, 0) / onlineMonitors.length : 0;
  const avgTemp = onlineMonitors.length > 0 ? onlineMonitors.reduce((sum, m) => sum + m.systemInfo.temperature, 0) / onlineMonitors.length : 0;
  
  res.json({
    success: true,
    data: {
      systemHealth: {
        averageCpu: Math.round(avgCpu),
        averageMemory: Math.round(avgMemory),
        averageTemperature: Math.round(avgTemp),
        onlineMonitors: onlineMonitors.length,
        alerts: 1
      },
      networkHealth: {
        averageSignalStrength: Math.round(mockNetworks.reduce((sum, n) => sum + n.signalStrength, 0) / mockNetworks.length),
        totalNetworks: mockNetworks.length,
        connectedDevices: mockNetworks.reduce((sum, n) => sum + n.connectedDevices, 0)
      },
      timestamp: new Date()
    }
  });
});

// Get alerts
app.get('/api/alerts', (req, res) => {
  console.log('📡 API Call: GET /api/alerts');
  res.json({
    success: true,
    data: [
      {
        id: 1,
        type: 'monitor_offline',
        severity: 'medium',
        message: 'Bedroom Pi has been offline for 5 minutes',
        monitorId: 'pi-bedroom',
        timestamp: new Date(Date.now() - 300000),
        status: 'active'
      }
    ],
    total: 1
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log('\n🚀 Pi Wireless Monitor Demo API Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 API Server: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`📱 Dashboard: http://localhost:3000`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Mock Data Available:');
  console.log(`   📡 ${mockMonitors.length} Raspberry Pi monitors`);
  console.log(`   📶 ${mockNetworks.length} WiFi networks`);
  console.log(`   🔔 1 active alert`);
  console.log('\nNow open http://localhost:3000 to see your dashboard!\n');
}); 