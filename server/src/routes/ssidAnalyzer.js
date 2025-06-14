const express = require('express');
const router = express.Router();
const SSIDConnection = require('../models/SSIDConnection');
const Monitor = require('../models/Monitor');
const { authenticateMonitor } = require('../middleware/auth');

// Get current connection status for a monitor
router.get('/status/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    
    // Get latest connection data
    const latestConnection = await SSIDConnection.getLatestByMonitor(monitorId);
    
    if (!latestConnection) {
      return res.json({
        success: true,
        data: {
          monitorId,
          status: 'no_data',
          message: 'No connection data available'
        }
      });
    }

    // Calculate connection stability score
    const stabilityData = await SSIDConnection.getStabilityMetrics(monitorId, '24h');
    const connectedRecords = stabilityData.find(s => s._id === 'connected') || { count: 0 };
    const disconnectedRecords = stabilityData.find(s => s._id === 'disconnected') || { count: 0 };
    const totalRecords = connectedRecords.count + disconnectedRecords.count;
    const stabilityScore = totalRecords > 0 ? Math.round((connectedRecords.count / totalRecords) * 100) : 0;

    // Determine connection quality based on signal strength
    const getSignalQuality = (signal) => {
      if (signal >= -50) return 'excellent';
      if (signal >= -60) return 'good';
      if (signal >= -70) return 'fair';
      if (signal >= -80) return 'poor';
      return 'very_poor';
    };

    const response = {
      success: true,
      data: {
        monitorId,
        ssid: latestConnection.ssid,
        bssid: latestConnection.bssid,
        connectionStatus: latestConnection.connectionStatus,
        signalStrength: latestConnection.signalStrength,
        signalQuality: getSignalQuality(latestConnection.signalStrength),
        linkSpeed: latestConnection.linkSpeed,
        frequency: latestConnection.frequency,
        channel: latestConnection.channel,
        quality: latestConnection.quality,
        rxRate: latestConnection.rxRate,
        txRate: latestConnection.txRate,
        uptime: latestConnection.uptime,
        lastSeen: latestConnection.timestamp,
        lastDisconnection: latestConnection.lastDisconnection,
        reconnectionTime: latestConnection.reconnectionTime,
        networkLatency: latestConnection.networkLatency,
        internetLatency: latestConnection.internetLatency,
        packetLoss: latestConnection.packetLoss,
        stabilityScore,
        totalRecords,
        connectedCount: connectedRecords.count,
        disconnectedCount: disconnectedRecords.count
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting SSID status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get connection status'
    });
  }
});

// Get connection history for a monitor
router.get('/history/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { period = '24h', limit = 100 } = req.query;
    
    const history = await SSIDConnection.getConnectionHistory(monitorId, period);
    const limitedHistory = history.slice(0, parseInt(limit));

    // Calculate uptime percentage for the period
    const connectedRecords = limitedHistory.filter(record => record.connectionStatus === 'connected').length;
    const uptimePercentage = limitedHistory.length > 0 ? 
      Math.round((connectedRecords / limitedHistory.length) * 100) : 0;

    res.json({
      success: true,
      data: {
        monitorId,
        period,
        totalRecords: limitedHistory.length,
        uptimePercentage,
        history: limitedHistory
      }
    });
  } catch (error) {
    console.error('Error getting connection history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get connection history'
    });
  }
});

