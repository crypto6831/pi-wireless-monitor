const express = require('express');
const Network = require('../models/Network');
const { authenticateMonitor } = require('../middleware/auth');

const router = express.Router();

// Get channel utilization data for WiFi analyzer
router.get('/utilization', async (req, res) => {
  try {
    const { monitorId, timeRange = '1h', band = 'all' } = req.query;
    
    // Calculate time threshold
    const timeThresholds = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
    
    const timeThreshold = new Date(Date.now() - (timeThresholds[timeRange] || timeThresholds['1h']));
    
    // Build query
    const query = {
      lastSeen: { $gte: timeThreshold }
    };
    
    if (monitorId) {
      query.monitorId = monitorId;
    }
    
    if (band !== 'all') {
      query.band = band;
    }
    
    // Get networks within time range
    const networks = await Network.find(query);
    
    // Process channel utilization
    const channelData = {};
    
    networks.forEach(network => {
      const channel = network.channel;
      const band = network.band;
      const signalStrength = network.signalStrength;
      
      if (!channelData[channel]) {
        channelData[channel] = {
          channel,
          band,
          frequency: network.frequency,
          networkCount: 0,
          maxSignal: -Infinity,
          minSignal: Infinity,
          avgSignal: 0,
          utilization: 0,
          networks: []
        };
      }
      
      channelData[channel].networkCount++;
      channelData[channel].maxSignal = Math.max(channelData[channel].maxSignal, signalStrength);
      channelData[channel].minSignal = Math.min(channelData[channel].minSignal, signalStrength);
      channelData[channel].networks.push({
        ssid: network.ssid,
        bssid: network.bssid,
        signalStrength: signalStrength,
        lastSeen: network.lastSeen
      });
    });
    
    // Calculate averages and utilization
    Object.values(channelData).forEach(channelInfo => {
      const signals = channelInfo.networks.map(n => n.signalStrength);
      channelInfo.avgSignal = Math.round(signals.reduce((a, b) => a + b, 0) / signals.length);
      
      // Calculate utilization based on signal strength and network count
      // Higher signal strength and more networks = higher utilization
      const signalFactor = Math.max(0, (channelInfo.maxSignal + 100) / 50); // Normalize -100 to -50 dBm to 0-1
      const countFactor = Math.min(1, channelInfo.networkCount / 5); // Cap at 5 networks for full utilization
      channelInfo.utilization = Math.round((signalFactor * 0.7 + countFactor * 0.3) * 100);
    });
    
    // Convert to array and sort by channel
    const channels = Object.values(channelData).sort((a, b) => a.channel - b.channel);
    
    res.json({
      success: true,
      timeRange,
      band,
      totalNetworks: networks.length,
      channels
    });
    
  } catch (error) {
    console.error('Error getting channel utilization:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get channel timeline data for waterfall chart
router.get('/timeline', async (req, res) => {
  try {
    const { monitorId, timeRange = '1h', channel } = req.query;
    
    // Calculate time threshold
    const timeThresholds = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
    
    const timeThreshold = new Date(Date.now() - (timeThresholds[timeRange] || timeThresholds['1h']));
    
    // Build query
    const query = {
      lastSeen: { $gte: timeThreshold }
    };
    
    if (monitorId) {
      query.monitorId = monitorId;
    }
    
    if (channel) {
      query.channel = parseInt(channel);
    }
    
    // Get networks with history
    const networks = await Network.find(query);
    
    // Process timeline data
    const timelineData = [];
    const timeSlots = {};
    
    networks.forEach(network => {
      // Process network history
      network.history.forEach(historyPoint => {
        if (historyPoint.timestamp >= timeThreshold) {
          const timeSlot = new Date(historyPoint.timestamp).toISOString();
          
          if (!timeSlots[timeSlot]) {
            timeSlots[timeSlot] = {};
          }
          
          if (!timeSlots[timeSlot][historyPoint.channel]) {
            timeSlots[timeSlot][historyPoint.channel] = {
              channel: historyPoint.channel,
              maxSignal: -Infinity,
              networkCount: 0,
              networks: []
            };
          }
          
          timeSlots[timeSlot][historyPoint.channel].maxSignal = Math.max(
            timeSlots[timeSlot][historyPoint.channel].maxSignal,
            historyPoint.signalStrength
          );
          timeSlots[timeSlot][historyPoint.channel].networkCount++;
          timeSlots[timeSlot][historyPoint.channel].networks.push({
            ssid: network.ssid,
            bssid: network.bssid,
            signalStrength: historyPoint.signalStrength
          });
        }
      });
    });
    
    // Convert to timeline array
    Object.keys(timeSlots).sort().forEach(timestamp => {
      const channelData = timeSlots[timestamp];
      Object.values(channelData).forEach(channelInfo => {
        timelineData.push({
          timestamp,
          channel: channelInfo.channel,
          signalStrength: channelInfo.maxSignal,
          networkCount: channelInfo.networkCount,
          networks: channelInfo.networks
        });
      });
    });
    
    res.json({
      success: true,
      timeRange,
      channel: channel || 'all',
      dataPoints: timelineData.length,
      timeline: timelineData
    });
    
  } catch (error) {
    console.error('Error getting channel timeline:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get channel interference analysis
router.get('/interference', async (req, res) => {
  try {
    const { monitorId, band = 'all' } = req.query;
    
    const query = {
      lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    };
    
    if (monitorId) {
      query.monitorId = monitorId;
    }
    
    if (band !== 'all') {
      query.band = band;
    }
    
    const networks = await Network.find(query);
    
    // Define overlapping channels
    const overlappingChannels = {
      '2.4GHz': {
        1: [1, 2, 3, 4, 5],
        2: [1, 2, 3, 4, 5, 6],
        3: [1, 2, 3, 4, 5, 6, 7],
        4: [1, 2, 3, 4, 5, 6, 7, 8],
        5: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        6: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        7: [3, 4, 5, 6, 7, 8, 9, 10, 11],
        8: [4, 5, 6, 7, 8, 9, 10, 11, 12],
        9: [5, 6, 7, 8, 9, 10, 11, 12, 13],
        10: [6, 7, 8, 9, 10, 11, 12, 13, 14],
        11: [7, 8, 9, 10, 11, 12, 13, 14],
        12: [8, 9, 10, 11, 12, 13, 14],
        13: [9, 10, 11, 12, 13, 14],
        14: [10, 11, 12, 13, 14]
      }
    };
    
    // Calculate interference
    const interference = {};
    
    networks.forEach(network => {
      const channel = network.channel;
      const band = network.band;
      
      if (!interference[channel]) {
        interference[channel] = {
          channel,
          band,
          frequency: network.frequency,
          directNetworks: 0,
          interferingNetworks: 0,
          interferenceLevel: 0,
          overlappingChannels: overlappingChannels[band] ? overlappingChannels[band][channel] || [channel] : [channel]
        };
      }
      
      interference[channel].directNetworks++;
    });
    
    // Calculate overlapping interference
    Object.values(interference).forEach(channelInfo => {
      let totalInterference = 0;
      
      channelInfo.overlappingChannels.forEach(overlappingChannel => {
        const overlappingNetworks = networks.filter(n => n.channel === overlappingChannel);
        overlappingNetworks.forEach(network => {
          if (network.channel !== channelInfo.channel) {
            // Weight interference by signal strength and channel distance
            const channelDistance = Math.abs(network.channel - channelInfo.channel);
            const interferenceWeight = Math.max(0, (network.signalStrength + 100) / 50); // -100 to -50 dBm = 0 to 1
            const distanceWeight = 1 / (channelDistance + 1);
            totalInterference += interferenceWeight * distanceWeight;
            channelInfo.interferingNetworks++;
          }
        });
      });
      
      channelInfo.interferenceLevel = Math.round(Math.min(100, totalInterference * 20));
    });
    
    res.json({
      success: true,
      band,
      totalChannels: Object.keys(interference).length,
      interference: Object.values(interference).sort((a, b) => a.channel - b.channel)
    });
    
  } catch (error) {
    console.error('Error calculating interference:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;