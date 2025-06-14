const mongoose = require('mongoose');

const ssidConnectionSchema = new mongoose.Schema({
  monitorId: {
    type: String,
    required: true,
    index: true
  },
  ssid: {
    type: String,
    required: true
  },
  bssid: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  connectionStatus: {
    type: String,
    enum: ['connected', 'disconnected', 'connecting', 'reconnecting'],
    required: true,
    default: 'connected'
  },
  signalStrength: {
    type: Number,
    required: true
  },
  linkSpeed: {
    type: Number,
    required: false
  },
  frequency: {
    type: Number,
    required: false
  },
  channel: {
    type: Number,
    required: false
  },
  quality: {
    type: Number,
    required: false,
    min: 0,
    max: 100
  },
  rxRate: {
    type: Number,
    required: false
  },
  txRate: {
    type: Number,
    required: false
  },
  uptime: {
    type: Number,
    required: false,
    default: 0
  },
  lastDisconnection: {
    type: Date,
    required: false
  },
  reconnectionTime: {
    type: Number,
    required: false
  },
  disconnectionReason: {
    type: String,
    required: false
  },
  networkLatency: {
    type: Number,
    required: false
  },
  internetLatency: {
    type: Number,
    required: false
  },
  packetLoss: {
    type: Number,
    required: false,
    min: 0,
    max: 100
  },
  // Performance metrics for Phase 3
  downloadThroughput: {
    type: Number,
    required: false,
    // Mbps
  },
  uploadThroughput: {
    type: Number,
    required: false,
    // Mbps
  },
  jitter: {
    type: Number,
    required: false,
    // milliseconds
  },
  dnsLatency: {
    type: Number,
    required: false,
    // milliseconds
  },
  retransmissions: {
    type: Number,
    required: false,
    default: 0
  },
  connectionErrors: {
    type: Number,
    required: false,
    default: 0
  },
  stabilityScore: {
    type: Number,
    required: false,
    min: 0,
    max: 100
    // Calculated based on signal strength, latency, packet loss, etc.
  }
}, {
  timestamps: true,
  collection: 'ssidConnections'
});

ssidConnectionSchema.index({ monitorId: 1, timestamp: -1 });
ssidConnectionSchema.index({ ssid: 1, timestamp: -1 });
ssidConnectionSchema.index({ connectionStatus: 1, timestamp: -1 });

ssidConnectionSchema.statics.getLatestByMonitor = function(monitorId) {
  return this.findOne({ monitorId })
    .sort({ timestamp: -1 })
    .exec();
};

ssidConnectionSchema.statics.getConnectionHistory = function(monitorId, timeRange = '24h') {
  const timeMap = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30
  };
  
  const hoursBack = timeMap[timeRange] || 24;
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  return this.find({ 
    monitorId,
    timestamp: { $gte: since }
  })
  .sort({ timestamp: -1 })
  .exec();
};

ssidConnectionSchema.statics.getStabilityMetrics = function(monitorId, timeRange = '24h') {
  const timeMap = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30
  };
  
  const hoursBack = timeMap[timeRange] || 24;
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        monitorId,
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: '$connectionStatus',
        count: { $sum: 1 },
        avgSignalStrength: { $avg: '$signalStrength' },
        minSignalStrength: { $min: '$signalStrength' },
        maxSignalStrength: { $max: '$signalStrength' },
        avgUptime: { $avg: '$uptime' },
        totalUptime: { $sum: '$uptime' }
      }
    }
  ]);
};

// Phase 3: Performance metrics aggregation
ssidConnectionSchema.statics.getPerformanceMetrics = function(monitorId, timeRange = '24h') {
  const timeMap = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30
  };
  
  const hoursBack = timeMap[timeRange] || 24;
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        monitorId,
        timestamp: { $gte: since },
        connectionStatus: 'connected'
      }
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgNetworkLatency: { $avg: '$networkLatency' },
        avgInternetLatency: { $avg: '$internetLatency' },
        avgPacketLoss: { $avg: '$packetLoss' },
        avgDownloadThroughput: { $avg: '$downloadThroughput' },
        avgUploadThroughput: { $avg: '$uploadThroughput' },
        avgJitter: { $avg: '$jitter' },
        avgDnsLatency: { $avg: '$dnsLatency' },
        avgStabilityScore: { $avg: '$stabilityScore' },
        maxNetworkLatency: { $max: '$networkLatency' },
        maxInternetLatency: { $max: '$internetLatency' },
        maxPacketLoss: { $max: '$packetLoss' },
        maxDownloadThroughput: { $max: '$downloadThroughput' },
        maxUploadThroughput: { $max: '$uploadThroughput' },
        minNetworkLatency: { $min: '$networkLatency' },
        minInternetLatency: { $min: '$internetLatency' },
        minPacketLoss: { $min: '$packetLoss' },
        minDownloadThroughput: { $min: '$downloadThroughput' },
        minUploadThroughput: { $min: '$uploadThroughput' },
        totalRetransmissions: { $sum: '$retransmissions' },
        totalConnectionErrors: { $sum: '$connectionErrors' }
      }
    }
  ]);
};

// Phase 3: Performance history for charts
ssidConnectionSchema.statics.getPerformanceHistory = function(monitorId, timeRange = '24h', metric = 'all') {
  const timeMap = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30
  };
  
  const hoursBack = timeMap[timeRange] || 24;
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  const projection = {
    timestamp: 1,
    connectionStatus: 1
  };
  
  if (metric === 'all' || metric === 'latency') {
    projection.networkLatency = 1;
    projection.internetLatency = 1;
    projection.dnsLatency = 1;
  }
  
  if (metric === 'all' || metric === 'throughput') {
    projection.downloadThroughput = 1;
    projection.uploadThroughput = 1;
  }
  
  if (metric === 'all' || metric === 'quality') {
    projection.packetLoss = 1;
    projection.jitter = 1;
    projection.stabilityScore = 1;
    projection.signalStrength = 1;
  }
  
  return this.find({ 
    monitorId,
    timestamp: { $gte: since },
    connectionStatus: 'connected'
  }, projection)
  .sort({ timestamp: 1 })
  .exec();
};

module.exports = mongoose.model('SSIDConnection', ssidConnectionSchema);