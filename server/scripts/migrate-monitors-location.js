const mongoose = require('mongoose');
const Monitor = require('../src/models/Monitor');
const config = require('../config/config');

// Migration script to update existing monitors with default location fields
async function migrateMonitors() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Find all monitors without position data
    const monitors = await Monitor.find({
      $or: [
        { position: { $exists: false } },
        { 'position.x': { $exists: false } },
        { 'position.y': { $exists: false } }
      ]
    });
    
    console.log(`Found ${monitors.length} monitors to migrate`);
    
    // Update each monitor with default position
    for (const monitor of monitors) {
      monitor.position = {
        x: 0,
        y: 0
      };
      
      // Set locationId and floorId to null initially
      // These will be updated when monitors are assigned to locations
      monitor.locationId = null;
      monitor.floorId = null;
      
      await monitor.save();
      console.log(`Updated monitor: ${monitor.name} (${monitor.monitorId})`);
    }
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run migration
migrateMonitors();