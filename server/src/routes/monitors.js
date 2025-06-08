const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const Monitor = require('../models/Monitor');
const { authenticateMonitor } = require('../middleware/auth');
const logger = require('../utils/logger');
const redis = require('../db/redis');
const ActivityService = require('../services/activityService');

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

// Register a new monitor
router.post('/register', [
  body('monitor_id').notEmpty().trim(),
  body('name').notEmpty().trim(),
  body('location').notEmpty().trim(),
  body('interface').optional().trim(),
  body('capabilities').optional().isObject(),
  body('system_info').optional().isObject(),
], validate, async (req, res) => {
  try {
    const {
      monitor_id,
      name,
      location,
      interface: iface,
      capabilities,
      system_info,
    } = req.body;

    // Check if monitor already exists
    let monitor = await Monitor.findByMonitorId(monitor_id);
    
    if (monitor) {
      // Update existing monitor
      monitor.name = name;
      monitor.location = location;
      monitor.interface = iface || monitor.interface;
      monitor.capabilities = capabilities || monitor.capabilities;
      // Map system_info fields to match schema
      if (system_info) {
        monitor.systemInfo = {
          platform: system_info.platform,
          platformRelease: system_info.platform_release,
          platformVersion: system_info.platform_version,
          architecture: system_info.architecture,
          hostname: system_info.hostname,
          processor: system_info.processor,
          ramTotal: system_info.ram_total,
          pythonVersion: system_info.python_version
        };
      }
      monitor.status = 'active';
      monitor.lastHeartbeat = new Date();
      
      await monitor.save();
      
      // Log activity for reconnection
      await ActivityService.logMonitorConnected(monitor);
      
      logger.info(`Monitor re-registered: ${monitor_id}`);
      
      return res.json({
        success: true,
        message: 'Monitor re-registered successfully',
        monitor: {
          id: monitor._id,
          monitorId: monitor.monitorId,
          name: monitor.name,
          location: monitor.location,
        },
      });
    }

    // Generate API key for new monitor
    const apiKey = crypto.randomBytes(32).toString('hex');

    // Map system_info fields to match schema
    let mappedSystemInfo = {};
    if (system_info) {
      mappedSystemInfo = {
        platform: system_info.platform,
        platformRelease: system_info.platform_release,
        platformVersion: system_info.platform_version,
        architecture: system_info.architecture,
        hostname: system_info.hostname,
        processor: system_info.processor,
        ramTotal: system_info.ram_total,
        pythonVersion: system_info.python_version
      };
    }

    // Create new monitor
    monitor = new Monitor({
      monitorId: monitor_id,
      name,
      location,
      interface: iface || 'wlan0',
      capabilities: capabilities || {},
      systemInfo: mappedSystemInfo,
      apiKey,
      status: 'active',
    });

    await monitor.save();

    // Log activity for new monitor registration
    await ActivityService.logMonitorRegistered(monitor);

    // Cache monitor info in Redis
    await redis.setEx(
      `monitor:${monitor_id}`,
      monitor.toJSON(),
      3600 // 1 hour TTL
    );

    logger.info(`New monitor registered: ${monitor_id}`);

    res.status(201).json({
      success: true,
      message: 'Monitor registered successfully',
      monitor: {
        id: monitor._id,
        monitorId: monitor.monitorId,
        name: monitor.name,
        location: monitor.location,
      },
      apiKey, // Only sent on initial registration
    });
  } catch (error) {
    logger.error('Monitor registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register monitor',
    });
  }
});

// Heartbeat endpoint
router.post('/heartbeat', authenticateMonitor, async (req, res) => {
  try {
    const { timestamp, status, uptime } = req.body;

    // Update monitor heartbeat
    await req.monitor.updateHeartbeat(uptime);

    // Update Redis cache
    await redis.setEx(
      `monitor:${req.monitorId}:heartbeat`,
      { timestamp, status, uptime },
      300 // 5 minutes TTL
    );

    // Publish heartbeat event
    await redis.publish('monitor:heartbeat', {
      monitorId: req.monitorId,
      timestamp,
      status,
    });

    res.json({
      success: true,
      message: 'Heartbeat received',
    });
  } catch (error) {
    logger.error('Heartbeat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process heartbeat',
    });
  }
});

// Get all monitors
router.get('/', async (req, res) => {
  try {
    const { status, location } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (location) query.location = new RegExp(location, 'i');

    const monitors = await Monitor.find(query)
      .select('-apiKey')
      .sort('-lastHeartbeat');

    res.json({
      success: true,
      count: monitors.length,
      monitors,
    });
  } catch (error) {
    logger.error('Error fetching monitors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitors',
    });
  }
});

// Get specific monitor
router.get('/:monitorId', async (req, res) => {
  try {
    const monitor = await Monitor.findByMonitorId(req.params.monitorId)
      .select('-apiKey');

    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Monitor not found',
      });
    }

    res.json({
      success: true,
      monitor,
    });
  } catch (error) {
    logger.error('Error fetching monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitor',
    });
  }
});

// Update monitor settings
router.put('/:monitorId', authenticateMonitor, [
  body('name').optional().trim(),
  body('location').optional().trim(),
  body('settings').optional().isObject(),
], validate, async (req, res) => {
  try {
    if (req.monitorId !== req.params.monitorId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to update this monitor',
      });
    }

    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.location) updates.location = req.body.location;
    if (req.body.settings) updates.settings = req.body.settings;

    const monitor = await Monitor.findByIdAndUpdate(
      req.monitor._id,
      updates,
      { new: true }
    ).select('-apiKey');

    // Update Redis cache
    await redis.setEx(
      `monitor:${req.monitorId}`,
      monitor.toJSON(),
      3600
    );

    res.json({
      success: true,
      message: 'Monitor updated successfully',
      monitor,
    });
  } catch (error) {
    logger.error('Monitor update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update monitor',
    });
  }
});

