const express = require('express');
const router = express.Router();
const SSIDIncident = require('../models/SSIDIncident');
const Alert = require('../models/Alert');
const { authenticateMonitor } = require('../middleware/auth');

// Helper function to create alert from incident
const createIncidentAlert = async (incident, monitorId) => {
  try {
    // Map incident types to alert types
    const alertTypeMap = {
      'disconnection': 'ssid_disconnection',
      'reconnection': 'ssid_reconnection',
      'signal_drop': 'ssid_signal_drop',
      'timeout': 'ssid_timeout'
    };

    // Determine alert severity based on incident severity and type
    let alertSeverity = incident.severity || 'medium';
    if (incident.incidentType === 'disconnection') {
      alertSeverity = 'high'; // Disconnections are always high priority
    }

    // Create alert message
    const alertMessages = {
      'disconnection': `WiFi disconnection detected on SSID "${incident.ssid}"`,
      'reconnection': `WiFi reconnected to SSID "${incident.ssid}"`,
      'signal_drop': `Signal strength dropped significantly on SSID "${incident.ssid}"`,
      'timeout': `Connection timeout detected on SSID "${incident.ssid}"`
    };

    // Create alert details
    const details = {
      incidentId: incident._id,
      ssid: incident.ssid,
      incidentType: incident.incidentType,
      threshold: incident.triggerCondition?.threshold,
      value: incident.triggerCondition?.signalStrength,
      previousValue: incident.triggerCondition?.previousSignalStrength,
      startTime: incident.startTime,
      metadata: incident.metadata
    };

    // Create the alert
    const alert = new Alert({
      monitorId,
      type: alertTypeMap[incident.incidentType] || 'custom',
      severity: alertSeverity,
      message: alertMessages[incident.incidentType] || `SSID incident: ${incident.incidentType}`,
      details,
      status: 'active',
      timestamp: new Date(),
      source: 'ssid_monitor'
    });

    await alert.save();
    return alert;

  } catch (error) {
    console.error('Error creating incident alert:', error);
    return null;
  }
};

// Helper function to resolve incident alert
const resolveIncidentAlert = async (incident, monitorId) => {
  try {
    // Find the related alert
    const alert = await Alert.findOne({
      monitorId,
      'details.incidentId': incident._id,
      status: 'active'
    });

    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolution = {
        duration: incident.duration,
        resolvedBy: 'auto_resolution',
        finalStatus: 'incident_resolved'
      };
      
      await alert.save();
      return alert;
    }

    return null;
  } catch (error) {
    console.error('Error resolving incident alert:', error);
    return null;
  }
};

// Get incidents for a specific monitor
router.get('/monitor/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { limit = 50, type, resolved, timeRange = '24h' } = req.query;

    // Build query
    const query = { monitorId };
    
    if (type) query.incidentType = type;
    if (resolved !== undefined) query.resolved = resolved === 'true';
    
    // Add time range filter
    if (timeRange) {
      const now = new Date();
      let startTime;
      
      switch (timeRange) {
        case '1h': startTime = new Date(now - 60 * 60 * 1000); break;
        case '6h': startTime = new Date(now - 6 * 60 * 60 * 1000); break;
        case '24h': startTime = new Date(now - 24 * 60 * 60 * 1000); break;
        case '7d': startTime = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': startTime = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      }
      
      if (startTime) query.startTime = { $gte: startTime };
    }

    const incidents = await SSIDIncident.find(query)
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: incidents,
      count: incidents.length
    });

  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incidents'
    });
  }
});

// Get incident statistics
router.get('/stats/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { timeRange = '24h' } = req.query;

    const stats = await SSIDIncident.getIncidentStats(monitorId, timeRange);
    const stabilityData = await SSIDIncident.calculateStabilityScore(monitorId, timeRange);

    res.json({
      success: true,
      data: {
        stability: stabilityData,
        breakdown: stats,
        timeRange
      }
    });

  } catch (error) {
    console.error('Error getting incident stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get incident statistics'
    });
  }
});

