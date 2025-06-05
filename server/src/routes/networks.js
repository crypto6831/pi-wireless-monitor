const express = require('express');
const { body, validationResult } = require('express-validator');
const Network = require('../models/Network');
const Monitor = require('../models/Monitor');
const { authenticateMonitor } = require('../middleware/auth');
const logger = require('../utils/logger');
const redis = require('../db/redis');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  next();
};

// Submit network scan data
router.post('/', authenticateMonitor, [
  body('networks').isArray().notEmpty(),
  body('networks.*.ssid').optional({ checkFalsy: false }).isString(),
  body('networks.*.bssid').notEmpty().isString(),
  body('networks.*.signal_strength').isNumeric(),
], validate, async (req, res) => {
  try {
    const { networks, timestamp } = req.body;
    const processedNetworks = [];

    // Update monitor's last scan time
    await req.monitor.updateLastScan();

    // Process each network
    for (const networkData of networks) {
      try {
        // Skip networks with invalid data
        if (!networkData.bssid || networkData.bssid === '00:00:00:00:00:00') {
          logger.debug(`Skipping invalid network: ${JSON.stringify(networkData)}`);
          continue;
        }

        // Handle empty or hidden SSIDs
        if (!networkData.ssid || networkData.ssid.trim() === '') {
          networkData.ssid = '<hidden>';
        }

        const network = await Network.findOrCreateFromScan({
          ...networkData,
          monitor_id: req.monitorId,
        });
        processedNetworks.push(network);

        // Check for weak signal alerts
        const defaultSignalThreshold = -80;
        const signalThreshold = req.monitor.settings?.thresholds?.signalStrength?.min || defaultSignalThreshold;
        
        if (networkData.signal_strength < signalThreshold) {
          // Publish alert event
          await redis.publish('alert:weak_signal', {
            monitorId: req.monitorId,
            network: networkData.ssid,
            signalStrength: networkData.signal_strength,
            threshold: signalThreshold,
          });
        }
      } catch (error) {
        logger.error(`Error processing network ${networkData.ssid}:`, error);
      }
    }

    // Cache latest scan results
    await redis.setEx(
      `monitor:${req.monitorId}:networks:latest`,
      processedNetworks.map(n => n.toJSON()),
      300 // 5 minutes TTL
    );

    // Publish network scan event
    await redis.publish('network:scan', {
      monitorId: req.monitorId,
      timestamp,
      networkCount: processedNetworks.length,
    });

    logger.info(`Processed ${processedNetworks.length} networks from monitor ${req.monitorId}`);

    res.json({
      success: true,
      message: 'Network data received',
      processed: processedNetworks.length,
    });
  } catch (error) {
    logger.error('Network data processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process network data',
    });
  }
});

// Get networks
router.get('/', async (req, res) => {
  try {
    const {
      monitorId,
      ssid,
      minSignal,
      active,
      limit = 100,
      offset = 0,
    } = req.query;

    const query = {};
    const options = {};

    if (monitorId) query.monitorId = monitorId;
    if (ssid) query.ssid = new RegExp(ssid, 'i');
    if (minSignal) options.minSignal = parseInt(minSignal);
    if (active === 'true') options.active = true;

    let networksQuery = Network.find(query);

    if (options.active) {
      const activeThreshold = new Date(Date.now() - 5 * 60 * 1000);
      networksQuery.where('lastSeen').gte(activeThreshold);
    }

    if (options.minSignal) {
      networksQuery.where('signalStrength').gte(options.minSignal);
    }

    const total = await Network.countDocuments(networksQuery.getQuery());

    const networks = await networksQuery
      .sort('-lastSeen')
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .exec();

    res.json({
      success: true,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      networks,
    });
  } catch (error) {
    logger.error('Error fetching networks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch networks',
    });
  }
});

// Get specific network
router.get('/:id', async (req, res) => {
  try {
    const network = await Network.findById(req.params.id);

    if (!network) {
      return res.status(404).json({
        success: false,
        error: 'Network not found',
      });
    }

    res.json({
      success: true,
      network,
    });
  } catch (error) {
    logger.error('Error fetching network:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network',
    });
  }
});

