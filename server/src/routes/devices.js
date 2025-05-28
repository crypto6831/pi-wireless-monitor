const express = require('express');
const { body, validationResult } = require('express-validator');
const Device = require('../models/Device');
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

// Submit device scan data
router.post('/', authenticateMonitor, [
  body('devices').isArray().notEmpty(),
  body('devices.*.macAddress').optional({ checkFalsy: false }).isString()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty
      // Basic MAC address validation
      const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
      return macRegex.test(value);
    }).withMessage('Invalid MAC address format'),
  body('devices.*.ipAddress').optional({ checkFalsy: false }).isString()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty
      // Basic IP address validation
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      return ipRegex.test(value);
    }).withMessage('Invalid IP address format'),
], validate, async (req, res) => {
  try {
    const { devices, timestamp } = req.body;
    const processedDevices = [];

    // Update monitor's last scan time
    await req.monitor.updateLastScan();

    // Process each device
    for (const deviceData of devices) {
      try {
        // Skip devices with invalid data
        if (!deviceData.macAddress || 
            deviceData.macAddress === '00:00:00:00:00:00' ||
            !deviceData.ipAddress || 
            deviceData.ipAddress === '0.0.0.0') {
          logger.debug(`Skipping invalid device: ${JSON.stringify(deviceData)}`);
          continue;
        }

        const device = await Device.findOrCreateFromScan({
          ...deviceData,
          monitor_id: req.monitorId,
        });
        processedDevices.push(device);
      } catch (error) {
        logger.error(`Error processing device ${deviceData.macAddress}:`, error);
      }
    }

    // Mark inactive devices as offline
    await Device.markInactiveDevicesOffline(req.monitorId, 5);

    // Cache latest scan results
    await redis.setEx(
      `monitor:${req.monitorId}:devices:latest`,
      processedDevices.map(d => d.toJSON()),
      300 // 5 minutes TTL
    );

    // Publish device scan event
    await redis.publish('device:scan', {
      monitorId: req.monitorId,
      timestamp,
      deviceCount: processedDevices.length,
    });

    logger.info(`Processed ${processedDevices.length} devices from monitor ${req.monitorId}`);

    res.status(201).json({
      success: true,
      message: 'Device data received',
      processed: processedDevices.length,
    });
  } catch (error) {
    logger.error('Device processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process device data',
    });
  }
});

// Get devices
router.get('/', async (req, res) => {
  try {
    const {
      monitorId,
      online,
      active,
      deviceType,
      vendor,
      limit = 100,
      offset = 0,
    } = req.query;

    const query = {};
    const options = {};

    if (monitorId) query.monitorId = monitorId;
    if (deviceType) options.deviceType = deviceType;
    if (vendor) options.vendor = vendor;
    if (online !== undefined) options.online = online === 'true';
    if (active === 'true') options.active = true;

    let devicesQuery = Device.findByMonitor(monitorId || undefined, options);

    if (!monitorId) {
      devicesQuery = Device.find(query);
      
      if (options.online !== undefined) {
        devicesQuery.where('isOnline').equals(options.online);
      }

      if (options.active) {
        const activeThreshold = new Date(Date.now() - 5 * 60 * 1000);
        devicesQuery.where('lastSeen').gte(activeThreshold);
      }

      if (options.deviceType) {
        devicesQuery.where('deviceType').equals(options.deviceType);
      }

      if (options.vendor) {
        devicesQuery.where('vendor').regex(new RegExp(options.vendor, 'i'));
      }
    }

    const total = await Device.countDocuments(devicesQuery.getQuery());

    const devices = await devicesQuery
      .sort('-lastSeen')
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .exec();

    res.json({
      success: true,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      devices,
    });
  } catch (error) {
    logger.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch devices',
    });
  }
});

// Get device by ID
router.get('/:id', async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    res.json({
      success: true,
      device,
    });
  } catch (error) {
    logger.error('Error fetching device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device',
    });
  }
});

// Get device history
router.get('/:id/history', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const device = await Device.findById(req.params.id)
      .select('macAddress ipAddress hostname history stats');

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    // Return limited history
    const history = device.history.slice(-parseInt(limit));

    res.json({
      success: true,
      device: {
        id: device._id,
        macAddress: device.macAddress,
        ipAddress: device.ipAddress,
        hostname: device.hostname,
        stats: device.stats,
      },
      history,
    });
  } catch (error) {
    logger.error('Error fetching device history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device history',
    });
  }
});

// Get devices by monitor
router.get('/monitor/:monitorId', async (req, res) => {
  try {
    const { online, active, deviceType, vendor } = req.query;
    
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
      const cached = await redis.getJson(`monitor:${req.params.monitorId}:devices:latest`);
      if (cached) {
        return res.json({
          success: true,
          devices: cached,
          cached: true,
        });
      }
    }

    const options = {};
    if (online !== undefined) options.online = online === 'true';
    if (active === 'true') options.active = true;
    if (deviceType) options.deviceType = deviceType;
    if (vendor) options.vendor = vendor;

    const devices = await Device.findByMonitor(req.params.monitorId, options);

    res.json({
      success: true,
      count: devices.length,
      devices,
      cached: false,
    });
  } catch (error) {
    logger.error('Error fetching monitor devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitor devices',
    });
  }
});

// Get device statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { monitorId } = req.query;

    // Get cached stats
    const cacheKey = monitorId 
      ? `devices:stats:${monitorId}` 
      : 'devices:stats:global';
    
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
    
    const stats = await Device.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalDevices: { $sum: 1 },
          onlineDevices: {
            $sum: { $cond: ['$isOnline', 1, 0] }
          },
          offlineDevices: {
            $sum: { $cond: ['$isOnline', 0, 1] }
          },
          deviceTypes: {
            $push: '$deviceType'
          },
          vendors: {
            $push: '$vendor'
          },
          avgConnectivity: {
            $avg: '$stats.connectivityPercentage'
          },
        }
      },
      {
        $project: {
          _id: 0,
          totalDevices: 1,
          onlineDevices: 1,
          offlineDevices: 1,
          onlinePercentage: {
            $multiply: [
              { $divide: ['$onlineDevices', '$totalDevices'] },
              100
            ]
          },
          avgConnectivity: { $round: ['$avgConnectivity', 1] },
          uniqueDeviceTypes: {
            $size: {
              $setUnion: ['$deviceTypes', []]
            }
          },
          uniqueVendors: {
            $size: {
              $setUnion: ['$vendors', []]
            }
          },
        }
      }
    ]);

    const result = stats[0] || {
      totalDevices: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      onlinePercentage: 0,
      avgConnectivity: 0,
      uniqueDeviceTypes: 0,
      uniqueVendors: 0,
    };

    // Cache for 5 minutes
    await redis.setEx(cacheKey, result, 300);

    res.json({
      success: true,
      stats: result,
      cached: false,
    });
  } catch (error) {
    logger.error('Error calculating device stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate device statistics',
    });
  }
});

// Trigger device scan (command to Pi)
router.post('/scan', authenticateMonitor, async (req, res) => {
  try {
    // Publish scan request
    await redis.publish('monitor:command', {
      monitorId: req.monitorId,
      command: 'scan_devices',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Device scan request sent to monitor ${req.monitorId}`);

    res.json({
      success: true,
      message: 'Device scan request sent',
    });
  } catch (error) {
    logger.error('Error sending device scan request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send device scan request',
    });
  }
});

module.exports = router; 