// Get active incidents
router.get('/active/:monitorId?', async (req, res) => {
  try {
    const { monitorId } = req.params;
    
    const incidents = await SSIDIncident.getActiveIncidents(monitorId);

    res.json({
      success: true,
      data: incidents,
      count: incidents.length
    });

  } catch (error) {
    console.error('Error fetching active incidents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active incidents'
    });
  }
});

// Create new incident (protected - for monitors only)
router.post('/', authenticateMonitor, async (req, res) => {
  try {
    const {
      ssid,
      incidentType,
      triggerCondition,
      metadata
    } = req.body;

    // Validate required fields
    if (!ssid || !incidentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ssid, incidentType'
      });
    }

    // Check for existing active incident of same type
    const existingIncident = await SSIDIncident.findOne({
      monitorId: req.monitor.monitorId,
      ssid,
      incidentType,
      resolved: false
    });

    if (existingIncident) {
      return res.status(409).json({
        success: false,
        error: 'Active incident of this type already exists',
        existingIncident: existingIncident._id
      });
    }

    // Create new incident
    const incident = new SSIDIncident({
      monitorId: req.monitor.monitorId,
      ssid,
      incidentType,
      startTime: new Date(),
      triggerCondition,
      metadata
    });

    // Calculate initial severity if we have duration info
    if (triggerCondition && triggerCondition.estimatedDuration) {
      incident.duration = triggerCondition.estimatedDuration;
      incident.severity = incident.calculateSeverity();
    }

    await incident.save();

    // Create corresponding alert
    const alert = await createIncidentAlert(incident, req.monitor.monitorId);

    // Emit real-time updates
    if (req.io) {
      req.io.emit('incident:new', {
        monitorId: req.monitor.monitorId,
        incident: incident.toObject()
      });

      // Emit alert notification if alert was created
      if (alert) {
        req.io.emit('alert:new', {
          monitorId: req.monitor.monitorId,
          alert: alert.toObject()
        });
      }
    }

    res.status(201).json({
      success: true,
      data: incident,
      message: 'Incident created successfully'
    });

  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create incident'
    });
  }
});

// Resolve an incident
router.patch('/:incidentId/resolve', authenticateMonitor, async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { metadata } = req.body;

    const incident = await SSIDIncident.findById(incidentId);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
    }

    // Verify ownership
    if (incident.monitorId !== req.monitor.monitorId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to resolve this incident'
      });
    }

    if (incident.resolved) {
      return res.status(400).json({
        success: false,
        error: 'Incident already resolved'
      });
    }

    // Add resolution metadata
    if (metadata) {
      incident.metadata = { ...incident.metadata, ...metadata };
    }

    // Resolve the incident
    await incident.resolve();

    // Update severity based on actual duration
    incident.severity = incident.calculateSeverity();
    await incident.save();

    // Resolve corresponding alert
    const resolvedAlert = await resolveIncidentAlert(incident, req.monitor.monitorId);

    // Emit real-time updates
    if (req.io) {
      req.io.emit('incident:resolved', {
        monitorId: req.monitor.monitorId,
        incident: incident.toObject()
      });

      // Emit alert resolution if alert was resolved
      if (resolvedAlert) {
        req.io.emit('alert:resolved', {
          monitorId: req.monitor.monitorId,
          alert: resolvedAlert.toObject()
        });
      }
    }

    res.json({
      success: true,
      data: incident,
      message: 'Incident resolved successfully'
    });

  } catch (error) {
    console.error('Error resolving incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve incident'
    });
  }
});

// Get incident timeline for charts
router.get('/timeline/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { timeRange = '24h', granularity = 'hour' } = req.query;

    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h': startTime = new Date(now - 60 * 60 * 1000); break;
      case '6h': startTime = new Date(now - 6 * 60 * 60 * 1000); break;
      case '24h': startTime = new Date(now - 24 * 60 * 60 * 1000); break;
      case '7d': startTime = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startTime = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      default: startTime = new Date(now - 24 * 60 * 60 * 1000);
    }

    // Aggregate incidents by time buckets
    const bucketSize = granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    const pipeline = [
      {
        $match: {
          monitorId,
          startTime: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: {
            $toDate: {
              $subtract: [
                { $toLong: '$startTime' },
                { $mod: [{ $toLong: '$startTime' }, bucketSize] }
              ]
            }
          },
          disconnections: {
            $sum: { $cond: [{ $eq: ['$incidentType', 'disconnection'] }, 1, 0] }
          },
          signalDrops: {
            $sum: { $cond: [{ $eq: ['$incidentType', 'signal_drop'] }, 1, 0] }
          },
          totalDuration: { $sum: '$duration' },
          incidents: { $push: '$$ROOT' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ];

    const timeline = await SSIDIncident.aggregate(pipeline);

    res.json({
      success: true,
      data: timeline,
      timeRange,
      granularity
    });

  } catch (error) {
    console.error('Error getting incident timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get incident timeline'
    });
  }
});

