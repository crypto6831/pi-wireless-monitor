const mongoose = require('mongoose');
const ServiceMonitor = require('../src/models/ServiceMonitor');
const ServiceMetric = require('../src/models/ServiceMetric');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pi-monitor';

async function seedServiceMetrics() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the first service monitor
    const serviceMonitor = await ServiceMonitor.findOne();
    if (!serviceMonitor) {
      console.log('No service monitors found. Please create one first.');
      process.exit(0);
    }

    console.log(`Seeding metrics for service monitor: ${serviceMonitor.serviceName}`);

    // Generate metrics for the last 24 hours
    const metrics = [];
    const now = new Date();
    const hoursToGenerate = 24;
    
    for (let i = hoursToGenerate * 60; i >= 0; i -= 5) { // Every 5 minutes
      const timestamp = new Date(now - i * 60 * 1000);
      const isUp = Math.random() > 0.05; // 95% uptime
      
      metrics.push({
        serviceMonitorId: serviceMonitor._id,
        monitorId: serviceMonitor.monitorId,
        timestamp,
        status: isUp ? 'up' : 'down',
        latency: isUp ? Math.random() * 50 + 20 : null, // 20-70ms
        packetLoss: isUp ? Math.random() * 2 : 100, // 0-2% loss when up
        jitter: isUp ? Math.random() * 5 : null, // 0-5ms jitter
        errorMessage: isUp ? null : 'Connection timeout'
      });
    }

    // Insert metrics in batches
    const batchSize = 100;
    for (let i = 0; i < metrics.length; i += batchSize) {
      const batch = metrics.slice(i, i + batchSize);
      await ServiceMetric.insertMany(batch);
      console.log(`Inserted ${i + batch.length}/${metrics.length} metrics`);
    }

    console.log('Successfully seeded service metrics');
    
    // Calculate and show success rate
    const successRate = await ServiceMetric.calculateSuccessRate(serviceMonitor._id, '24h');
    console.log(`24h Success rate: ${successRate.toFixed(2)}%`);

  } catch (error) {
    console.error('Error seeding service metrics:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedServiceMetrics();