const mongoose = require('mongoose');

const coverageAreaSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  floorId: {
    type: String,
    required: true
  },
  coverageType: {
    type: String,
    enum: ['circle', 'polygon', 'rectangle'],
    default: 'circle'
  },
  // For circle type
  center: {
    x: Number,
    y: Number
  },
  radius: Number,
  // For polygon type
  points: [{
    x: Number,
    y: Number
  }],
  // For rectangle type
  bounds: {
    x: Number,
    y: Number,
    width: Number,
    height: Number
  },
  signalStrength: {
    excellent: {
      type: Number,
      default: -50 // dBm threshold for excellent signal
    },
    good: {
      type: Number,
      default: -60 // dBm threshold for good signal
    },
    fair: {
      type: Number,
      default: -70 // dBm threshold for fair signal
    },
    poor: {
      type: Number,
      default: -80 // dBm threshold for poor signal
    }
  },
  style: {
    fillColor: {
      type: String,
      default: '#4CAF50'
    },
    fillOpacity: {
      type: Number,
      default: 0.3
    },
    strokeColor: {
      type: String,
      default: '#2196F3'
    },
    strokeWidth: {
      type: Number,
      default: 2
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
coverageAreaSchema.index({ monitorId: 1, locationId: 1 });
coverageAreaSchema.index({ locationId: 1, floorId: 1 });

// Update timestamps on save
coverageAreaSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to calculate if a point is within coverage
coverageAreaSchema.methods.containsPoint = function(x, y) {
  switch (this.coverageType) {
    case 'circle':
      const dx = x - this.center.x;
      const dy = y - this.center.y;
      return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    
    case 'rectangle':
      return x >= this.bounds.x && 
             x <= this.bounds.x + this.bounds.width &&
             y >= this.bounds.y && 
             y <= this.bounds.y + this.bounds.height;
    
    case 'polygon':
      // Point-in-polygon algorithm (ray casting)
      let inside = false;
      const points = this.points;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    
    default:
      return false;
  }
};

// Method to get signal quality at a point
coverageAreaSchema.methods.getSignalQuality = function(x, y, signalStrength) {
  if (!this.containsPoint(x, y)) return 'none';
  
  if (signalStrength >= this.signalStrength.excellent) return 'excellent';
  if (signalStrength >= this.signalStrength.good) return 'good';
  if (signalStrength >= this.signalStrength.fair) return 'fair';
  if (signalStrength >= this.signalStrength.poor) return 'poor';
  
  return 'weak';
};

// Static method to find all coverage areas for a floor
coverageAreaSchema.statics.findByFloor = function(locationId, floorId) {
  return this.find({ 
    locationId, 
    floorId, 
    isActive: true 
  }).populate('monitorId', 'name status');
};

module.exports = mongoose.model('CoverageArea', coverageAreaSchema);