const mongoose = require('mongoose');

const networkSchema = new mongoose.Schema({
  monitorId: {
    type: String,
    required: true,
    index: true,
  },
  ssid: {
    type: String,
    required: true,
    index: true,
  },
  bssid: {
    type: String,
    required: true,
    index: true,
  },
  channel: {
    type: Number,
    required: true,
  },
  frequency: {
    type: Number,
    required: true,
  },
  signalStrength: {
    type: Number,
    required: true,
    index: true,
  },
  quality: {
    type: Number,
    default: 0,
  },
  qualityMax: {
    type: Number,
    default: 100,
  },
  qualityPercentage: {
    type: Number,
    default: 0,
  },
  encryption: {
    type: Boolean,
    default: false,
  },
  encryptionType: {
    type: String,
    default: 'Open',
  },
  band: {
    type: String,
    enum: ['2.4GHz', '5GHz'],
    default: '2.4GHz',
  },
  vendor: {
    type: String,
    default: 'Unknown',
  },
  firstSeen: {
    type: Date,
    default: Date.now,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    index: true,
  },
  seenCount: {
    type: Number,
    default: 1,
  },
  // Historical data points for tracking changes
  history: [{
    timestamp: {
      type: Date,
      default: Date.now,
    },
    signalStrength: Number,
    quality: Number,
    channel: Number,
  }],
  // Aggregated statistics
  stats: {
    avgSignalStrength: {
      type: Number,
      default: 0,
    },
    minSignalStrength: {
      type: Number,
      default: 0,
    },
    maxSignalStrength: {
      type: Number,
      default: 0,
    },
    avgQuality: {
      type: Number,
      default: 0,
    },
    channelChanges: {
      type: Number,
      default: 0,
    },
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Indexes for performance
networkSchema.index({ monitorId: 1, bssid: 1 });
networkSchema.index({ monitorId: 1, lastSeen: -1 });
networkSchema.index({ ssid: 1, signalStrength: -1 });

// Methods
networkSchema.methods.updateFromScan = function(scanData) {
  // Update basic fields
  this.signalStrength = scanData.signalStrength;
  this.quality = scanData.quality;
  this.qualityMax = scanData.qualityMax;
  this.qualityPercentage = scanData.qualityPercentage;
  this.lastSeen = new Date();
  this.seenCount += 1;

  // Check for channel change
  if (this.channel !== scanData.channel) {
    this.stats.channelChanges += 1;
    this.channel = scanData.channel;
    this.frequency = scanData.frequency;
  }

  // Add to history (keep last 100 entries)
  this.history.push({
    timestamp: new Date(),
    signalStrength: scanData.signalStrength,
    quality: scanData.quality,
    channel: scanData.channel,
  });

  if (this.history.length > 100) {
    this.history = this.history.slice(-100);
  }

  // Update statistics
  this.updateStats();

  return this.save();
};

networkSchema.methods.updateStats = function() {
  if (this.history.length === 0) return;

  const signals = this.history.map(h => h.signalStrength);
  const qualities = this.history.map(h => h.quality);

  this.stats.avgSignalStrength = Math.round(
    signals.reduce((a, b) => a + b, 0) / signals.length
  );
  this.stats.minSignalStrength = Math.min(...signals);
  this.stats.maxSignalStrength = Math.max(...signals);
  this.stats.avgQuality = Math.round(
    qualities.reduce((a, b) => a + b, 0) / qualities.length
  );
};

// Statics
networkSchema.statics.findByMonitor = function(monitorId, options = {}) {
  const query = this.find({ monitorId });
  
  if (options.active) {
    const activeThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
    query.where('lastSeen').gte(activeThreshold);
  }

  if (options.minSignal) {
    query.where('signalStrength').gte(options.minSignal);
  }

  if (options.ssid) {
    query.where('ssid').equals(options.ssid);
  }

  return query.sort('-lastSeen');
};

networkSchema.statics.findOrCreateFromScan = async function(scanData) {
  const network = await this.findOne({
    monitorId: scanData.monitor_id,
    bssid: scanData.bssid,
  });

  if (network) {
    return network.updateFromScan(scanData);
  }

  // Create new network
  return this.create({
    monitorId: scanData.monitor_id,
    ssid: scanData.ssid,
    bssid: scanData.bssid,
    channel: scanData.channel,
    frequency: scanData.frequency,
    signalStrength: scanData.signal_strength,
    quality: scanData.quality,
    qualityMax: scanData.quality_max,
    qualityPercentage: scanData.quality_percentage,
    encryption: scanData.encryption,
    encryptionType: scanData.encryption_type,
    band: scanData.band,
    history: [{
      signalStrength: scanData.signal_strength,
      quality: scanData.quality,
      channel: scanData.channel,
    }],
    stats: {
      avgSignalStrength: scanData.signal_strength,
      minSignalStrength: scanData.signal_strength,
      maxSignalStrength: scanData.signal_strength,
      avgQuality: scanData.quality,
    },
  });
};

const Network = mongoose.model('Network', networkSchema);

module.exports = Network; 