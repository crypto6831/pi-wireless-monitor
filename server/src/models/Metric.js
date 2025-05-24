const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  monitorId: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  // System metrics
  system: {
    cpuPercent: {
      type: Number,
      default: 0,
    },
    memoryPercent: {
      type: Number,
      default: 0,
    },
    memoryAvailable: {
      type: Number,
      default: 0,
    },
    diskPercent: {
      type: Number,
      default: 0,
    },
    diskFree: {
      type: Number,
      default: 0,
    },
    temperature: {
      type: Number,
      default: 0,
    },
    uptime: {
      type: Number,
      default: 0,
    },
  },
  // Network metrics
  network: {
    ping: {
      host: String,
      packetsSent: Number,
      packetsReceived: Number,
      packetLoss: {
        type: Number,
        default: 0,
        index: true,
      },
      min: Number,
      max: Number,
      avg: Number,
      stddev: Number,
      rawTimes: [Number],
    },
    bandwidth: {
      download: {
        type: Number,
        default: 0,
      },
      upload: {
        type: Number,
        default: 0,
      },
      ping: {
        type: Number,
        default: 0,
      },
      server: {
        name: String,
        country: String,
        sponsor: String,
        host: String,
      },
      timestamp: Date,
    },
    interface: {
      interface: String,
      isUp: Boolean,
      speed: Number,
      bytesSent: Number,
      bytesRecv: Number,
      packetsSent: Number,
      packetsRecv: Number,
      errorsIn: Number,
      errorsOut: Number,
      dropsIn: Number,
      dropsOut: Number,
    },
  },
  // Aggregated hourly data (for long-term storage)
  aggregated: {
    type: Boolean,
    default: false,
  },
  aggregationPeriod: {
    type: String,
    enum: ['raw', 'hour', 'day', 'week', 'month'],
    default: 'raw',
  },
}, {
  timestamps: true,
});

// Indexes
metricSchema.index({ monitorId: 1, timestamp: -1 });
metricSchema.index({ 'network.ping.packetLoss': 1 });
metricSchema.index({ aggregated: 1, timestamp: -1 });

// TTL index for automatic data cleanup
// Raw metrics expire after 7 days
metricSchema.index(
  { timestamp: 1 },
  { 
    expireAfterSeconds: 7 * 24 * 60 * 60,
    partialFilterExpression: { aggregated: false }
  }
);

// Aggregated metrics expire after 90 days
metricSchema.index(
  { timestamp: 1 },
  { 
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { aggregated: true }
  }
);

// Methods
metricSchema.methods.checkAlerts = function(thresholds) {
  const alerts = [];

  // Check packet loss
  if (this.network.ping && this.network.ping.packetLoss > thresholds.packetLoss.critical) {
    alerts.push({
      type: 'packet_loss',
      severity: 'critical',
      value: this.network.ping.packetLoss,
      threshold: thresholds.packetLoss.critical,
    });
  } else if (this.network.ping && this.network.ping.packetLoss > thresholds.packetLoss.warning) {
    alerts.push({
      type: 'packet_loss',
      severity: 'warning',
      value: this.network.ping.packetLoss,
      threshold: thresholds.packetLoss.warning,
    });
  }

  // Check latency
  if (this.network.ping && this.network.ping.avg > thresholds.latency.critical) {
    alerts.push({
      type: 'latency',
      severity: 'critical',
      value: this.network.ping.avg,
      threshold: thresholds.latency.critical,
    });
  } else if (this.network.ping && this.network.ping.avg > thresholds.latency.warning) {
    alerts.push({
      type: 'latency',
      severity: 'warning',
      value: this.network.ping.avg,
      threshold: thresholds.latency.warning,
    });
  }

  // Check temperature
  if (this.system.temperature > thresholds.temperature.critical) {
    alerts.push({
      type: 'temperature',
      severity: 'critical',
      value: this.system.temperature,
      threshold: thresholds.temperature.critical,
    });
  } else if (this.system.temperature > thresholds.temperature.warning) {
    alerts.push({
      type: 'temperature',
      severity: 'warning',
      value: this.system.temperature,
      threshold: thresholds.temperature.warning,
    });
  }

  return alerts;
};

// Statics
metricSchema.statics.findByMonitor = function(monitorId, options = {}) {
  const query = this.find({ monitorId });

  if (options.startDate) {
    query.where('timestamp').gte(options.startDate);
  }

  if (options.endDate) {
    query.where('timestamp').lte(options.endDate);
  }

  if (options.aggregated !== undefined) {
    query.where('aggregated').equals(options.aggregated);
  }

  return query.sort('-timestamp');
};

metricSchema.statics.aggregate = async function(monitorId, period = 'hour') {
  const now = new Date();
  let startDate, groupBy;

  switch (period) {
    case 'hour':
      startDate = new Date(now - 60 * 60 * 1000);
      groupBy = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' },
      };
      break;
    case 'day':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      groupBy = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
      };
      break;
    default:
      throw new Error('Invalid aggregation period');
  }

  const pipeline = [
    {
      $match: {
        monitorId,
        timestamp: { $gte: startDate },
        aggregated: false,
      },
    },
    {
      $group: {
        _id: groupBy,
        timestamp: { $first: '$timestamp' },
        // System averages
        avgCpu: { $avg: '$system.cpuPercent' },
        avgMemory: { $avg: '$system.memoryPercent' },
        avgTemperature: { $avg: '$system.temperature' },
        // Network averages
        avgPacketLoss: { $avg: '$network.ping.packetLoss' },
        avgLatency: { $avg: '$network.ping.avg' },
        avgDownload: { $avg: '$network.bandwidth.download' },
        avgUpload: { $avg: '$network.bandwidth.upload' },
        // Counts
        count: { $sum: 1 },
      },
    },
  ];

  const results = await this.aggregate(pipeline);

  // Create aggregated metrics
  const aggregatedMetrics = results.map(result => ({
    monitorId,
    timestamp: result.timestamp,
    aggregated: true,
    aggregationPeriod: period,
    system: {
      cpuPercent: result.avgCpu,
      memoryPercent: result.avgMemory,
      temperature: result.avgTemperature,
    },
    network: {
      ping: {
        packetLoss: result.avgPacketLoss,
        avg: result.avgLatency,
      },
      bandwidth: {
        download: result.avgDownload,
        upload: result.avgUpload,
      },
    },
  }));

  if (aggregatedMetrics.length > 0) {
    await this.insertMany(aggregatedMetrics);
  }

  return aggregatedMetrics;
};

const Metric = mongoose.model('Metric', metricSchema);

module.exports = Metric; 