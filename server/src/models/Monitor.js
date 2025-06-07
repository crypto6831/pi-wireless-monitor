const mongoose = require('mongoose');

const monitorSchema = new mongoose.Schema({
  monitorId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  // Location tracking fields
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
  },
  floorId: {
    type: String,
  },
  position: {
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },
  },
  interface: {
    type: String,
    default: 'wlan0',
  },
  capabilities: {
    networkScan: {
      type: Boolean,
      default: true,
    },
    deviceDetection: {
      type: Boolean,
      default: false,
    },
    bandwidthTest: {
      type: Boolean,
      default: false,
    },
    monitorMode: {
      type: Boolean,
      default: false,
    },
  },
  systemInfo: {
    platform: String,
    platformRelease: String,
    platformVersion: String,
    architecture: String,
    hostname: String,
    processor: String,
    ramTotal: Number,
    pythonVersion: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'maintenance'],
    default: 'inactive',
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now,
  },
  lastScan: {
    type: Date,
  },
  uptime: {
    type: Number,
    default: 0,
  },
  apiKey: {
    type: String,
    required: true,
    select: false, // Don't include in queries by default
  },
  settings: {
    scanInterval: {
      type: Number,
      default: 60,
    },
    deepScanInterval: {
      type: Number,
      default: 300,
    },
    alertsEnabled: {
      type: Boolean,
      default: true,
    },
    thresholds: {
      signalStrength: {
        min: {
          type: Number,
          default: -80,
        },
        warning: {
          type: Number,
          default: -70,
        },
      },
      packetLoss: {
        warning: {
          type: Number,
          default: 5,
        },
        critical: {
          type: Number,
          default: 10,
        },
      },
      temperature: {
        warning: {
          type: Number,
          default: 70,
        },
        critical: {
          type: Number,
          default: 80,
        },
      },
    },
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  // WiFi connection information
  wifiConnection: {
    ssid: { type: String, default: null },
    bssid: { type: String, default: null },
    rssi: { type: Number, default: null },
    channel: { type: Number, default: null },
    frequency: { type: Number, default: null },
    rxRate: { type: Number, default: null },
    txRate: { type: Number, default: null },
    linkSpeed: { type: Number, default: null },
    quality: { type: Number, default: null },
    lastUpdated: { type: Date, default: null }
  },
}, {
  timestamps: true,
});

// Indexes
monitorSchema.index({ status: 1, lastHeartbeat: -1 });
monitorSchema.index({ location: 1 });
monitorSchema.index({ locationId: 1, floorId: 1 });

// Virtual for online status
monitorSchema.virtual('isOnline').get(function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastHeartbeat > fiveMinutesAgo && this.status === 'active';
});

// Methods
monitorSchema.methods.updateHeartbeat = function(uptime) {
  this.lastHeartbeat = new Date();
  this.status = 'active';
  if (uptime) {
    this.uptime = uptime;
  }
  return this.save();
};

monitorSchema.methods.updateLastScan = function() {
  this.lastScan = new Date();
  return this.save();
};

monitorSchema.methods.updatePosition = function(x, y, locationId, floorId) {
  this.position = { x, y };
  if (locationId !== undefined) {
    this.locationId = locationId;
  }
  if (floorId !== undefined) {
    this.floorId = floorId;
  }
  return this.save();
};

// Statics
monitorSchema.statics.findByMonitorId = function(monitorId) {
  return this.findOne({ monitorId });
};

monitorSchema.statics.findActive = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.find({
    status: 'active',
    lastHeartbeat: { $gte: fiveMinutesAgo },
  });
};

monitorSchema.statics.findInactive = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.find({
    $or: [
      { status: { $ne: 'active' } },
      { lastHeartbeat: { $lt: fiveMinutesAgo } },
    ],
  });
};

monitorSchema.statics.findByLocation = function(locationId, floorId) {
  const query = { locationId };
  if (floorId) query.floorId = floorId;
  return this.find(query).populate('locationId', 'address buildingName');
};

// Ensure virtuals are included in JSON
monitorSchema.set('toJSON', {
  virtuals: true,
});

const Monitor = mongoose.model('Monitor', monitorSchema);

module.exports = Monitor; 