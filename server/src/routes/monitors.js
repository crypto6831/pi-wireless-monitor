const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
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
      monitor.systemInfo = system_info || monitor.systemInfo;
      monitor.status = 'active';
      monitor.lastHeartbeat = new Date();
      
      await monitor.save();
      
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

    // Create new monitor
    monitor = new Monitor({
      monitorId: monitor_id,
      name,
      location,
      interface: iface || 'wlan0',
      capabilities: capabilities || {},
      systemInfo: system_info || {},
      apiKey,
      status: 'active',
    });

    await monitor.save();

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

module.exports = router; 