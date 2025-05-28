const express = require('express');
const { body, validationResult } = require('express-validator');
const Alert = require('../models/Alert');
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

// Submit alert
router.post('/', authenticateMonitor, [
  body('alert').isObject().notEmpty(),
  body('alert.type').notEmpty(),
  body('alert.severity').isIn(['low', 'medium', 'high', 'critical']),
  body('alert.message').notEmpty(),
], validate, async (req, res) => {
  try {
    const { alert: alertData } = req.body;

    // Create alert
    const alert = new Alert({
      monitorId: req.monitorId,
      type: alertData.type,
      severity: alertData.severity,
      message: alertData.message,
      details: alertData.details || {},
    });

    await alert.save();

    // Publish alert event
    await redis.publish('alert:new', {
      monitorId: req.monitorId,
      alert: alert.toJSON(),
    });

    // Send notifications if enabled
    if (req.monitor?.settings?.alertsEnabled) {
      // Queue notification job
      await redis.publish('notification:queue', {
        type: 'alert',
        alertId: alert._id.toString(),
        monitorId: req.monitorId,
      });
    }

    logger.info(`Alert created: ${alertData.type} for monitor ${req.monitorId}`);

    res.status(201).json({
      success: true,
      message: 'Alert created',
      alert: {
        id: alert._id,
        type: alert.type,
        severity: alert.severity,
      },
    });
  } catch (error) {
    logger.error('Alert creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
    });
  }
});

// Get alerts
router.get('/', async (req, res) => {
  try {
    const {
      monitorId,
      type,
      severity,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const options = {};
    if (type) options.type = type;
    if (severity) options.severity = severity;
    if (status) options.status = status;
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const query = monitorId 
      ? Alert.findByMonitor(monitorId, options)
      : Alert.find(options);

    const total = await Alert.countDocuments(query.getQuery());

    const alerts = await query
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('acknowledgedBy', 'name email')
      .exec();

    res.json({
      success: true,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      alerts,
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
    });
  }
});

// Get active alerts
router.get('/active', async (req, res) => {
  try {
    const { monitorId } = req.query;

    const alerts = await Alert.findActive(monitorId)
      .populate('acknowledgedBy', 'name email');

    // Group by severity
    const grouped = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    alerts.forEach(alert => {
      grouped[alert.severity].push(alert);
    });

    res.json({
      success: true,
      total: alerts.length,
      alerts: grouped,
    });
  } catch (error) {
    logger.error('Error fetching active alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active alerts',
    });
  }
});

// Get specific alert
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('acknowledgedBy', 'name email')
      .populate('relatedAlerts');

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      alert,
    });
  } catch (error) {
    logger.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert',
    });
  }
});

// Acknowledge alert
router.put('/:id/acknowledge', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    if (alert.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Alert is not active',
      });
    }

    // For now, use a system user ID or null
    await alert.acknowledge(null);

    // Publish event
    await redis.publish('alert:acknowledged', {
      alertId: alert._id.toString(),
      monitorId: alert.monitorId,
    });

    res.json({
      success: true,
      message: 'Alert acknowledged',
      alert,
    });
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
    });
  }
});

// Resolve alert
router.put('/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    if (alert.status === 'resolved') {
      return res.status(400).json({
        success: false,
        error: 'Alert is already resolved',
      });
    }

    await alert.resolve(false);

    // Publish event
    await redis.publish('alert:resolved', {
      alertId: alert._id.toString(),
      monitorId: alert.monitorId,
    });

    res.json({
      success: true,
      message: 'Alert resolved',
      alert,
    });
  } catch (error) {
    logger.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
    });
  }
});

// Ignore alert
router.put('/:id/ignore', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    await alert.ignore();

    res.json({
      success: true,
      message: 'Alert ignored',
      alert,
    });
  } catch (error) {
    logger.error('Error ignoring alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ignore alert',
    });
  }
});

// Get alert statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { monitorId, days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const match = {
      createdAt: { $gte: startDate },
    };
    if (monitorId) match.monitorId = monitorId;

    const stats = await Alert.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            type: '$type',
            severity: '$severity',
            status: '$status',
          },
          count: { $sum: 1 },
          avgDuration: {
            $avg: {
              $cond: [
                { $ne: ['$resolvedAt', null] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null
              ]
            }
          },
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' },
          byType: {
            $push: {
              type: '$_id.type',
              count: '$count',
            }
          },
          bySeverity: {
            $push: {
              severity: '$_id.severity',
              count: '$count',
            }
          },
          byStatus: {
            $push: {
              status: '$_id.status',
              count: '$count',
            }
          },
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      byType: [],
      bySeverity: [],
      byStatus: [],
    };

    // Get trend data
    const trendData = await Alert.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            severity: '$severity',
          },
          count: { $sum: 1 },
        }
      },
      { $sort: { '_id.date': 1 } },
    ]);

    res.json({
      success: true,
      period: `${days} days`,
      stats: result,
      trend: trendData,
    });
  } catch (error) {
    logger.error('Error calculating alert stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate alert statistics',
    });
  }
});

module.exports = router; 