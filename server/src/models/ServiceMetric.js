const mongoose = require('mongoose');

const serviceMetricSchema = new mongoose.Schema({
  serviceMonitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceMonitor',
    required: true,
    index: true
  },
  monitorId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['up', 'down', 'timeout', 'error'],
    required: true
  },
  latency: {
    type: Number, // milliseconds
    min: 0
  },
  packetLoss: {
    type: Number, // percentage
    min: 0,
    max: 100
  },
  jitter: {
    type: Number, // milliseconds
    min: 0
  },
  errorMessage: String
}, {
  timestamps: true
});

// Index for efficient queries
serviceMetricSchema.index({ serviceMonitorId: 1, timestamp: -1 });
serviceMetricSchema.index({ monitorId: 1, timestamp: -1 });

// Method to get metrics for a time period
serviceMetricSchema.statics.getMetricsForPeriod = async function(serviceMonitorId, period = '1h') {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '1h':
      startDate = new Date(now - 60 * 60 * 1000);
      break;
    case '6h':
      startDate = new Date(now - 6 * 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 60 * 60 * 1000); // Default to 1 hour
  }
  
  return this.find({
    serviceMonitorId,
    timestamp: { $gte: startDate, $lte: now }
  })
    .sort({ timestamp: 1 })
    .lean();
};

// Method to calculate success rate
serviceMetricSchema.statics.calculateSuccessRate = async function(serviceMonitorId, period = '1h') {
  const metrics = await this.getMetricsForPeriod(serviceMonitorId, period);
  if (metrics.length === 0) return 0;
  
  const successCount = metrics.filter(m => m.status === 'up').length;
  return (successCount / metrics.length) * 100;
};

// TTL index to automatically delete old data (30 days)
serviceMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('ServiceMetric', serviceMetricSchema);