// Phase 3.3: Enhanced timeline with detailed incident markers
router.get('/timeline/:monitorId/detailed', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { timeRange = '24h', incidentTypes, severityFilter } = req.query;

    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h': startTime = new Date(now - 60 * 60 * 1000); break;
      case '6h': startTime = new Date(now - 6 * 60 * 60 * 1000); break;
      case '24h': startTime = new Date(now - 24 * 60 * 60 * 1000); break;
      case '7d': startTime = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startTime = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      default: startTime = new Date(now - 24 * 60 * 60 * 1000);
    }

    // Build query
    const query = {
      monitorId,
      startTime: { $gte: startTime }
    };

    // Add filters
    if (incidentTypes) {
      const types = incidentTypes.split(',');
      query.incidentType = { $in: types };
    }

    if (severityFilter && severityFilter !== 'all') {
      query.severity = severityFilter;
    }

    // Get detailed incidents with performance correlation
    const incidents = await SSIDIncident.find(query)
      .sort({ startTime: 1 })
      .lean();

    // Enhance incidents with additional context
    const enhancedIncidents = incidents.map(incident => ({
      ...incident,
      displayTime: incident.startTime,
      endTime: incident.endTime || (incident.resolved ? 
        new Date(incident.startTime.getTime() + (incident.duration || 0) * 1000) : 
        null),
      durationFormatted: incident.duration ? 
        formatDuration(incident.duration) : 'Ongoing',
      severityColor: getSeverityColor(incident.severity),
      typeIcon: getIncidentTypeIcon(incident.incidentType)
    }));

    // Calculate timeline metrics
    const metrics = {
      totalIncidents: enhancedIncidents.length,
      totalDowntime: enhancedIncidents.reduce((sum, inc) => sum + (inc.duration || 0), 0),
      avgDuration: enhancedIncidents.length > 0 ? 
        enhancedIncidents.reduce((sum, inc) => sum + (inc.duration || 0), 0) / enhancedIncidents.length : 0,
      incidentsByType: enhancedIncidents.reduce((acc, inc) => {
        acc[inc.incidentType] = (acc[inc.incidentType] || 0) + 1;
        return acc;
      }, {}),
      incidentsBySeverity: enhancedIncidents.reduce((acc, inc) => {
        acc[inc.severity || 'unknown'] = (acc[inc.severity || 'unknown'] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        incidents: enhancedIncidents,
        metrics,
        timeRange,
        filters: {
          incidentTypes: incidentTypes ? incidentTypes.split(',') : null,
          severityFilter
        }
      }
    });

  } catch (error) {
    console.error('Error getting detailed timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get detailed timeline'
    });
  }
});