// Get stability metrics for a monitor
router.get('/stability/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { period = '24h' } = req.query;
    
    const stabilityData = await SSIDConnection.getStabilityMetrics(monitorId, period);
    const history = await SSIDConnection.getConnectionHistory(monitorId, period);

    // Calculate disconnection incidents
    let disconnectionIncidents = 0;
    let totalDowntime = 0;
    let currentStatus = null;
    let disconnectionStart = null;

    history.reverse().forEach(record => {
      if (currentStatus === 'connected' && record.connectionStatus === 'disconnected') {
        disconnectionIncidents++;
        disconnectionStart = record.timestamp;
      } else if (currentStatus === 'disconnected' && record.connectionStatus === 'connected') {
        if (disconnectionStart) {
          totalDowntime += (record.timestamp - disconnectionStart) / 1000; // seconds
        }
      }
      currentStatus = record.connectionStatus;
    });

    // Calculate average signal strength and stability
    const connectedRecords = stabilityData.find(s => s._id === 'connected') || {};
    const allRecords = history.length;
    const uptimePercentage = allRecords > 0 ? 
      Math.round(((connectedRecords.count || 0) / allRecords) * 100) : 0;

    res.json({
      success: true,
      data: {
        monitorId,
        period,
        uptimePercentage,
        disconnectionIncidents,
        totalDowntime,
        averageDowntime: disconnectionIncidents > 0 ? totalDowntime / disconnectionIncidents : 0,
        stabilityMetrics: stabilityData,
        avgSignalStrength: connectedRecords.avgSignalStrength || 0,
        signalStability: {
          min: connectedRecords.minSignalStrength || 0,
          max: connectedRecords.maxSignalStrength || 0,
          avg: connectedRecords.avgSignalStrength || 0,
          variance: connectedRecords.maxSignalStrength && connectedRecords.minSignalStrength ? 
            connectedRecords.maxSignalStrength - connectedRecords.minSignalStrength : 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting stability metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stability metrics'
    });
  }
});

// Get overview of all monitors' SSID status
router.get('/overview', async (req, res) => {
  try {
    const monitors = await Monitor.find({});
    const overviewData = [];

    for (const monitor of monitors) {
      const latestConnection = await SSIDConnection.getLatestByMonitor(monitor.monitorId);
      const stabilityData = await SSIDConnection.getStabilityMetrics(monitor.monitorId, '24h');
      
      const connectedRecords = stabilityData.find(s => s._id === 'connected') || { count: 0 };
      const disconnectedRecords = stabilityData.find(s => s._id === 'disconnected') || { count: 0 };
      const totalRecords = connectedRecords.count + disconnectedRecords.count;
      const stabilityScore = totalRecords > 0 ? Math.round((connectedRecords.count / totalRecords) * 100) : 0;

      overviewData.push({
        monitorId: monitor.monitorId,
        name: monitor.name,
        ssid: latestConnection?.ssid || 'Unknown',
        connectionStatus: latestConnection?.connectionStatus || 'no_data',
        signalStrength: latestConnection?.signalStrength || 0,
        stabilityScore,
        lastSeen: latestConnection?.timestamp,
        uptime: latestConnection?.uptime || 0
      });
    }

    res.json({
      success: true,
      data: overviewData
    });
  } catch (error) {
    console.error('Error getting SSID overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get SSID overview'
    });
  }
});

// POST endpoint for Raspberry Pi to report connection status
router.post('/connection', authenticateMonitor, async (req, res) => {
  try {
    const monitorId = req.monitor.monitorId;
    const {
      ssid,
      bssid,
      connectionStatus,
      signalStrength,
      linkSpeed,
      frequency,
      channel,
      quality,
      rxRate,
      txRate,
      uptime,
      lastDisconnection,
      reconnectionTime,
      disconnectionReason,
      networkLatency,
      internetLatency,
      packetLoss,
      // Phase 3: New performance metrics
      downloadThroughput,
      uploadThroughput,
      jitter,
      dnsLatency,
      retransmissions,
      connectionErrors,
      stabilityScore
    } = req.body;

    // Validate required fields
    if (!ssid || !connectionStatus || signalStrength === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ssid, connectionStatus, signalStrength'
      });
    }

    // Create new connection record
    const connectionData = new SSIDConnection({
      monitorId,
      ssid,
      bssid,
      connectionStatus,
      signalStrength,
      linkSpeed,
      frequency,
      channel,
      quality,
      rxRate,
      txRate,
      uptime,
      lastDisconnection: lastDisconnection ? new Date(lastDisconnection) : undefined,
      reconnectionTime,
      disconnectionReason,
      networkLatency,
      internetLatency,
      packetLoss,
      // Phase 3: New performance metrics
      downloadThroughput,
      uploadThroughput,
      jitter,
      dnsLatency,
      retransmissions,
      connectionErrors,
      stabilityScore
    });

    await connectionData.save();

    // Emit real-time update via Socket.IO if available
    if (req.app.get('io')) {
      req.app.get('io').emit('ssid:update', {
        monitorId,
        ssid,
        connectionStatus,
        signalStrength,
        timestamp: connectionData.timestamp
      });
    }

    res.json({
      success: true,
      message: 'Connection status recorded successfully',
      data: {
        id: connectionData._id,
        timestamp: connectionData.timestamp
      }
    });
  } catch (error) {
    console.error('Error recording connection status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record connection status'
    });
  }
});

