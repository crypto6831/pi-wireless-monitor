/**
 * Test script to simulate monitor registration with system info
 */
const https = require('https');
const http = require('http');

function makePostRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-API-Key': 'PM2025-8f3a9d4e7b2c1a6f5e8d7c4b9a3e6f2d8c5b1a4e7f9c2d6a3b8e5f7c4d9a2b6e1f8c3d7a4b9e',
        'X-Monitor-ID': 'PI-living'
      }
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (err) {
          resolve({ status: res.statusCode, data: data });
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
    
    req.write(postData);
    req.end();
  });
}

async function testRegistration() {
  try {
    console.log('Testing monitor registration with system info...');
    
    const registrationData = {
      monitor_id: 'PI-living',
      name: 'Living Room Monitor',
      location: 'Living Room',
      interface: 'wlan0',
      capabilities: {
        network_scan: true,
        device_detection: false,
        bandwidth_test: false,
        monitor_mode: false
      },
      system_info: {
        platform: 'Linux',
        platform_release: '6.1.21-v8+',
        platform_version: '#1642 SMP PREEMPT Mon Apr  3 17:24:16 BST 2023',
        architecture: 'aarch64',
        hostname: 'test-raspberrypi',
        processor: 'ARM Cortex-A72',
        ram_total: 4294967296,
        python_version: '3.11.2'
      }
    };
    
    const response = await makePostRequest('http://47.128.13.65:3001/api/monitors/register', registrationData);
    
    console.log(`\n=== REGISTRATION RESPONSE ===`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing registration:', error.message);
  }
}

testRegistration();