// Get network history
router.get('/:id/history', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const network = await Network.findById(req.params.id)
      .select('ssid bssid history stats');

    if (!network) {
      return res.status(404).json({
        success: false,
        error: 'Network not found',
      });
    }

    // Return limited history
    const history = network.history.slice(-parseInt(limit));

    res.json({
      success: true,
      network: {
        id: network._id,
        ssid: network.ssid,
        bssid: network.bssid,
        stats: network.stats,
      },
      history,
    });
  } catch (error) {
    logger.error('Error fetching network history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network history',
    });
  }
});

// Get networks by monitor
router.get('/monitor/:monitorId', async (req, res) => {
  try {
    const { active, minSignal } = req.query;
    
    // Check if monitor exists
    const monitor = await Monitor.findByMonitorId(req.params.monitorId);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Monitor not found',
      });
    }

    // Check cache first
    if (active === 'true') {
      const cached = await redis.getJson(`monitor:${req.params.monitorId}:networks:latest`);
      if (cached) {
        return res.json({
          success: true,
          networks: cached,
          cached: true,
        });
      }
    }

    const options = {};
    if (active === 'true') options.active = true;
    if (minSignal) options.minSignal = parseInt(minSignal);

    const networks = await Network.findByMonitor(req.params.monitorId, options);

    res.json({
      success: true,
      count: networks.length,
      networks,
      cached: false,
    });
  } catch (error) {
    logger.error('Error fetching monitor networks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitor networks',
    });
  }
});

// Trigger network scan (command to Pi)
router.post('/scan', authenticateMonitor, async (req, res) => {
  try {
    // Publish scan request
    await redis.publish('monitor:command', {
      monitorId: req.monitorId,
      command: 'scan_networks',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Scan request sent to monitor ${req.monitorId}`);

    res.json({
      success: true,
      message: 'Scan request sent',
    });
  } catch (error) {
    logger.error('Error sending scan request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send scan request',
    });
  }
});

// Get network statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { monitorId } = req.query;

    // Get cached stats
    const cacheKey = monitorId 
      ? `networks:stats:${monitorId}` 
      : 'networks:stats:global';
    
    const cached = await redis.getJson(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        stats: cached,
        cached: true,
      });
    }

    // Calculate stats
    const match = monitorId ? { monitorId } : {};
    
    const stats = await Network.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalNetworks: { $sum: 1 },
          avgSignalStrength: { $avg: '$signalStrength' },
          minSignalStrength: { $min: '$signalStrength' },
          maxSignalStrength: { $max: '$signalStrength' },
          encryptedCount: {
            $sum: { $cond: ['$encryption', 1, 0] }
          },
          bands: {
            $push: '$band'
          },
        }
      },
      {
        $project: {
          _id: 0,
          totalNetworks: 1,
          avgSignalStrength: { $round: ['$avgSignalStrength', 0] },
          minSignalStrength: 1,
          maxSignalStrength: 1,
          encryptedCount: 1,
          encryptionPercentage: {
            $multiply: [
              { $divide: ['$encryptedCount', '$totalNetworks'] },
              100
            ]
          },
          band2_4GHz: {
            $size: {
              $filter: {
                input: '$bands',
                cond: { $eq: ['$$this', '2.4GHz'] }
              }
            }
          },
          band5GHz: {
            $size: {
              $filter: {
                input: '$bands',
                cond: { $eq: ['$$this', '5GHz'] }
              }
            }
          },
        }
      }
    ]);

    const result = stats[0] || {
      totalNetworks: 0,
      avgSignalStrength: 0,
      minSignalStrength: 0,
      maxSignalStrength: 0,
      encryptedCount: 0,
      encryptionPercentage: 0,
      band2_4GHz: 0,
      band5GHz: 0,
    };

    // Cache stats
    await redis.setEx(cacheKey, result, 300); // 5 minutes

    res.json({
      success: true,
      stats: result,
      cached: false,
    });
  } catch (error) {
    logger.error('Error calculating network stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate network statistics',
    });
  }
});

module.exports = router; 