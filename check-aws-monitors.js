#!/usr/bin/env node

/**
 * Simple test script to check monitors on AWS server
 * Run with: node check-aws-monitors.js <AWS_SERVER_URL>
 */
const https = require('https');
const http = require('http');

// Default to localhost if no server provided (for reference)
const SERVER_URL = process.argv[2] || 'http://localhost:5003';
const API_ENDPOINT = `${SERVER_URL}/api/monitors`;

console.log('🔍 Checking monitors on AWS server...');
console.log(`📡 Server URL: ${SERVER_URL}`);
console.log(`🎯 API Endpoint: ${API_ENDPOINT}`);
console.log('');

// Make HTTP request to check monitors
const urlObj = new URL(API_ENDPOINT);
const isHttps = urlObj.protocol === 'https:';
const requestModule = isHttps ? https : http;

const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (isHttps ? 443 : 80),
  path: urlObj.pathname,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Monitor-Checker/1.0'
  },
  timeout: 10000
};

const req = requestModule.request(options, (res) => {
  console.log(`📊 Response Status: ${res.statusCode}`);
  console.log(`📋 Response Headers:`, res.headers);
  console.log('');

  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        
        console.log('✅ Server responded successfully!');
        console.log(`📈 Total monitors found: ${response.count || 0}`);
        console.log('');
        
        if (response.monitors && response.monitors.length > 0) {
          console.log('🖥️  Monitor Details:');
          console.log('');
          
          response.monitors.forEach((monitor, index) => {
            console.log(`Monitor ${index + 1}: ${monitor.monitorId}`);
            console.log(`  Name: ${monitor.name}`);
            console.log(`  Location: ${monitor.location}`);
            console.log(`  Status: ${monitor.status}`);
            console.log(`  Last Heartbeat: ${monitor.lastHeartbeat || 'Never'}`);
            console.log(`  Last Scan: ${monitor.lastScan || 'Never'}`);
            console.log(`  Uptime: ${monitor.uptime || 0} seconds`);
            console.log(`  Online: ${monitor.isOnline ? 'Yes' : 'No'}`);
            
            // System Info detailed breakdown
            console.log(`  System Info:`);
            if (monitor.systemInfo && Object.keys(monitor.systemInfo).length > 0) {
              console.log(`    Platform: ${monitor.systemInfo.platform || 'Unknown'}`);
              console.log(`    Platform Release: ${monitor.systemInfo.platformRelease || 'Unknown'}`);
              console.log(`    Platform Version: ${monitor.systemInfo.platformVersion || 'Unknown'}`);
              console.log(`    Architecture: ${monitor.systemInfo.architecture || 'Unknown'}`);
              console.log(`    Hostname: ${monitor.systemInfo.hostname || 'Unknown'}`);
              console.log(`    Processor: ${monitor.systemInfo.processor || 'Unknown'}`);
              console.log(`    RAM Total: ${monitor.systemInfo.ramTotal ? (monitor.systemInfo.ramTotal / 1024 / 1024 / 1024).toFixed(2) + ' GB' : 'Unknown'}`);
              console.log(`    Python Version: ${monitor.systemInfo.pythonVersion || 'Unknown'}`);
            } else {
              console.log(`    ❌ No system info available (systemInfo field is empty or missing)`);
            }
            
            // Position and location info
            console.log(`  Position: x=${monitor.position?.x || 0}, y=${monitor.position?.y || 0}`);
            console.log(`  Location ID: ${monitor.locationId || 'None'}`);
            console.log(`  Floor ID: ${monitor.floorId || 'None'}`);
            
            // Capabilities
            console.log(`  Capabilities:`);
            console.log(`    Network Scan: ${monitor.capabilities?.networkScan ? 'Yes' : 'No'}`);
            console.log(`    Device Detection: ${monitor.capabilities?.deviceDetection ? 'Yes' : 'No'}`);
            console.log(`    Bandwidth Test: ${monitor.capabilities?.bandwidthTest ? 'Yes' : 'No'}`);
            console.log(`    Monitor Mode: ${monitor.capabilities?.monitorMode ? 'Yes' : 'No'}`);
            
            console.log(`  Created: ${monitor.createdAt || 'Unknown'}`);
            console.log(`  Updated: ${monitor.updatedAt || 'Unknown'}`);
            console.log('');
          });
          
          // Summary statistics
          const activeCount = response.monitors.filter(m => m.status === 'active').length;
          const onlineCount = response.monitors.filter(m => m.isOnline).length;
          const withSystemInfo = response.monitors.filter(m => m.systemInfo && Object.keys(m.systemInfo).length > 0).length;
          
          console.log('📈 Summary:');
          console.log(`  Total monitors: ${response.monitors.length}`);
          console.log(`  Active monitors: ${activeCount}`);
          console.log(`  Online monitors: ${onlineCount}`);
          console.log(`  Monitors with system info: ${withSystemInfo}`);
          console.log(`  Monitors missing system info: ${response.monitors.length - withSystemInfo}`);
          
          // Check for monitors missing system info
          const missingSystemInfo = response.monitors.filter(m => !m.systemInfo || Object.keys(m.systemInfo).length === 0);
          if (missingSystemInfo.length > 0) {
            console.log('');
            console.log('⚠️  Monitors missing system info:');
            missingSystemInfo.forEach(m => {
              console.log(`  • ${m.monitorId} (${m.name}) - Status: ${m.status}`);
            });
          }
          
        } else {
          console.log('❌ No monitors found in database');
        }
        
      } else {
        console.log(`❌ Server returned error status: ${res.statusCode}`);
        console.log(`📄 Response body: ${data}`);
      }
      
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log(`📄 Raw response: ${data}`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  
  if (error.code === 'ECONNREFUSED') {
    console.log('');
    console.log('💡 Possible issues:');
    console.log('  • Server is not running');
    console.log('  • Wrong server URL or port');
    console.log('  • Firewall blocking connection');
    console.log('  • Network connectivity issues');
  } else if (error.code === 'ENOTFOUND') {
    console.log('');
    console.log('💡 Possible issues:');
    console.log('  • Domain name not found');
    console.log('  • DNS resolution failed');
    console.log('  • Incorrect server URL');
  } else if (error.code === 'ETIMEDOUT') {
    console.log('');
    console.log('💡 Possible issues:');
    console.log('  • Server is slow to respond');
    console.log('  • Network timeout');
    console.log('  • Server overloaded');
  }
});

req.on('timeout', () => {
  console.error('❌ Request timed out after 10 seconds');
  req.destroy();
});

req.end();

console.log('⏳ Waiting for response...');