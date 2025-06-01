const mongoose = require('mongoose');

const serviceMonitorSchema = new mongoose.Schema({
  monitorId: {
    type: String,
    required: true,
    index: true,
  },
  serviceName: {
    type: String,
    required: true,
  },
  target: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Validate IP address or domain
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        // Updated domain regex to properly handle subdomains like www.google.com
        const domainRegex = /^([a-zA-Z0-9][a-zA-Z0-9-]*\.)*[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
        // Also allow simple hostnames without dots (for local network)
        const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/;
        return ipRegex.test(v) || domainRegex.test(v) || hostnameRegex.test(v);
      },
      message: 'Invalid IP address or domain name'
    }
  },
  type: {
    type: String,
    enum: ['ping', 'http', 'https', 'tcp', 'udp'],
    default: 'ping',
  },
  port: {
    type: Number,
    min: 1,
    max: 65535,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  interval: {
    type: Number,
    default: 60, // seconds
    min: 10,
    max: 3600,
  },
  timeout: {
    type: Number,
    default: 5, // seconds
    min: 1,
    max: 30,
  },
  packetCount: {
    type: Number,
    default: 4,
    min: 1,
    max: 20,
  },
  cusumConfig: {
    targetMean: {
      type: Number,
      default: 50, // ms for latency
    },
    allowableDeviation: {
      type: Number,
      default: 10, // ms
    },
    decisionInterval: {
      type: Number,
      default: 5, // h value for CUSUM
    },
    resetThreshold: {
      type: Number,
      default: 0, // Reset when CUSUM returns to 0
    },
  },
  thresholds: {
    latency: {
      warning: {
        type: Number,
        default: 100, // ms
      },
      critical: {
        type: Number,
        default: 200, // ms
      },
    },
    packetLoss: {
      warning: {
        type: Number,
        default: 5, // percentage
      },
      critical: {
        type: Number,
        default: 10, // percentage
      },
    },
    jitter: {
      warning: {
        type: Number,
        default: 20, // ms
      },
      critical: {
        type: Number,
        default: 50, // ms
      },
    },
  },
  cusumState: {
    upperSum: {
      type: Number,
      default: 0,
    },
    lowerSum: {
      type: Number,
      default: 0,
    },
    lastReset: {
      type: Date,
      default: Date.now,
    },
    anomalyDetected: {
      type: Boolean,
      default: false,
    },
    anomalyStartTime: Date,
  },
  lastCheck: {
    timestamp: Date,
    status: {
      type: String,
      enum: ['up', 'down', 'timeout', 'error'],
    },
    latency: Number,
    packetLoss: Number,
    jitter: Number,
    errorMessage: String,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Indexes
serviceMonitorSchema.index({ monitorId: 1, enabled: 1 });
serviceMonitorSchema.index({ target: 1, type: 1 });
serviceMonitorSchema.index({ 'lastCheck.timestamp': -1 });

// Virtual for display name
serviceMonitorSchema.virtual('displayName').get(function() {
  return this.serviceName || `${this.type}://${this.target}${this.port ? ':' + this.port : ''}`;
});

// Methods
serviceMonitorSchema.methods.updateCusumState = function(currentValue) {
  const { targetMean, allowableDeviation, decisionInterval } = this.cusumConfig;
  
  // Calculate CUSUM values
  const deviation = currentValue - targetMean;
  
  // Upper CUSUM (detects increase in mean)
  this.cusumState.upperSum = Math.max(0, this.cusumState.upperSum + deviation - allowableDeviation);
  
  // Lower CUSUM (detects decrease in mean)
  this.cusumState.lowerSum = Math.max(0, this.cusumState.lowerSum - deviation - allowableDeviation);
  
  // Check for anomaly
  const anomalyDetected = (this.cusumState.upperSum > decisionInterval) || 
                         (this.cusumState.lowerSum > decisionInterval);
  
  if (anomalyDetected && !this.cusumState.anomalyDetected) {
    this.cusumState.anomalyDetected = true;
    this.cusumState.anomalyStartTime = new Date();
  } else if (!anomalyDetected && this.cusumState.anomalyDetected) {
    this.cusumState.anomalyDetected = false;
    this.cusumState.anomalyStartTime = null;
  }
  
  // Reset if both sums return to zero
  if (this.cusumState.upperSum === 0 && this.cusumState.lowerSum === 0) {
    this.cusumState.lastReset = new Date();
  }
  
  return this.save();
};

serviceMonitorSchema.methods.updateLastCheck = function(checkResult) {
  this.lastCheck = {
    timestamp: new Date(),
    status: checkResult.status,
    latency: checkResult.latency,
    packetLoss: checkResult.packetLoss,
    jitter: checkResult.jitter,
    errorMessage: checkResult.errorMessage,
  };
  
  // Update CUSUM if we have a valid latency reading
  if (checkResult.status === 'up' && checkResult.latency !== undefined) {
    return this.updateCusumState(checkResult.latency);
  }
  
  return this.save();
};

// Statics
serviceMonitorSchema.statics.findActiveByMonitor = function(monitorId) {
  return this.find({ monitorId, enabled: true });
};

serviceMonitorSchema.statics.findAnomalous = function() {
  return this.find({ 
    enabled: true,
    'cusumState.anomalyDetected': true 
  });
};

// Ensure virtuals are included in JSON
serviceMonitorSchema.set('toJSON', {
  virtuals: true,
});

const ServiceMonitor = mongoose.model('ServiceMonitor', serviceMonitorSchema);

module.exports = ServiceMonitor;