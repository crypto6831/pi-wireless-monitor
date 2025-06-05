#!/usr/bin/env node

const mongoose = require('mongoose');
const Monitor = require('../src/models/Monitor');
const config = require('../config/config');

async function fixMonitorSettings() {
  try {
    console.log('🔧 Fixing monitor settings...');
    
    // Connect to database
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('📡 Connected to database');

    // Default settings structure
    const defaultSettings = {
      scanInterval: 60,
      deepScanInterval: 300,
      alertsEnabled: true,
      thresholds: {
        signalStrength: {
          min: -80,
          warning: -70,
        },
        packetLoss: {
          warning: 5,
          critical: 10,
        },
        latency: {
          warning: 100,
          critical: 500,
        },
        temperature: {
          warning: 70,
          critical: 80,
        },
      },
    };

    // Find all monitors
    const monitors = await Monitor.find({});
    console.log(`📊 Found ${monitors.length} monitors`);

    let updatedCount = 0;

    for (const monitor of monitors) {
      console.log(`\n🖥️  Monitor: ${monitor.monitorId} (${monitor.name})`);
      
      let needsUpdate = false;
      
      // Check if settings exist
      if (!monitor.settings) {
        monitor.settings = defaultSettings;
        needsUpdate = true;
        console.log('   ✓ Added default settings');
      } else {
        // Check if thresholds exist
        if (!monitor.settings.thresholds) {
          monitor.settings.thresholds = defaultSettings.thresholds;
          needsUpdate = true;
          console.log('   ✓ Added default thresholds');
        } else {
          // Check individual threshold properties
          if (!monitor.settings.thresholds.signalStrength) {
            monitor.settings.thresholds.signalStrength = defaultSettings.thresholds.signalStrength;
            needsUpdate = true;
            console.log('   ✓ Added signal strength thresholds');
          }
          if (!monitor.settings.thresholds.packetLoss) {
            monitor.settings.thresholds.packetLoss = defaultSettings.thresholds.packetLoss;
            needsUpdate = true;
            console.log('   ✓ Added packet loss thresholds');
          }
          if (!monitor.settings.thresholds.latency) {
            monitor.settings.thresholds.latency = defaultSettings.thresholds.latency;
            needsUpdate = true;
            console.log('   ✓ Added latency thresholds');
          }
          if (!monitor.settings.thresholds.temperature) {
            monitor.settings.thresholds.temperature = defaultSettings.thresholds.temperature;
            needsUpdate = true;
            console.log('   ✓ Added temperature thresholds');
          }
        }
        
        // Check if alertsEnabled exists
        if (monitor.settings.alertsEnabled === undefined) {
          monitor.settings.alertsEnabled = true;
          needsUpdate = true;
          console.log('   ✓ Added alertsEnabled setting');
        }
      }

      if (needsUpdate) {
        await monitor.save();
        updatedCount++;
        console.log('   ✅ Settings updated');
      } else {
        console.log('   ✓ Settings already complete');
      }
    }

    console.log(`\n🎉 Fixed settings for ${updatedCount} monitors!`);
    
    // Show summary
    console.log('\n📋 Monitor Summary:');
    const activeMonitors = await Monitor.find({ status: 'active' });
    for (const monitor of activeMonitors) {
      console.log(`   • ${monitor.monitorId}: ${monitor.name} (${monitor.location})`);
      console.log(`     Alerts enabled: ${monitor.settings.alertsEnabled}`);
      console.log(`     Signal threshold: ${monitor.settings.thresholds.signalStrength.min} dBm`);
    }

  } catch (error) {
    console.error('❌ Error fixing monitor settings:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  fixMonitorSettings();
}

module.exports = { fixMonitorSettings }; 