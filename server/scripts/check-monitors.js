#!/usr/bin/env node

const mongoose = require('mongoose');
const Monitor = require('../src/models/Monitor');
const config = require('../config/config');

async function checkMonitors() {
  try {
    console.log('🔍 Checking monitors in database...');
    
    // Connect to database
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('📡 Connected to database');

    // Find all monitors
    const monitors = await Monitor.find({}).select('+apiKey');
    console.log(`📊 Found ${monitors.length} monitors in database\n`);

    if (monitors.length === 0) {
      console.log('❌ No monitors found in database');
      return;
    }

    // Display detailed information for each monitor
    for (let i = 0; i < monitors.length; i++) {
      const monitor = monitors[i];
      console.log(`🖥️  Monitor ${i + 1}: ${monitor.monitorId}`);
      console.log(`   Name: ${monitor.name}`);
      console.log(`   Location: ${monitor.location}`);
      console.log(`   Status: ${monitor.status}`);
      console.log(`   Last Heartbeat: ${monitor.lastHeartbeat}`);
      console.log(`   Last Scan: ${monitor.lastScan || 'Never'}`);
      console.log(`   Uptime: ${monitor.uptime || 0} seconds`);
      console.log(`   Online Status: ${monitor.isOnline ? 'Online' : 'Offline'}`);
      console.log(`   API Key: ${monitor.apiKey ? monitor.apiKey.substring(0, 10) + '...' : 'NONE'}`);
      
      // System Info detailed breakdown
      console.log(`   System Info:`);
      if (monitor.systemInfo && Object.keys(monitor.systemInfo).length > 0) {
        console.log(`     Platform: ${monitor.systemInfo.platform || 'Unknown'}`);
        console.log(`     Platform Release: ${monitor.systemInfo.platformRelease || 'Unknown'}`);
        console.log(`     Platform Version: ${monitor.systemInfo.platformVersion || 'Unknown'}`);
        console.log(`     Architecture: ${monitor.systemInfo.architecture || 'Unknown'}`);
        console.log(`     Hostname: ${monitor.systemInfo.hostname || 'Unknown'}`);
        console.log(`     Processor: ${monitor.systemInfo.processor || 'Unknown'}`);
        console.log(`     RAM Total: ${monitor.systemInfo.ramTotal ? (monitor.systemInfo.ramTotal / 1024 / 1024 / 1024).toFixed(2) + ' GB' : 'Unknown'}`);
        console.log(`     Python Version: ${monitor.systemInfo.pythonVersion || 'Unknown'}`);
      } else {
        console.log(`     ❌ No system info available (systemInfo is empty or missing)`);
      }
      
      // Position info
      console.log(`   Position: x=${monitor.position?.x || 0}, y=${monitor.position?.y || 0}`);
      console.log(`   Location ID: ${monitor.locationId || 'None'}`);
      console.log(`   Floor ID: ${monitor.floorId || 'None'}`);
      
      // Capabilities
      console.log(`   Capabilities:`);
      console.log(`     Network Scan: ${monitor.capabilities?.networkScan ? 'Yes' : 'No'}`);
      console.log(`     Device Detection: ${monitor.capabilities?.deviceDetection ? 'Yes' : 'No'}`);
      console.log(`     Bandwidth Test: ${monitor.capabilities?.bandwidthTest ? 'Yes' : 'No'}`);
      console.log(`     Monitor Mode: ${monitor.capabilities?.monitorMode ? 'Yes' : 'No'}`);
      
      console.log(`   Created: ${monitor.createdAt}`);
      console.log(`   Updated: ${monitor.updatedAt}`);
      console.log(''); // Empty line for separation
    }

    // Summary statistics
    const activeCount = monitors.filter(m => m.status === 'active').length;
    const onlineCount = monitors.filter(m => m.isOnline).length;
    const withSystemInfo = monitors.filter(m => m.systemInfo && Object.keys(m.systemInfo).length > 0).length;
    
    console.log('📈 Summary:');
    console.log(`   Total monitors: ${monitors.length}`);
    console.log(`   Active monitors: ${activeCount}`);
    console.log(`   Online monitors: ${onlineCount}`);
    console.log(`   Monitors with system info: ${withSystemInfo}`);
    console.log(`   Monitors missing system info: ${monitors.length - withSystemInfo}`);

    // Check for monitors missing system info
    const missingSystemInfo = monitors.filter(m => !m.systemInfo || Object.keys(m.systemInfo).length === 0);
    if (missingSystemInfo.length > 0) {
      console.log('\n⚠️  Monitors missing system info:');
      missingSystemInfo.forEach(m => {
        console.log(`   • ${m.monitorId} (${m.name}) - Status: ${m.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking monitors:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  checkMonitors();
}

module.exports = { checkMonitors };