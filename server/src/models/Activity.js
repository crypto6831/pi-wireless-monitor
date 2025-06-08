const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'monitor_connected',
      'monitor_disconnected', 
      'network_discovered',
      'network_lost',
      'alert_triggered',
      'alert_resolved',
      'device_connected',
      'device_disconnected',
      'coverage_changed',
      'system_startup',
      'system_shutdown'
    ]
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor',
    default: null
  },
  networkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Network', 
    default: null
  },
  alertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying by timestamp
activitySchema.index({ timestamp: -1 });
activitySchema.index({ type: 1, timestamp: -1 });
activitySchema.index({ monitorId: 1, timestamp: -1 });

// Virtual for human-readable time
activitySchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
});

// Static method to create activity
activitySchema.statics.createActivity = async function(data) {
  try {
    const activity = new this(data);
    await activity.save();
    
    // Emit real-time update via Socket.IO if available
    if (global.io) {
      global.io.emit('activity:new', activity);
    }
    
    return activity;
  } catch (error) {
    console.error('Error creating activity:', error);
    throw error;
  }
};

// Static method to get recent activities
activitySchema.statics.getRecent = async function(limit = 20) {
  return this.find()
    .populate('monitorId', 'name')
    .populate('networkId', 'ssid')
    .populate('alertId', 'title')
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('Activity', activitySchema);