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

module.exports = mongoose.model('SSIDConnection', ssidConnectionSchema);