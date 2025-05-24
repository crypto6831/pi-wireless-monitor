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

    // Find monitor with API key
    const monitor = await Monitor.findOne({ 
      monitorId,
      apiKey,
    }).select('+apiKey');

    if (!monitor) {
      logger.warn(`Authentication failed for monitor: ${monitorId}`);
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