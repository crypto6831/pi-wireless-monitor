#!/usr/bin/env node

const mongoose = require('mongoose');
const Monitor = require('../src/models/Monitor');
const config = require('../config/config');

async function fixMonitorAuth() {
  try {
    console.log('🔧 Fixing monitor authentication...');
    
    // Connect to database
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('📡 Connected to database');

    // Get the global API key
    const globalApiKey = process.env.API_KEY;
    if (!globalApiKey) {
      console.error('❌ No global API_KEY found in environment');
      process.exit(1);
    }

    console.log(`🔑 Global API Key: ${globalApiKey.substring(0, 10)}...`);

    // Find all monitors
    const monitors = await Monitor.find({}).select('+apiKey');
    console.log(`📊 Found ${monitors.length} monitors`);

    for (const monitor of monitors) {
      console.log(`\n🖥️  Monitor: ${monitor.monitorId} (${monitor.name})`);
      console.log(`   Location: ${monitor.location}`);
      console.log(`   Current API Key: ${monitor.apiKey ? monitor.apiKey.substring(0, 10) + '...' : 'NONE'}`);
      
      if (monitor.apiKey !== globalApiKey) {
        monitor.apiKey = globalApiKey;
        await monitor.save();
        console.log(`   ✅ Updated to use global API key`);
      } else {
        console.log(`   ✓ Already using global API key`);
      }
    }

    console.log('\n🎉 Authentication fix completed!');
    
    // Show summary
    console.log('\n📋 Monitor Summary:');
    const activeMonitors = await Monitor.find({ status: 'active' });
    for (const monitor of activeMonitors) {
      console.log(`   • ${monitor.monitorId}: ${monitor.name} (${monitor.location})`);
    }

  } catch (error) {
    console.error('❌ Error fixing monitor authentication:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  fixMonitorAuth();
}

module.exports = { fixMonitorAuth }; 