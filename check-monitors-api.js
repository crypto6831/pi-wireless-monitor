/**
 * Simple script to check registered monitors via API
 */
const https = require('https');
const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function checkMonitors() {
  try {
    console.log('Checking monitors via API...');
    
    // Try to get monitors from API
    const response = await makeRequest('http://47.128.13.65:3001/api/monitors');
    
    console.log(`\n=== API RESPONSE ===`);
    console.log(JSON.stringify(response, null, 2));
    
    if (response.monitors && response.monitors.length > 0) {
      console.log(`\n=== REGISTERED MONITORS (${response.monitors.length}) ===`);
      
      response.monitors.forEach((monitor, index) => {
        console.log(`\n--- Monitor ${index + 1} ---`);
        console.log(`ID: ${monitor.monitorId}`);
        console.log(`Name: ${monitor.name}`);
        console.log(`Location: ${monitor.location}`);
        console.log(`Status: ${monitor.status}`);
        console.log(`Last Heartbeat: ${monitor.lastHeartbeat}`);
        console.log(`System Info: ${JSON.stringify(monitor.systemInfo, null, 2)}`);
      });
    } else {
      console.log('No monitors found');
    }
    
  } catch (error) {
    console.error('Error checking monitors:', error.message);
  }
}

checkMonitors();