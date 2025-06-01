const express = require('express');
const router = express.Router();
const ServiceMonitor = require('../models/ServiceMonitor');
const Monitor = require('../models/Monitor');
const logger = require('../utils/logger');

// Get all service monitors for a specific monitor
router.get('/monitor/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    
    // Verify monitor exists
    const monitor = await Monitor.findByMonitorId(monitorId);
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    const serviceMonitors = await ServiceMonitor.find({ monitorId }).sort({ createdAt: -1 });
    res.json(serviceMonitors);
  } catch (error) {
    logger.error('Error fetching service monitors:', error);
    res.status(500).json({ error: 'Failed to fetch service monitors' });
  }
});

// Get all service monitors (admin view)
router.get('/', async (req, res) => {
  try {
    const { enabled, anomalous } = req.query;
    
    let query = {};
    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }
    if (anomalous === 'true') {
      query['cusumState.anomalyDetected'] = true;
    }
    
    const serviceMonitors = await ServiceMonitor.find(query)
      .sort({ monitorId: 1, createdAt: -1 });
    
    res.json(serviceMonitors);
  } catch (error) {
    logger.error('Error fetching all service monitors:', error);
    res.status(500).json({ error: 'Failed to fetch service monitors' });
  }
});

// Get a specific service monitor
router.get('/:id', async (req, res) => {
  try {
    const serviceMonitor = await ServiceMonitor.findById(req.params.id);
    if (!serviceMonitor) {
      return res.status(404).json({ error: 'Service monitor not found' });
    }
    res.json(serviceMonitor);
  } catch (error) {
    logger.error('Error fetching service monitor:', error);
    res.status(500).json({ error: 'Failed to fetch service monitor' });
  }
});

// Create a new service monitor
router.post('/', async (req, res) => {
  try {
    const {
      monitorId,
      serviceName,
      target,
      type,
      port,
      interval,
      timeout,
      packetCount,
      cusumConfig,
      thresholds,
    } = req.body;
    
    // Verify monitor exists
    const monitor = await Monitor.findByMonitorId(monitorId);
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Validate required fields
    if (!serviceName || !target) {
      return res.status(400).json({ error: 'Service name and target are required' });
    }
    
    // Create service monitor
    const serviceMonitor = new ServiceMonitor({
      monitorId,
      serviceName,
      target,
      type: type || 'ping',
      port,
      interval: interval || 60,
      timeout: timeout || 5,
      packetCount: packetCount || 4,
      cusumConfig: cusumConfig || undefined,
      thresholds: thresholds || undefined,
    });
    
    await serviceMonitor.save();
    
    logger.info(`Service monitor created: ${serviceMonitor.displayName} for monitor ${monitorId}`);
    res.status(201).json(serviceMonitor);
  } catch (error) {
    logger.error('Error creating service monitor:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create service monitor' });
  }
});

// Update a service monitor
router.put('/:id', async (req, res) => {
  try {
    const {
      serviceName,
      target,
      type,
      port,
      enabled,
      interval,
      timeout,
      packetCount,
      cusumConfig,
      thresholds,
    } = req.body;
    
    const serviceMonitor = await ServiceMonitor.findById(req.params.id);
    if (!serviceMonitor) {
      return res.status(404).json({ error: 'Service monitor not found' });
    }
    
    // Update fields
    if (serviceName !== undefined) serviceMonitor.serviceName = serviceName;
    if (target !== undefined) serviceMonitor.target = target;
    if (type !== undefined) serviceMonitor.type = type;
    if (port !== undefined) serviceMonitor.port = port;
    if (enabled !== undefined) serviceMonitor.enabled = enabled;
    if (interval !== undefined) serviceMonitor.interval = interval;
    if (timeout !== undefined) serviceMonitor.timeout = timeout;
    if (packetCount !== undefined) serviceMonitor.packetCount = packetCount;
    if (cusumConfig !== undefined) {
      serviceMonitor.cusumConfig = { ...serviceMonitor.cusumConfig.toObject(), ...cusumConfig };
    }
    if (thresholds !== undefined) {
      serviceMonitor.thresholds = { ...serviceMonitor.thresholds.toObject(), ...thresholds };
    }
    
    await serviceMonitor.save();
    
    logger.info(`Service monitor updated: ${serviceMonitor.displayName}`);
    res.json(serviceMonitor);
  } catch (error) {
    logger.error('Error updating service monitor:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update service monitor' });
  }
});

// Delete a service monitor
router.delete('/:id', async (req, res) => {
  try {
    const serviceMonitor = await ServiceMonitor.findById(req.params.id);
    if (!serviceMonitor) {
      return res.status(404).json({ error: 'Service monitor not found' });
    }
    
    await serviceMonitor.deleteOne();
    
    logger.info(`Service monitor deleted: ${serviceMonitor.displayName}`);
    res.json({ message: 'Service monitor deleted successfully' });
  } catch (error) {
    logger.error('Error deleting service monitor:', error);
    res.status(500).json({ error: 'Failed to delete service monitor' });
  }
});

// Update service check result
router.put('/:id/check', async (req, res) => {
  try {
    const serviceMonitor = await ServiceMonitor.findById(req.params.id);
    if (!serviceMonitor) {
      return res.status(404).json({ error: 'Service monitor not found' });
    }
    
    const checkResult = req.body;
    await serviceMonitor.updateLastCheck(checkResult);
    
    // Emit real-time update via Socket.IO
    const socketService = require('../services/socketService');
    if (socketService.io) {
      socketService.io.to(`monitor:${serviceMonitor.monitorId}`).emit('service-check-update', {
        serviceMonitorId: serviceMonitor._id,
        checkResult,
        cusumState: serviceMonitor.cusumState,
      });
    }
    
    res.json({ message: 'Check result recorded', serviceMonitor });
  } catch (error) {
    logger.error('Error updating check result:', error);
    res.status(500).json({ error: 'Failed to update check result' });
  }
});

// Reset CUSUM state for a service monitor
router.post('/:id/reset-cusum', async (req, res) => {
  try {
    const serviceMonitor = await ServiceMonitor.findById(req.params.id);
    if (!serviceMonitor) {
      return res.status(404).json({ error: 'Service monitor not found' });
    }
    
    serviceMonitor.cusumState = {
      upperSum: 0,
      lowerSum: 0,
      lastReset: new Date(),
      anomalyDetected: false,
      anomalyStartTime: null,
    };
    
    await serviceMonitor.save();
    
    logger.info(`CUSUM state reset for: ${serviceMonitor.displayName}`);
    res.json({ message: 'CUSUM state reset successfully', serviceMonitor });
  } catch (error) {
    logger.error('Error resetting CUSUM state:', error);
    res.status(500).json({ error: 'Failed to reset CUSUM state' });
  }
});

// Bulk enable/disable service monitors
router.post('/bulk/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { ids } = req.body;
    
    if (!['enable', 'disable'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use "enable" or "disable"' });
    }
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    
    const enabled = action === 'enable';
    const result = await ServiceMonitor.updateMany(
      { _id: { $in: ids } },
      { enabled }
    );
    
    logger.info(`Bulk ${action} service monitors: ${result.modifiedCount} updated`);
    res.json({ 
      message: `Successfully ${action}d ${result.modifiedCount} service monitors`,
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    logger.error('Error in bulk operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

module.exports = router;