// Phase 3.3: Incident comparison endpoint
router.get('/compare/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { 
      baselineStart, 
      baselineEnd, 
      comparisonStart, 
      comparisonEnd,
      metricType = 'incidents' 
    } = req.query;

    // Validate required parameters
    if (!baselineStart || !baselineEnd || !comparisonStart || !comparisonEnd) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: baselineStart, baselineEnd, comparisonStart, comparisonEnd'
      });
    }

    // Convert dates
    const baseline = {
      start: new Date(baselineStart),
      end: new Date(baselineEnd)
    };
    
    const comparison = {
      start: new Date(comparisonStart),
      end: new Date(comparisonEnd)
    };

    // Get incidents for both periods
    const [baselineIncidents, comparisonIncidents] = await Promise.all([
      SSIDIncident.find({
        monitorId,
        startTime: { $gte: baseline.start, $lte: baseline.end }
      }).lean(),
      SSIDIncident.find({
        monitorId,
        startTime: { $gte: comparison.start, $lte: comparison.end }
      }).lean()
    ]);

    // Calculate metrics for both periods
    const calculatePeriodMetrics = (incidents) => ({
      totalIncidents: incidents.length,
      totalDowntime: incidents.reduce((sum, inc) => sum + (inc.duration || 0), 0),
      avgDuration: incidents.length > 0 ? 
        incidents.reduce((sum, inc) => sum + (inc.duration || 0), 0) / incidents.length : 0,
      incidentsByType: incidents.reduce((acc, inc) => {
        acc[inc.incidentType] = (acc[inc.incidentType] || 0) + 1;
        return acc;
      }, {}),
      incidentsBySeverity: incidents.reduce((acc, inc) => {
        acc[inc.severity || 'unknown'] = (acc[inc.severity || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      disconnectionRate: incidents.filter(inc => inc.incidentType === 'disconnection').length,
      signalDropRate: incidents.filter(inc => inc.incidentType === 'signal_drop').length
    });

    const baselineMetrics = calculatePeriodMetrics(baselineIncidents);
    const comparisonMetrics = calculatePeriodMetrics(comparisonIncidents);

    // Calculate changes and trends
    const changes = {
      totalIncidents: {
        absolute: comparisonMetrics.totalIncidents - baselineMetrics.totalIncidents,
        percentage: baselineMetrics.totalIncidents > 0 ? 
          ((comparisonMetrics.totalIncidents - baselineMetrics.totalIncidents) / baselineMetrics.totalIncidents * 100) : 0
      },
      totalDowntime: {
        absolute: comparisonMetrics.totalDowntime - baselineMetrics.totalDowntime,
        percentage: baselineMetrics.totalDowntime > 0 ? 
          ((comparisonMetrics.totalDowntime - baselineMetrics.totalDowntime) / baselineMetrics.totalDowntime * 100) : 0
      },
      avgDuration: {
        absolute: comparisonMetrics.avgDuration - baselineMetrics.avgDuration,
        percentage: baselineMetrics.avgDuration > 0 ? 
          ((comparisonMetrics.avgDuration - baselineMetrics.avgDuration) / baselineMetrics.avgDuration * 100) : 0
      }
    };

    // Determine trends
    const getTrend = (change) => {
      if (Math.abs(change.percentage) < 5) return 'stable';
      return change.percentage > 0 ? 'increasing' : 'decreasing';
    };

    const trends = {
      incidents: getTrend(changes.totalIncidents),
      downtime: getTrend(changes.totalDowntime),
      duration: getTrend(changes.avgDuration)
    };

    res.json({
      success: true,
      data: {
        baseline: {
          period: { start: baseline.start, end: baseline.end },
          metrics: baselineMetrics,
          incidents: baselineIncidents
        },
        comparison: {
          period: { start: comparison.start, end: comparison.end },
          metrics: comparisonMetrics,
          incidents: comparisonIncidents
        },
        analysis: {
          changes,
          trends,
          summary: {
            overallTrend: trends.incidents,
            significantChanges: Object.entries(changes)
              .filter(([_, change]) => Math.abs(change.percentage) > 10)
              .map(([metric, change]) => ({
                metric,
                change: change.percentage,
                trend: change.percentage > 0 ? 'worse' : 'better'
              }))
          }
        }
      }
    });

  } catch (error) {
    console.error('Error comparing incidents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare incidents'
    });
  }
});

// Helper functions for enhanced timeline
function formatDuration(seconds) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function getSeverityColor(severity) {
  const colors = {
    'low': '#4CAF50',
    'medium': '#FF9800',
    'high': '#F44336',
    'critical': '#9C27B0'
  };
  return colors[severity] || '#757575';
}

function getIncidentTypeIcon(type) {
  const icons = {
    'disconnection': 'wifi_off',
    'reconnection': 'wifi',
    'signal_drop': 'signal_wifi_4_bar',
    'timeout': 'timer'
  };
  return icons[type] || 'error';
}

module.exports = router;