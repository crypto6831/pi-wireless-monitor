const express = require('express');
const { body, validationResult } = require('express-validator');
const Metric = require('../models/Metric');
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

// Submit metrics data
router.post('/', authenticateMonitor, [
  body('metrics').isObject().notEmpty(),
  body('metrics.system').optional().isObject(),
  body('metrics.network').optional().isObject(),
], validate, async (req, res) => {
  try {
    const { metrics, timestamp } = req.body;

    // Create metric document
    const metric = new Metric({
      monitorId: req.monitorId,
      timestamp: timestamp || new Date(),
      system: metrics.system || {},
      network: metrics.network || {},
    });

    await metric.save();

    // Check for alerts based on thresholds
    const alerts = metric.checkAlerts(req.monitor.settings.thresholds);
    
    if (alerts.length > 0) {
      // Create alerts
      for (const alertData of alerts) {
        await Alert.create({
          monitorId: req.monitorId,
          type: alertData.type,
          severity: alertData.severity,
          message: `${alertData.type.replace('_', ' ')} threshold exceeded`,
          details: {
            value: alertData.value,
            threshold: alertData.threshold,
          },
        });

        // Publish alert event
        await redis.publish('alert:threshold', {
          monitorId: req.monitorId,
          alert: alertData,
        });
      }
    }

    // Cache latest metrics
    await redis.setEx(
      `monitor:${req.monitorId}:metrics:latest`,
      metric.toJSON(),
      300 // 5 minutes TTL
    );

    // Update real-time metrics for dashboard
    await redis.publish('metrics:update', {
      monitorId: req.monitorId,
      metrics: metric.toJSON(),
    });

    logger.debug(`Metrics received from monitor ${req.monitorId}`);

    res.json({
      success: true,
      message: 'Metrics received',
      alerts: alerts.length,
    });
  } catch (error) {
    logger.error('Metrics processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process metrics',
    });
  }
});

// Get metrics
router.get('/', async (req, res) => {
  try {
    const {
      monitorId,
      startDate,
      endDate,
      aggregated,
      limit = 100,
      offset = 0,
    } = req.query;

    const query = {};
    const options = {};

    if (monitorId) query.monitorId = monitorId;
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    if (aggregated !== undefined) options.aggregated = aggregated === 'true';

    const metricsQuery = Metric.findByMonitor(monitorId || null, options);
    const total = await Metric.countDocuments(metricsQuery.getQuery());

    const metrics = await metricsQuery
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .exec();

    res.json({
      success: true,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      metrics,
    });
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
    });
  }
});

// Get latest metrics for a monitor
router.get('/monitor/:monitorId/latest', async (req, res) => {
  try {
    // Check cache first
    const cached = await redis.getJson(`monitor:${req.params.monitorId}:metrics:latest`);
    if (cached) {
      return res.json({
        success: true,
        metrics: cached,
        cached: true,
      });
    }

    // Get from database
    const metrics = await Metric.findOne({ monitorId: req.params.monitorId })
      .sort('-timestamp')
      .exec();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'No metrics found for this monitor',
      });
    }

    res.json({
      success: true,
      metrics,
      cached: false,
    });
  } catch (error) {
    logger.error('Error fetching latest metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest metrics',
    });
  }
});

// Get metrics history for charts
router.get('/monitor/:monitorId/history', async (req, res) => {
  try {
    const {
      period = '1h',
      metric = 'all',
    } = req.query;

    const now = new Date();
    let startDate;

    // Determine time range
    switch (period) {
      case '1h':
        startDate = new Date(now - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(now - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 60 * 60 * 1000);
    }

    // Get metrics
    const metrics = await Metric.find({
      monitorId: req.params.monitorId,
      timestamp: { $gte: startDate },
      aggregated: period === '30d' || period === '7d',
    })
    .sort('timestamp')
    .select('timestamp system network')
    .lean();

    // Format for charts
    const chartData = {
      labels: metrics.map(m => m.timestamp),
      datasets: {},
    };

    if (metric === 'all' || metric === 'cpu') {
      chartData.datasets.cpu = metrics.map(m => m.system?.cpuPercent || 0);
    }
    if (metric === 'all' || metric === 'memory') {
      chartData.datasets.memory = metrics.map(m => m.system?.memoryPercent || 0);
    }
    if (metric === 'all' || metric === 'temperature') {
      chartData.datasets.temperature = metrics.map(m => m.system?.temperature || 0);
    }
    if (metric === 'all' || metric === 'latency') {
      chartData.datasets.latency = metrics.map(m => m.network?.ping?.avg || 0);
    }
    if (metric === 'all' || metric === 'packetLoss') {
      chartData.datasets.packetLoss = metrics.map(m => m.network?.ping?.packetLoss || 0);
    }

    res.json({
      success: true,
      period,
      startDate,
      endDate: now,
      count: metrics.length,
      chartData,
    });
  } catch (error) {
    logger.error('Error fetching metrics history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics history',
    });
  }
});

// Aggregate metrics (for data retention)
router.post('/aggregate', async (req, res) => {
  try {
    const { monitorId, period = 'hour' } = req.body;

    if (!monitorId) {
      return res.status(400).json({
        success: false,
        error: 'Monitor ID required',
      });
    }

    const aggregated = await Metric.aggregate(monitorId, period);

    logger.info(`Aggregated ${aggregated.length} metric periods for monitor ${monitorId}`);

    res.json({
      success: true,
      message: 'Metrics aggregated',
      count: aggregated.length,
    });
  } catch (error) {
    logger.error('Metrics aggregation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to aggregate metrics',
    });
  }
});

// Get system health overview
router.get('/health/overview', async (req, res) => {
  try {
    const { monitorId } = req.query;

    // Get all monitors or specific one
    const monitorQuery = monitorId ? { monitorId } : {};
    
    // Get latest metrics for each monitor
    const pipeline = [
      { $match: monitorQuery },
      { $sort: { monitorId: 1, timestamp: -1 } },
      {
        $group: {
          _id: '$monitorId',
          latestMetric: { $first: '$$ROOT' },
        }
      },
      {
        $project: {
          monitorId: '$_id',
          timestamp: '$latestMetric.timestamp',
          cpu: '$latestMetric.system.cpuPercent',
          memory: '$latestMetric.system.memoryPercent',
          temperature: '$latestMetric.system.temperature',
          packetLoss: '$latestMetric.network.ping.packetLoss',
          latency: '$latestMetric.network.ping.avg',
        }
      }
    ];

    const healthData = await Metric.aggregate(pipeline);

    // Determine health status for each monitor
    const healthOverview = healthData.map(data => {
      let status = 'healthy';
      const issues = [];

      if (data.cpu > 80) {
        status = 'warning';
        issues.push('High CPU usage');
      }
      if (data.memory > 85) {
        status = 'warning';
        issues.push('High memory usage');
      }
      if (data.temperature > 75) {
        status = data.temperature > 80 ? 'critical' : 'warning';
        issues.push('High temperature');
      }
      if (data.packetLoss > 5) {
        status = data.packetLoss > 10 ? 'critical' : 'warning';
        issues.push('Packet loss detected');
      }

      return {
        ...data,
        status,
        issues,
      };
    });

    res.json({
      success: true,
      monitors: healthOverview.length,
      overview: healthOverview,
    });
  } catch (error) {
    logger.error('Error fetching health overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health overview',
    });
  }
});

module.exports = router; 