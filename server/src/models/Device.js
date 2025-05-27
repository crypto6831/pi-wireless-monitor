const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  monitorId: {
    type: String,
    required: true,
    index: true,
  },
  macAddress: {
    type: String,
    required: true,
    index: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  hostname: {
    type: String,
    default: 'Unknown',
  },
  vendor: {
    type: String,
    default: 'Unknown',
  },
  deviceType: {
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
  isOnline: {
    type: Boolean,
    default: true,
    index: true,
  },
  // Historical data points for tracking changes
  history: [{
    timestamp: {
      type: Date,
      default: Date.now,
    },
    ipAddress: String,
    isOnline: Boolean,
  }],
  // Network interface information
  interfaceInfo: {
    interface: String,
    connectionType: String, // wifi, ethernet, etc.
    signalStrength: Number, // for wifi devices
    linkSpeed: Number,
  },
  // Device capabilities and services
  services: [{
    port: Number,
    protocol: String,
    service: String,
    version: String,
  }],
  // OS Detection
  osInfo: {
    os: String,
    version: String,
    architecture: String,
  },
  // Statistics
  stats: {
    totalUptime: {
      type: Number,
      default: 0,
    },
    avgResponseTime: {
      type: Number,
      default: 0,
    },
    connectivityPercentage: {
      type: Number,
      default: 100,
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
deviceSchema.index({ monitorId: 1, macAddress: 1 });
deviceSchema.index({ monitorId: 1, lastSeen: -1 });
deviceSchema.index({ isOnline: 1, lastSeen: -1 });

// Methods
deviceSchema.methods.updateFromScan = function(scanData) {
  // Update basic fields
  this.ipAddress = scanData.ipAddress || this.ipAddress;
  this.hostname = scanData.hostname || this.hostname;
  this.vendor = scanData.vendor || this.vendor;
  this.deviceType = scanData.deviceType || this.deviceType;
  this.lastSeen = new Date();
  this.seenCount += 1;
  this.isOnline = true;

  // Add to history (keep last 100 entries)
  this.history.push({
    timestamp: new Date(),
    ipAddress: this.ipAddress,
    isOnline: this.isOnline,
  });

  if (this.history.length > 100) {
    this.history = this.history.slice(-100);
  }

  // Update interface info if provided
  if (scanData.interfaceInfo) {
    this.interfaceInfo = { ...this.interfaceInfo, ...scanData.interfaceInfo };
  }

  // Update services if provided
  if (scanData.services) {
    this.services = scanData.services;
  }

  // Update OS info if provided
  if (scanData.osInfo) {
    this.osInfo = { ...this.osInfo, ...scanData.osInfo };
  }

  // Update statistics
  this.updateStats();

  return this.save();
};

deviceSchema.methods.updateStats = function() {
  if (this.history.length === 0) return;

  const onlineHistory = this.history.filter(h => h.isOnline);
  this.stats.connectivityPercentage = Math.round(
    (onlineHistory.length / this.history.length) * 100
  );
};

deviceSchema.methods.markOffline = function() {
  this.isOnline = false;
  this.history.push({
    timestamp: new Date(),
    ipAddress: this.ipAddress,
    isOnline: false,
  });

  if (this.history.length > 100) {
    this.history = this.history.slice(-100);
  }

  this.updateStats();
  return this.save();
};

// Statics
deviceSchema.statics.findByMonitor = function(monitorId, options = {}) {
  const query = this.find({ monitorId });
  
  if (options.online !== undefined) {
    query.where('isOnline').equals(options.online);
  }

  if (options.active) {
    const activeThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
    query.where('lastSeen').gte(activeThreshold);
  }

  if (options.deviceType) {
    query.where('deviceType').equals(options.deviceType);
  }

  if (options.vendor) {
    query.where('vendor').regex(new RegExp(options.vendor, 'i'));
  }

  return query.sort('-lastSeen');
};

deviceSchema.statics.findOrCreateFromScan = async function(scanData) {
  const device = await this.findOne({
    monitorId: scanData.monitor_id,
    macAddress: scanData.macAddress,
  });

  if (device) {
    return device.updateFromScan(scanData);
  }

  // Create new device
  return this.create({
    monitorId: scanData.monitor_id,
    macAddress: scanData.macAddress,
    ipAddress: scanData.ipAddress,
    hostname: scanData.hostname || 'Unknown',
    vendor: scanData.vendor || 'Unknown',
    deviceType: scanData.deviceType || 'Unknown',
    interfaceInfo: scanData.interfaceInfo || {},
    services: scanData.services || [],
    osInfo: scanData.osInfo || {},
    history: [{
      ipAddress: scanData.ipAddress,
      isOnline: true,
    }],
    stats: {
      connectivityPercentage: 100,
    },
  });
};

// Static method to mark devices as offline if not seen recently
deviceSchema.statics.markInactiveDevicesOffline = async function(monitorId, threshold = 5) {
  const cutoffTime = new Date(Date.now() - threshold * 60 * 1000);
  
  const inactiveDevices = await this.find({
    monitorId,
    lastSeen: { $lt: cutoffTime },
    isOnline: true,
  });

  for (const device of inactiveDevices) {
    await device.markOffline();
  }

  return inactiveDevices.length;
};

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device; 