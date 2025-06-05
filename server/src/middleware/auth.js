const config = require('../../config/config');
const logger = require('../utils/logger');
const Monitor = require('../models/Monitor');

// API Key authentication for Pi monitors
const authenticateMonitor = async (req, res, next) => {
  try {
    const apiKey = req.header(config.api.keyHeader);
    const monitorId = req.header('X-Monitor-ID');

    if (!apiKey || !monitorId) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication credentials',
      });
    }

    // First try to find monitor with its specific API key
    let monitor = await Monitor.findOne({ 
      monitorId,
      apiKey,
    }).select('+apiKey');

    // If not found and there's a global API key, check if this is a valid monitor with global key
    if (!monitor && process.env.API_KEY && apiKey === process.env.API_KEY) {
      monitor = await Monitor.findOne({ monitorId }).select('+apiKey');
      
      if (monitor) {
        logger.info(`Monitor ${monitorId} authenticated with global API key`);
        // Update monitor with the global API key for future use
        monitor.apiKey = process.env.API_KEY;
        await monitor.save();
      }
    }

    if (!monitor) {
      logger.warn(`Authentication failed for monitor: ${monitorId} with API key: ${apiKey.substring(0, 10)}...`);
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication credentials',
      });
    }

    // Attach monitor to request
    req.monitor = monitor;
    req.monitorId = monitorId;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

// Optional authentication - doesn't fail if no credentials
const optionalAuth = async (req, res, next) => {
  try {
    const apiKey = req.header(config.api.keyHeader);
    const monitorId = req.header('X-Monitor-ID');

    if (apiKey && monitorId) {
      const monitor = await Monitor.findOne({ 
        monitorId,
        apiKey,
      }).select('+apiKey');

      if (monitor) {
        req.monitor = monitor;
        req.monitorId = monitorId;
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    logger.debug('Optional auth error:', error);
    next();
  }
};

// Validate monitor exists and is active
const requireActiveMonitor = async (req, res, next) => {
  if (!req.monitor) {
    return res.status(401).json({
      success: false,
      error: 'Monitor authentication required',
    });
  }

  if (req.monitor.status !== 'active' && req.monitor.status !== 'maintenance') {
    return res.status(403).json({
      success: false,
      error: 'Monitor is not active',
    });
  }

  next();
};

module.exports = {
  authenticateMonitor,
  optionalAuth,
  requireActiveMonitor,
}; 