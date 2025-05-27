const mongoose = require('mongoose');

async function quickFix() {
  const uri = 'mongodb://admin:admin123@mongodb:27017/pi-wireless-monitor?authSource=admin';
  await mongoose.connect(uri);
  
  const db = mongoose.connection.db;
  const monitors = db.collection('monitors');
  
  const globalApiKey = 'PM2025-8f3a9d4e7b2c1a6f5e8d7c4b9a3e6f2d8c5b1a4e7f9c2d6a3b8e5f7c4d9a2b6e1f8c3d7a4b9e';
  
  const result = await monitors.updateOne(
    { monitorId: 'PI-living' },
    { $set: { apiKey: globalApiKey } }
  );
  
  console.log('✅ API Key fix result:', result);
  
  const monitor = await monitors.findOne({ monitorId: 'PI-living' });
  console.log('Monitor API Key now:', monitor.apiKey.substring(0, 20) + '...');
  
  await mongoose.disconnect();
}

quickFix().catch(console.error); 