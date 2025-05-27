#!/usr/bin/env node

// Simple script to fix authentication for Pi-living monitor
// This connects directly to MongoDB and updates the API key

const { MongoClient } = require('mongodb');

async function fixAuth() {
  const client = new MongoClient('mongodb://admin:admin123@localhost:27017/pi-wireless-monitor?authSource=admin');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('pi-wireless-monitor');
    const monitors = db.collection('monitors');
    
    // Update the PI-living monitor to use the global API key
    const globalApiKey = 'PM2025-8f3a9d4e7b2c1a6f5e8d7c4b9a3e6f2d8c5b1a4e7f9c2d6a3b8e5f7c4d9a2b6e1f8c3d7a4b9e';
    
    const result = await monitors.updateOne(
      { monitorId: 'PI-living' },
      { $set: { apiKey: globalApiKey } }
    );
    
    console.log('Update result:', result);
    
    if (result.matchedCount > 0) {
      console.log('✅ Successfully updated PI-living monitor API key');
    } else {
      console.log('❌ Monitor PI-living not found');
      
      // List all monitors
      const allMonitors = await monitors.find({}).toArray();
      console.log('Available monitors:', allMonitors.map(m => ({ id: m.monitorId, name: m.name })));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixAuth(); 