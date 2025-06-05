const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    trim: true
  },
  buildingName: {
    type: String,
    required: true,
    trim: true
  },
  floors: [{
    floorNumber: {
      type: String,
      required: true
    },
    floorName: {
      type: String,
      trim: true
    },
    floorPlan: {
      fileName: String,
      filePath: String,
      fileSize: Number,
      mimeType: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      dimensions: {
        width: Number,
        height: Number
      }
    }
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// Create compound index for address and building name
locationSchema.index({ address: 1, buildingName: 1 }, { unique: true });

// Update timestamps on save
locationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for full location name
locationSchema.virtual('fullName').get(function() {
  return `${this.buildingName} - ${this.address}`;
});

// Method to find a specific floor
locationSchema.methods.getFloor = function(floorNumber) {
  return this.floors.find(floor => floor.floorNumber === floorNumber);
};

// Method to add or update a floor
locationSchema.methods.setFloor = function(floorData) {
  const existingFloorIndex = this.floors.findIndex(
    floor => floor.floorNumber === floorData.floorNumber
  );
  
  if (existingFloorIndex >= 0) {
    this.floors[existingFloorIndex] = { ...this.floors[existingFloorIndex], ...floorData };
  } else {
    this.floors.push(floorData);
  }
  
  return this;
};

// Static method to get location hierarchy
locationSchema.statics.getHierarchy = async function() {
  const locations = await this.find({}, 'address buildingName floors.floorNumber floors.floorName');
  
  // Group by address
  const hierarchy = {};
  locations.forEach(location => {
    if (!hierarchy[location.address]) {
      hierarchy[location.address] = {};
    }
    hierarchy[location.address][location.buildingName] = location.floors.map(floor => ({
      floorNumber: floor.floorNumber,
      floorName: floor.floorName || floor.floorNumber,
      locationId: location._id,
      floorId: floor._id
    }));
  });
  
  return hierarchy;
};

module.exports = mongoose.model('Location', locationSchema);