// Delete monitor
router.delete('/:monitorId', authenticateMonitor, async (req, res) => {
  try {
    if (req.monitorId !== req.params.monitorId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this monitor',
      });
    }

    await Monitor.findByIdAndDelete(req.monitor._id);

    // Clear Redis cache
    await redis.del(`monitor:${req.monitorId}`);
    await redis.del(`monitor:${req.monitorId}:heartbeat`);

    logger.info(`Monitor deleted: ${req.monitorId}`);

    res.json({
      success: true,
      message: 'Monitor deleted successfully',
    });
  } catch (error) {
    logger.error('Monitor deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete monitor',
    });
  }
});

// Get monitor statistics
router.get('/:monitorId/stats', async (req, res) => {
  try {
    const monitor = await Monitor.findByMonitorId(req.params.monitorId);
    
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Monitor not found',
      });
    }

    // Get cached stats from Redis
    const cachedStats = await redis.getJson(`monitor:${req.params.monitorId}:stats`);
    if (cachedStats) {
      return res.json({
        success: true,
        stats: cachedStats,
        cached: true,
      });
    }

    // Import models for counting
    const Network = require('../models/Network');
    const Device = require('../models/Device');

    // Calculate network and device counts
    const [networkCount, deviceCount] = await Promise.all([
      Network.countDocuments({ monitorId: req.params.monitorId }),
      Device.countDocuments({ monitorId: req.params.monitorId })
    ]);

    // Calculate stats
    const stats = {
      monitorId: monitor.monitorId,
      name: monitor.name,
      location: monitor.location,
      status: monitor.status,
      isOnline: monitor.isOnline,
      uptime: monitor.uptime,
      lastHeartbeat: monitor.lastHeartbeat,
      lastScan: monitor.lastScan,
      capabilities: monitor.capabilities,
      networksDetected: networkCount,
      devicesConnected: deviceCount,
    };

    // Cache stats
    await redis.setEx(
      `monitor:${req.params.monitorId}:stats`,
      stats,
      60 // 1 minute TTL
    );

    res.json({
      success: true,
      stats,
      cached: false,
    });
  } catch (error) {
    logger.error('Error fetching monitor stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitor statistics',
    });
  }
});

// Update monitor WiFi connection info
router.put('/:id/wifi-connection', authenticateMonitor, async (req, res) => {
  try {
    const { ssid, bssid, rssi, channel, frequency, rxRate, txRate, linkSpeed, quality } = req.body;
    
    const monitor = await Monitor.findById(req.params.id);
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Update WiFi connection data
    monitor.wifiConnection = {
      ssid: ssid || null,
      bssid: bssid || null,
      rssi: rssi || null,
      channel: channel || null,
      frequency: frequency || null,
      rxRate: rxRate || null,
      txRate: txRate || null,
      linkSpeed: linkSpeed || null,
      quality: quality || null,
      lastUpdated: new Date()
    };
    
    await monitor.save();
    
    res.json({ 
      success: true, 
      monitor: monitor 
    });
  } catch (error) {
    logger.error('Error updating WiFi connection:', error);
    res.status(500).json({ error: 'Failed to update WiFi connection' });
  }
});

// Update monitor position
router.put('/:id/position', [
  body('x').isNumeric().withMessage('X coordinate must be a number'),
  body('y').isNumeric().withMessage('Y coordinate must be a number'),
  body('locationId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid location ID'),
  body('floorId').optional({ values: 'falsy' }).custom((value) => {
    if (value !== null && value !== undefined && value === '') {
      throw new Error('Floor ID cannot be empty string');
    }
    return true;
  }),
], validate, async (req, res) => {
  try {
    const { x, y, locationId, floorId } = req.body;
    
    const monitor = await Monitor.findById(req.params.id);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Monitor not found',
      });
    }

    // Update position using the model method
    await monitor.updatePosition(x, y, locationId, floorId);
    
    logger.info(`Monitor position updated: ${monitor.monitorId} to (${x}, ${y})`);

    res.json({
      success: true,
      message: 'Monitor position updated successfully',
      monitor: {
        id: monitor._id,
        monitorId: monitor.monitorId,
        position: monitor.position,
        locationId: monitor.locationId,
        floorId: monitor.floorId,
      },
    });
  } catch (error) {
    logger.error('Monitor position update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update monitor position',
    });
  }
});

// Create coverage area for monitor
router.post('/:id/coverage', [
  body('locationId').isMongoId().withMessage('Invalid location ID'),
  body('floorId').notEmpty().withMessage('Floor ID is required'),
  body('coverageType').isIn(['circle', 'polygon', 'rectangle']).withMessage('Invalid coverage type'),
  body('center').optional().isObject().withMessage('Center must be an object'),
  body('radius').optional().isNumeric().withMessage('Radius must be a number'),
  body('points').optional().isArray().withMessage('Points must be an array'),
  body('bounds').optional().isObject().withMessage('Bounds must be an object'),
], validate, async (req, res) => {
  try {
    const CoverageArea = require('../models/CoverageArea');
    
    const monitor = await Monitor.findById(req.params.id);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Monitor not found',
      });
    }

    const coverageData = {
      monitorId: monitor._id,
      ...req.body,
    };

    const coverage = new CoverageArea(coverageData);
    await coverage.save();
    
    logger.info(`Coverage area created for monitor: ${monitor.monitorId}`);

    res.status(201).json({
      success: true,
      message: 'Coverage area created successfully',
      coverage,
    });
  } catch (error) {
    logger.error('Coverage area creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create coverage area',
    });
  }
});

module.exports = router; 