// Phase 3: Get performance metrics for a monitor
router.get('/performance/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { period = '24h' } = req.query;
    
    const performanceData = await SSIDConnection.getPerformanceMetrics(monitorId, period);
    
    if (!performanceData || performanceData.length === 0) {
      return res.json({
        success: true,
        data: {
          monitorId,
          period,
          message: 'No performance data available',
          metrics: {}
        }
      });
    }

    const metrics = performanceData[0];
    
    res.json({
      success: true,
      data: {
        monitorId,
        period,
        count: metrics.count,
        metrics: {
          latency: {
            network: {
              avg: metrics.avgNetworkLatency,
              min: metrics.minNetworkLatency,
              max: metrics.maxNetworkLatency
            },
            internet: {
              avg: metrics.avgInternetLatency,
              min: metrics.minInternetLatency,
              max: metrics.maxInternetLatency
            },
            dns: {
              avg: metrics.avgDnsLatency,
              min: metrics.minDnsLatency,
              max: metrics.maxDnsLatency
            }
          },
          throughput: {
            download: {
              avg: metrics.avgDownloadThroughput,
              min: metrics.minDownloadThroughput,
              max: metrics.maxDownloadThroughput
            },
            upload: {
              avg: metrics.avgUploadThroughput,
              min: metrics.minUploadThroughput,
              max: metrics.maxUploadThroughput
            }
          },
          quality: {
            packetLoss: {
              avg: metrics.avgPacketLoss,
              min: metrics.minPacketLoss,
              max: metrics.maxPacketLoss
            },
            jitter: {
              avg: metrics.avgJitter
            },
            stabilityScore: {
              avg: metrics.avgStabilityScore
            }
          },
          reliability: {
            retransmissions: metrics.totalRetransmissions,
            connectionErrors: metrics.totalConnectionErrors
          }
        }
      }
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics'
    });
  }
});

// Phase 3: Get performance history for charts
router.get('/performance/:monitorId/history', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { period = '24h', metric = 'all' } = req.query;
    
    const historyData = await SSIDConnection.getPerformanceHistory(monitorId, period, metric);
    
    if (!historyData || historyData.length === 0) {
      return res.json({
        success: true,
        data: {
          monitorId,
          period,
          metric,
          count: 0,
          chartData: {
            labels: [],
            datasets: {}
          }
        }
      });
    }

    // Format data for charts
    const labels = historyData.map(item => item.timestamp);
    const datasets = {};
    
    if (metric === 'all' || metric === 'latency') {
      datasets.networkLatency = historyData.map(item => item.networkLatency);
      datasets.internetLatency = historyData.map(item => item.internetLatency);
      datasets.dnsLatency = historyData.map(item => item.dnsLatency);
    }
    
    if (metric === 'all' || metric === 'throughput') {
      datasets.downloadThroughput = historyData.map(item => item.downloadThroughput);
      datasets.uploadThroughput = historyData.map(item => item.uploadThroughput);
    }
    
    if (metric === 'all' || metric === 'quality') {
      datasets.packetLoss = historyData.map(item => item.packetLoss);
      datasets.jitter = historyData.map(item => item.jitter);
      datasets.stabilityScore = historyData.map(item => item.stabilityScore);
      datasets.signalStrength = historyData.map(item => item.signalStrength);
    }
    
    res.json({
      success: true,
      data: {
        monitorId,
        period,
        metric,
        count: historyData.length,
        chartData: {
          labels,
          datasets
        }
      }
    });
  } catch (error) {
    console.error('Error getting performance history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance history'
    });
  }
});

module.exports = router;