require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Monitor = require('../src/models/Monitor');

// Sample WiFi connection data for different monitors
const wifiConnectionData = [
  {
    ssid: 'Office_WiFi_5G',
    bssid: 'A4:CF:12:98:76:54',
    rssi: -45,
    channel: 36,
    frequency: 5180,
    rxRate: 866,
    txRate: 720,
    linkSpeed: 866,
    quality: 85
  },
  {
    ssid: 'Guest_Network',
    bssid: 'B8:27:EB:12:34:56',
    rssi: -62,
    channel: 6,
    frequency: 2437,
    rxRate: 144,
    txRate: 130,
    linkSpeed: 144,
    quality: 70
  },
  {
    ssid: 'Building_Main',
    bssid: 'C0:4A:00:87:65:43',
    rssi: -71,
    channel: 11,
    frequency: 2462,
    rxRate: 72,
    txRate: 65,
    linkSpeed: 72,
    quality: 55
  }
];

async function populateWifiData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pi-monitor');
    console.log('Connected to MongoDB');

    // Get all monitors
    const monitors = await Monitor.find({});
    console.log(`Found ${monitors.length} monitors`);

    // Update each monitor with random WiFi data
    for (let i = 0; i < monitors.length; i++) {
      const monitor = monitors[i];
      const wifiData = wifiConnectionData[i % wifiConnectionData.length];
      
      // Add some variation to the signal strength
      const rssiVariation = Math.floor(Math.random() * 10) - 5;
      wifiData.rssi = Math.max(-80, Math.min(-30, wifiData.rssi + rssiVariation));
      
      // Update the monitor
      monitor.wifiConnection = {
        ...wifiData,
        lastUpdated: new Date()
      };
      
      await monitor.save();
      console.log(`Updated monitor ${monitor.name} with WiFi connection data:`, {
        ssid: wifiData.ssid,
        rssi: wifiData.rssi
      });
    }

    console.log('WiFi connection data populated successfully');
  } catch (error) {
    console.error('Error populating WiFi data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
populateWifiData();