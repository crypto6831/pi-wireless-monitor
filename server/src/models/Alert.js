const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  monitorId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'weak_signal',
      'packet_loss',
      'latency',
      'temperature',
      'cpu_usage',
      'memory_usage',
      'disk_usage',
      'monitor_offline',
      'network_lost',
      'channel_change',
      'new_network',
      'security_change',
      'bandwidth_low',
      'ssid_disconnection',
      'ssid_signal_drop',
      'ssid_reconnection',
      'ssid_timeout',
      'custom'
    ],
    index: true,
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  details: {
    value: mongoose.Schema.Types.Mixed,
    threshold: mongoose.Schema.Types.Mixed,
    network: String,
    device: String,
    previousValue: mongoose.Schema.Types.Mixed,
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'ignored'],
    default: 'active',
    index: true,
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  acknowledgedAt: Date,
  resolvedAt: Date,
  resolvedAutomatically: {
    type: Boolean,
    default: false,
  },
  notificationsSent: [{
    method: {
      type: String,
      enum: ['email', 'webhook', 'socket'],
    },
    sentAt: Date,
    recipient: String,
    success: Boolean,
    error: String,
  }],
  relatedAlerts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
alertSchema.index({ monitorId: 1, createdAt: -1 });
alertSchema.index({ type: 1, severity: 1, status: 1 });
alertSchema.index({ status: 1, createdAt: -1 });

// TTL index - alerts expire after 180 days
alertSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 180 * 24 * 60 * 60 }
);

// Methods
alertSchema.methods.acknowledge = function(userId) {
  this.status = 'acknowledged';
  this.acknowledgedBy = userId;
  this.acknowledgedAt = new Date();
  return this.save();
};

alertSchema.methods.resolve = function(automatic = false) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedAutomatically = automatic;
  return this.save();
};

alertSchema.methods.ignore = function() {
  this.status = 'ignored';
  return this.save();
};

alertSchema.methods.addNotification = function(method, recipient, success, error = null) {
  this.notificationsSent.push({
    method,
    sentAt: new Date(),
    recipient,
    success,
    error,
  });
  return this.save();
};

// Statics
alertSchema.statics.findActive = function(monitorId = null) {
  const query = this.find({ status: 'active' });
  if (monitorId) {
    query.where('monitorId').equals(monitorId);
  }
  return query.sort('-createdAt');
};

alertSchema.statics.findByMonitor = function(monitorId, options = {}) {
  const query = this.find({ monitorId });

  if (options.type) {
    query.where('type').equals(options.type);
  }

  if (options.severity) {
    query.where('severity').equals(options.severity);
  }

  if (options.status) {
    query.where('status').equals(options.status);
  }

  if (options.startDate) {
    query.where('createdAt').gte(options.startDate);
  }

  if (options.endDate) {
    query.where('createdAt').lte(options.endDate);
  }

  return query.sort('-createdAt');
};

alertSchema.statics.createFromMetric = async function(monitorId, metric, thresholds) {
  const alerts = metric.checkAlerts(thresholds);
  const createdAlerts = [];

  for (const alertData of alerts) {
    // Check if similar alert already exists
    const existingAlert = await this.findOne({
      monitorId,
      type: alertData.type,
      status: 'active',
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Within last 5 minutes
    });

    if (!existingAlert) {
      const alert = await this.create({
        monitorId,
        type: alertData.type,
        severity: alertData.severity,
        message: `${alertData.type.replace('_', ' ')} detected: ${alertData.value}`,
        details: {
          value: alertData.value,
          threshold: alertData.threshold,
        },
      });
      createdAlerts.push(alert);
    }
  }

  return createdAlerts;
};

alertSchema.statics.resolveAutomatically = async function(monitorId, type) {
  const alerts = await this.find({
    monitorId,
    type,
    status: 'active',
  });

  const resolved = [];
  for (const alert of alerts) {
    await alert.resolve(true);
    resolved.push(alert);
  }

  return resolved;
};

// Virtual for duration
alertSchema.virtual('duration').get(function() {
  if (this.resolvedAt) {
    return this.resolvedAt - this.createdAt;
  }
  return Date.now() - this.createdAt;
});

// Ensure virtuals are included in JSON
alertSchema.set('toJSON', {
  virtuals: true,
});

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert; 