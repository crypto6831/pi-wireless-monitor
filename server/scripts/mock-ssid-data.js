#!/usr/bin/env node

/**
 * Mock SSID Connection Data Generator
 * Simulates Raspberry Pi sending SSID connection data including DNS latency
 * Use this for testing when no physical Pi hardware is available
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const MONITOR_ID = 'PI-living'; // Living monitor ID
const AUTH_TOKEN = process.env.API_KEY || 'pi-monitor-api-key-2024'; // Default API key

// Mock WiFi networks to simulate
const MOCK_NETWORKS = [
  { ssid: 'SmartHome', bssid: '6C:5A:B0:7B:09:2F', channel: 48, frequency: 5240 },
  { ssid: 'HomeNetwork_5G', bssid: 'A8:40:25:12:34:56', channel: 36, frequency: 5180 },
  { ssid: 'Office_WiFi', bssid: '00:1A:2B:3C:4D:5E', channel: 11, frequency: 2462 }
];

class MockSSIDDataGenerator {
  constructor() {
    this.currentNetwork = MOCK_NETWORKS[0]; // Default to SmartHome
    this.lastSignalStrength = -65;
    this.connectionState = 'connected';
    this.uptime = 0;
    
    // Set up authentication headers
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': AUTH_TOKEN,
      'X-Monitor-ID': MONITOR_ID
    };
  }

  /**
   * Generate realistic mock connection data
   */
  generateConnectionData() {
    // Simulate signal strength fluctuation (-50 to -80 dBm)
    const baseSignal = -65;
    const variation = (Math.random() - 0.5) * 20; // ±10 dBm variation
    this.lastSignalStrength = Math.max(-80, Math.min(-50, baseSignal + variation));
    
    // Simulate occasional disconnections (5% chance)
    if (Math.random() < 0.05 && this.connectionState === 'connected') {
      this.connectionState = 'disconnected';
    } else if (this.connectionState === 'disconnected') {
      this.connectionState = 'connected';
    }
    
    // Increment uptime (30 second intervals)
    this.uptime += 30;
    
    // Generate realistic network metrics
    const networkLatency = 5 + Math.random() * 10; // 5-15ms local network
    const internetLatency = 15 + Math.random() * 20; // 15-35ms internet
    const dnsLatency = 8 + Math.random() * 12; // 8-20ms DNS query time
    const packetLoss = Math.random() < 0.1 ? Math.random() * 2 : 0; // Occasional packet loss
    
    // Performance metrics
    const downloadThroughput = 80 + Math.random() * 40; // 80-120 Mbps
    const uploadThroughput = 20 + Math.random() * 20; // 20-40 Mbps
    const jitter = Math.random() * 5; // 0-5ms jitter
    const quality = Math.max(0, Math.min(100, 85 - Math.abs(this.lastSignalStrength + 60) * 2));
    
    // Calculate stability score based on signal strength and metrics
    const stabilityScore = Math.max(0, Math.min(100, 
      90 - Math.abs(this.lastSignalStrength + 60) - packetLoss * 10 - jitter * 2
    ));

    return {
      monitorId: MONITOR_ID,
      ssid: this.currentNetwork.ssid,
      bssid: this.currentNetwork.bssid,
      connectionStatus: this.connectionState,
      signalStrength: Math.round(this.lastSignalStrength),
      channel: this.currentNetwork.channel,
      frequency: this.currentNetwork.frequency,
      rxRate: Math.round(downloadThroughput * 8), // Convert to Mbps
      txRate: Math.round(uploadThroughput * 8),
      linkSpeed: Math.round(downloadThroughput * 8),
      quality: Math.round(quality),
      networkLatency: Math.round(networkLatency * 100) / 100,
      internetLatency: Math.round(internetLatency * 100) / 100,
      packetLoss: Math.round(packetLoss * 100) / 100,
      uptime: this.uptime,
      timestamp: new Date().toISOString(),
      // Phase 3: Performance metrics with DNS latency
      downloadThroughput: Math.round(downloadThroughput * 100) / 100,
      uploadThroughput: Math.round(uploadThroughput * 100) / 100,
      jitter: Math.round(jitter * 100) / 100,
      dnsLatency: Math.round(dnsLatency * 100) / 100, // KEY: DNS latency data
      retransmissions: Math.floor(Math.random() * 3),
      connectionErrors: Math.floor(Math.random() * 2),
      stabilityScore: Math.round(stabilityScore)
    };
  }

  /**
   * Send mock connection data to server
   */
  async sendConnectionData() {
    try {
      const connectionData = this.generateConnectionData();
      
      console.log(`📡 Sending mock SSID data: ${connectionData.ssid} | ` +
                 `Signal: ${connectionData.signalStrength}dBm | ` +
                 `DNS: ${connectionData.dnsLatency}ms | ` +
                 `Status: ${connectionData.connectionStatus}`);
      
      const response = await axios.post(
        `${SERVER_URL}/api/ssid-analyzer/connection`,
        connectionData,
        { headers: this.headers, timeout: 10000 }
      );
      
      if (response.data.success) {
        console.log(`✅ Data sent successfully - ID: ${response.data.data.id}`);
        return true;
      } else {
        console.error('❌ Server returned error:', response.data.error);
        return false;
      }
      
    } catch (error) {
      if (error.response) {
        console.error(`❌ HTTP ${error.response.status}: ${error.response.statusText}`);
        console.error('Response:', error.response.data);
      } else if (error.request) {
        console.error('❌ No response from server');
      } else {
        console.error('❌ Request error:', error.message);
      }
      return false;
    }
  }

  /**
   * Start continuous mock data generation
   */
  async start(intervalSeconds = 30) {
    console.log(`🚀 Starting mock SSID data generator...`);
    console.log(`📊 Server: ${SERVER_URL}`);
    console.log(`🔧 Monitor ID: ${MONITOR_ID}`);
    console.log(`⏱️  Interval: ${intervalSeconds} seconds`);
    console.log(`📡 Network: ${this.currentNetwork.ssid} (${this.currentNetwork.bssid})`);
    console.log('');
    
    // Send initial data
    await this.sendConnectionData();
    
    // Set up interval
    const interval = setInterval(async () => {
      await this.sendConnectionData();
    }, intervalSeconds * 1000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping mock data generator...');
      clearInterval(interval);
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Stopping mock data generator...');
      clearInterval(interval);
      process.exit(0);
    });
  }

  /**
   * Send a single batch of test data
   */
  async sendTestBatch(count = 10) {
    console.log(`🧪 Sending ${count} test records...`);
    
    for (let i = 0; i < count; i++) {
      await this.sendConnectionData();
      
      // Wait 1 second between records to avoid overwhelming server
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Test batch complete - sent ${count} records`);
  }
}

// Command line usage
if (require.main === module) {
  const generator = new MockSSIDDataGenerator();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'start';
  
  switch (command) {
    case 'start':
      const interval = parseInt(args[1]) || 30;
      generator.start(interval);
      break;
      
    case 'test':
      const count = parseInt(args[1]) || 10;
      generator.sendTestBatch(count);
      break;
      
    case 'once':
      generator.sendConnectionData();
      break;
      
    default:
      console.log('Usage:');
      console.log('  node mock-ssid-data.js start [interval_seconds]  # Start continuous generation');
      console.log('  node mock-ssid-data.js test [count]              # Send test batch');
      console.log('  node mock-ssid-data.js once                     # Send single record');
      break;
  }
}

module.exports = MockSSIDDataGenerator;