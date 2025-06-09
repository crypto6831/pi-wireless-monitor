const mongoose = require('mongoose');

const coverageSettingsSchema = new mongoose.Schema({
  // Signal strength thresholds in dBm
  signalThresholds: {
    excellent: { type: Number, default: -50 },
    good: { type: Number, default: -60 },
    fair: { type: Number, default: -70 },
    poor: { type: Number, default: -80 },
  },
  
  // Heatmap visualization settings
  heatmapSettings: {
    intensity: { type: Number, default: 0.8, min: 0, max: 1 },
    radius: { type: Number, default: 25, min: 5, max: 100 },
    blur: { type: Number, default: 15, min: 0, max: 50 },
    gradient: {
      type: Object,
      default: {
        '0_0': '#313695',
        '0_1': '#4575b4',
        '0_3': '#74add1',
        '0_5': '#abd9e9',
        '0_7': '#fee090',
        '0_9': '#f46d43',
        '1_0': '#a50026'
      }
    }
  },
  
  // Default coverage area styling
  defaultCoverageStyle: {
    fillColor: { type: String, default: '#1976d2' },
    fillOpacity: { type: Number, default: 0.3, min: 0, max: 1 },
    strokeColor: { type: String, default: '#1976d2' },
    strokeWidth: { type: Number, default: 2, min: 1, max: 10 },
  },
  
  // Coverage calculation settings
  calculationSettings: {
    interpolationMethod: { 
      type: String, 
      enum: ['linear', 'inverse-distance', 'kriging'], 
      default: 'inverse-distance' 
    },
    samplingResolution: { type: Number, default: 1, min: 0.5, max: 5 }, // meters
    maxInterpolationDistance: { type: Number, default: 50, min: 10, max: 200 }, // meters
  },
  
  // Coverage area validation settings
  validationRules: {
    maxAreaSize: { type: Number, default: 10000 }, // square meters
    minMonitorDistance: { type: Number, default: 1 }, // meters
    allowOverlapping: { type: Boolean, default: true },
  },
  
  // Auto-update settings
  autoUpdateSettings: {
    enableAutoUpdate: { type: Boolean, default: true },
    updateInterval: { type: Number, default: 300 }, // seconds
    recalculateOnMonitorChange: { type: Boolean, default: true },
  },
  
  // Metadata
  lastModified: { type: Date, default: Date.now },
  modifiedBy: { type: String, default: 'system' },
  version: { type: Number, default: 1 },
}, {
  timestamps: true,
  collection: 'coverageSettings'
});

// Ensure only one settings document exists (singleton pattern)
coverageSettingsSchema.index({}, { unique: true });

// Pre-save middleware to update lastModified
coverageSettingsSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

// Static method to get or create settings
coverageSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this({});
    await settings.save();
  }
  return settings;
};

// Static method to update settings
coverageSettingsSchema.statics.updateSettings = async function(updates) {
  let settings = await this.getSettings();
  
  // Merge updates with existing settings
  Object.keys(updates).forEach(key => {
    if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
      settings[key] = { ...settings[key].toObject(), ...updates[key] };
    } else {
      settings[key] = updates[key];
    }
  });
  
  settings.version += 1;
  await settings.save();
  return settings;
};

// Method to validate signal thresholds
coverageSettingsSchema.methods.validateThresholds = function() {
  const { excellent, good, fair, poor } = this.signalThresholds;
  return excellent >= good && good >= fair && fair >= poor;
};

module.exports = mongoose.model('CoverageSettings', coverageSettingsSchema);