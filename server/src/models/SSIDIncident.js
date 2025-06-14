const mongoose = require('mongoose');

const ssidIncidentSchema = new mongoose.Schema({
  monitorId: {
    type: String,
    required: true,
    index: true
  },
  ssid: {
    type: String,
    required: true
  },
  incidentType: {
    type: String,
    enum: ['disconnection', 'reconnection', 'signal_drop', 'timeout'],
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // Duration in seconds
    default: null
  },
  resolved: {
    type: Boolean,
    default: false
  },
  triggerCondition: {
    signalStrength: Number,
    previousSignalStrength: Number,
    packetLoss: Number,
    latency: Number,
    threshold: String // What threshold was breached
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  impact: {
    dataLoss: Boolean,
    serviceInterruption: Boolean,
    userAffected: Boolean
  },
  metadata: {
    previousConnection: {
      bssid: String,
      channel: Number,
      frequency: Number,
      signalStrength: Number
    },
    currentConnection: {
      bssid: String,
      channel: Number,
      frequency: Number,
      signalStrength: Number
    },
    networkConditions: {
      interferenceLevel: Number,
      congestion: Number,
      weatherConditions: String
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
ssidIncidentSchema.index({ monitorId: 1, startTime: -1 });
ssidIncidentSchema.index({ ssid: 1, startTime: -1 });
ssidIncidentSchema.index({ incidentType: 1, startTime: -1 });
ssidIncidentSchema.index({ resolved: 1, startTime: -1 });

// Static methods for analysis
ssidIncidentSchema.statics.getIncidentsByMonitor = async function(monitorId, limit = 50) {
  return this.find({ monitorId })
    .sort({ startTime: -1 })
    .limit(limit)
    .lean();
};

ssidIncidentSchema.statics.getActiveIncidents = async function(monitorId = null) {
  const query = { resolved: false };
  if (monitorId) query.monitorId = monitorId;
  
  return this.find(query)
    .sort({ startTime: -1 })
    .lean();
};

ssidIncidentSchema.statics.getIncidentStats = async function(monitorId, timeRange = '24h') {
  const now = new Date();
  let startTime;
  
  switch (timeRange) {
    case '1h': startTime = new Date(now - 60 * 60 * 1000); break;
    case '6h': startTime = new Date(now - 6 * 60 * 60 * 1000); break;
    case '24h': startTime = new Date(now - 24 * 60 * 60 * 1000); break;
    case '7d': startTime = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
    default: startTime = new Date(now - 24 * 60 * 60 * 1000);
  }

  const pipeline = [
    {
      $match: {
        monitorId,
        startTime: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: '$incidentType',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgDuration: { $avg: '$duration' },
        maxDuration: { $max: '$duration' }
      }
    }
  ];

  return this.aggregate(pipeline);
};

ssidIncidentSchema.statics.calculateStabilityScore = async function(monitorId, timeRange = '24h') {
  const now = new Date();
  let startTime;
  
  switch (timeRange) {
    case '1h': startTime = new Date(now - 60 * 60 * 1000); break;
    case '6h': startTime = new Date(now - 6 * 60 * 60 * 1000); break;
    case '24h': startTime = new Date(now - 24 * 60 * 60 * 1000); break;
    case '7d': startTime = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
    default: startTime = new Date(now - 24 * 60 * 60 * 1000);
  }

  const totalTime = now - startTime;
  const incidents = await this.find({
    monitorId,
    startTime: { $gte: startTime },
    resolved: true
  });

  let totalDowntime = 0;
  let disconnectionCount = 0;
  let signalDropCount = 0;

  incidents.forEach(incident => {
    if (incident.duration) {
      totalDowntime += incident.duration * 1000; // Convert to milliseconds
    }
    
    if (incident.incidentType === 'disconnection') {
      disconnectionCount++;
    } else if (incident.incidentType === 'signal_drop') {
      signalDropCount++;
    }
  });

  // Calculate uptime percentage
  const uptimePercentage = Math.max(0, 100 - (totalDowntime / totalTime) * 100);
  
  // Penalty for frequent disconnections
  const disconnectionPenalty = Math.min(20, disconnectionCount * 2);
  
  // Penalty for signal quality issues
  const signalPenalty = Math.min(10, signalDropCount * 1);
  
  // Final stability score
  const stabilityScore = Math.max(0, Math.min(100, 
    uptimePercentage - disconnectionPenalty - signalPenalty
  ));

  return {
    score: Math.round(stabilityScore),
    uptime: Math.round(uptimePercentage * 100) / 100,
    incidents: incidents.length,
    totalDowntime: Math.round(totalDowntime / 1000), // Return in seconds
    disconnections: disconnectionCount,
    signalDrops: signalDropCount
  };
};

// Instance methods
ssidIncidentSchema.methods.resolve = function() {
  this.resolved = true;
  this.endTime = new Date();
  this.duration = Math.round((this.endTime - this.startTime) / 1000);
  return this.save();
};

ssidIncidentSchema.methods.calculateSeverity = function() {
  if (!this.duration) return 'low';
  
  if (this.duration < 30) return 'low';
  if (this.duration < 300) return 'medium'; // 5 minutes
  if (this.duration < 1800) return 'high'; // 30 minutes
  return 'critical';
};

module.exports = mongoose.model('SSIDIncident', ssidIncidentSchema);