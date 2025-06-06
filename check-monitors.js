/**
 * Simple script to check registered monitors in the database
 */
const mongoose = require('./server/node_modules/mongoose');

// Monitor Schema (simplified version for this check)
const monitorSchema = new mongoose.Schema({
  monitorId: String,
  name: String,
  location: String,
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
  status: String,
  lastHeartbeat: Date,
}, { timestamps: true });

const Monitor = mongoose.model('Monitor', monitorSchema);

async function checkMonitors() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://admin:admin123@47.128.13.65:27017/pi-wireless-monitor?authSource=admin', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Fetch all monitors
    const monitors = await Monitor.find({}).select('monitorId name location systemInfo status lastHeartbeat');
    
    console.log(`\n=== REGISTERED MONITORS (${monitors.length}) ===`);
    
    if (monitors.length === 0) {
      console.log('No monitors found in database');
      return;
    }
    
    monitors.forEach((monitor, index) => {
      console.log(`\n--- Monitor ${index + 1} ---`);
      console.log(`ID: ${monitor.monitorId}`);
      console.log(`Name: ${monitor.name}`);
      console.log(`Location: ${monitor.location}`);
      console.log(`Status: ${monitor.status}`);
      console.log(`Last Heartbeat: ${monitor.lastHeartbeat}`);
      console.log(`System Info: ${JSON.stringify(monitor.systemInfo, null, 2)}`);
    });
    
  } catch (error) {
    console.error('Error checking monitors:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkMonitors();