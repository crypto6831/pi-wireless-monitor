const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { optionalAuth } = require('../middleware/auth');

// Get recent activities
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activities = await Activity.getRecent(limit);
    
    // Add timeAgo virtual for each activity
    const activitiesWithTimeAgo = activities.map(activity => ({
      ...activity,
      timeAgo: new Activity(activity).timeAgo
    }));
    
    res.json({
      success: true,
      activities: activitiesWithTimeAgo,
      total: activitiesWithTimeAgo.length
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
      error: error.message
    });
  }
});

// Get activities by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const activities = await Activity.find({ type })
      .populate('monitorId', 'name')
      .populate('networkId', 'ssid')
      .populate('alertId', 'title')
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    const activitiesWithTimeAgo = activities.map(activity => ({
      ...activity,
      timeAgo: new Activity(activity).timeAgo
    }));
    
    res.json({
      success: true,
      activities: activitiesWithTimeAgo,
      total: activitiesWithTimeAgo.length
    });
  } catch (error) {
    console.error('Error fetching activities by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities by type',
      error: error.message
    });
  }
});

// Get activities for a specific monitor
router.get('/monitor/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const activities = await Activity.find({ monitorId })
      .populate('monitorId', 'name')
      .populate('networkId', 'ssid')
      .populate('alertId', 'title')
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    const activitiesWithTimeAgo = activities.map(activity => ({
      ...activity,
      timeAgo: new Activity(activity).timeAgo
    }));
    
    res.json({
      success: true,
      activities: activitiesWithTimeAgo,
      total: activitiesWithTimeAgo.length
    });
  } catch (error) {
    console.error('Error fetching monitor activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitor activities',
      error: error.message
    });
  }
});

// Create new activity (protected route)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { type, title, description, monitorId, networkId, alertId, metadata, severity } = req.body;
    
    const activity = await Activity.createActivity({
      type,
      title,
      description,
      monitorId,
      networkId,
      alertId,
      metadata,
      severity
    });
    
    res.status(201).json({
      success: true,
      activity,
      message: 'Activity created successfully'
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity',
      error: error.message
    });
  }
});

// Get activity statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Activity.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const totalActivities = await Activity.countDocuments();
    const recentActivities = await Activity.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    res.json({
      success: true,
      stats: {
        total: totalActivities,
        last24Hours: recentActivities,
        byType: stats
      }
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics',
      error: error.message
    });
  }
});

module.exports = router;