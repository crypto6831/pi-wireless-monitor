const Activity = require('../models/Activity');
const logger = require('../utils/logger');

class ActivityService {
  // Create activity log entry
  static async log(type, title, description, options = {}) {
    try {
      const activity = await Activity.createActivity({
        type,
        title,
        description,
        monitorId: options.monitorId || null,
        networkId: options.networkId || null,
        alertId: options.alertId || null,
        metadata: options.metadata || {},
        severity: options.severity || 'info'
      });

      logger.info(`Activity logged: ${type} - ${title}`);
      return activity;
    } catch (error) {
      logger.error('Failed to log activity:', error);
      // Don't throw error to avoid breaking main functionality
      return null;
    }
  }

  // Monitor-related activities
  static async logMonitorConnected(monitor) {
    return this.log(
      'monitor_connected',
      `Monitor "${monitor.name}" connected`,
      `Monitor ${monitor.monitor_id} has come online and is sending data`,
      {
        monitorId: monitor._id,
        severity: 'success',
        metadata: {
          monitor_id: monitor.monitor_id,
          location: monitor.location,
          ip: monitor.lastSeen?.ip
        }
      }
    );
  }

  static async logMonitorDisconnected(monitor) {
    return this.log(
      'monitor_disconnected',
      `Monitor "${monitor.name}" disconnected`,
      `Monitor ${monitor.monitor_id} has gone offline`,
      {
        monitorId: monitor._id,
        severity: 'warning',
        metadata: {
          monitor_id: monitor.monitor_id,
          location: monitor.location,
          lastSeen: monitor.lastSeen
        }
      }
    );
  }

  static async logMonitorRegistered(monitor) {
    return this.log(
      'monitor_connected',
      `New monitor "${monitor.name}" registered`,
      `Monitor ${monitor.monitor_id} has been registered and configured`,
      {
        monitorId: monitor._id,
        severity: 'success',
        metadata: {
          monitor_id: monitor.monitor_id,
          location: monitor.location,
          capabilities: monitor.capabilities
        }
      }
    );
  }

  // Network-related activities
  static async logNetworkDiscovered(network, monitor) {
    return this.log(
      'network_discovered',
      `New network "${network.ssid}" discovered`,
      `WiFi network "${network.ssid}" was detected by monitor ${monitor?.name || 'Unknown'}`,
      {
        monitorId: monitor?._id,
        networkId: network._id,
        severity: 'info',
        metadata: {
          ssid: network.ssid,
          bssid: network.bssid,
          channel: network.channel,
          frequency: network.frequency
        }
      }
    );
  }

  static async logNetworkLost(network, monitor) {
    return this.log(
      'network_lost',
      `Network "${network.ssid}" lost`,
      `WiFi network "${network.ssid}" is no longer detected`,
      {
        monitorId: monitor?._id,
        networkId: network._id,
        severity: 'warning',
        metadata: {
          ssid: network.ssid,
          bssid: network.bssid,
          lastSeen: network.lastSeen
        }
      }
    );
  }

  // Alert-related activities
  static async logAlertTriggered(alert, monitor) {
    return this.log(
      'alert_triggered',
      `Alert: ${alert.title}`,
      alert.description || `Alert triggered by monitor ${monitor?.name || 'System'}`,
      {
        monitorId: monitor?._id,
        alertId: alert._id,
        severity: alert.level === 'critical' ? 'error' : 'warning',
        metadata: {
          level: alert.level,
          category: alert.category,
          source: alert.source
        }
      }
    );
  }

  static async logAlertResolved(alert, monitor) {
    return this.log(
      'alert_resolved',
      `Alert resolved: ${alert.title}`,
      `Alert has been resolved`,
      {
        monitorId: monitor?._id,
        alertId: alert._id,
        severity: 'success',
        metadata: {
          level: alert.level,
          category: alert.category,
          resolvedAt: new Date()
        }
      }
    );
  }

  // Device-related activities
  static async logDeviceConnected(device, network, monitor) {
    return this.log(
      'device_connected',
      `Device connected to "${network.ssid}"`,
      `Device ${device.mac} connected to network`,
      {
        monitorId: monitor?._id,
        networkId: network._id,
        severity: 'info',
        metadata: {
          deviceMac: device.mac,
          deviceName: device.name,
          ssid: network.ssid,
          signalStrength: device.signal
        }
      }
    );
  }

  static async logDeviceDisconnected(device, network, monitor) {
    return this.log(
      'device_disconnected',
      `Device disconnected from "${network.ssid}"`,
      `Device ${device.mac} disconnected from network`,
      {
        monitorId: monitor?._id,
        networkId: network._id,
        severity: 'info',
        metadata: {
          deviceMac: device.mac,
          deviceName: device.name,
          ssid: network.ssid,
          lastSeen: device.lastSeen
        }
      }
    );
  }

  // System-related activities
  static async logSystemStartup() {
    return this.log(
      'system_startup',
      'System started',
      'Pi Wireless Monitor system has started up',
      {
        severity: 'success',
        metadata: {
          timestamp: new Date(),
          version: process.env.npm_package_version
        }
      }
    );
  }

  static async logSystemShutdown() {
    return this.log(
      'system_shutdown',
      'System shutdown',
      'Pi Wireless Monitor system is shutting down',
      {
        severity: 'warning',
        metadata: {
          timestamp: new Date()
        }
      }
    );
  }

  // Coverage-related activities
  static async logCoverageChanged(monitor, action) {
    return this.log(
      'coverage_changed',
      `Coverage ${action} for "${monitor.name}"`,
      `Monitor coverage area has been ${action}`,
      {
        monitorId: monitor._id,
        severity: 'info',
        metadata: {
          action,
          monitor_id: monitor.monitor_id,
          location: monitor.location
        }
      }
    );
  }

  // Get activity statistics
  static async getStats() {
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

      return {
        total: totalActivities,
        last24Hours: recentActivities,
        byType: stats
      };
    } catch (error) {
      logger.error('Failed to get activity stats:', error);
      return null;
    }
  }

  // Create some initial sample activities
  static async createSampleActivities() {
    try {
      const sampleActivities = [
        {
          type: 'system_startup',
          title: 'System started',
          description: 'Pi Wireless Monitor system has started up',
          severity: 'success',
          timestamp: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        },
        {
          type: 'monitor_connected',
          title: 'Monitor "Pi-Monitor-01" connected',
          description: 'Monitor has come online and is sending data',
          severity: 'success',
          timestamp: new Date(Date.now() - 45 * 60 * 1000) // 45 min ago
        },
        {
          type: 'network_discovered',
          title: 'New network "SmartHome" discovered',
          description: 'WiFi network "SmartHome" was detected',
          severity: 'info',
          timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
        },
        {
          type: 'device_connected',
          title: 'Device connected to "SmartHome"',
          description: 'New device detected on network',
          severity: 'info',
          timestamp: new Date(Date.now() - 15 * 60 * 1000) // 15 min ago
        }
      ];

      for (const activity of sampleActivities) {
        const existingActivity = await Activity.findOne({
          type: activity.type,
          title: activity.title
        });

        if (!existingActivity) {
          await Activity.createActivity(activity);
          logger.info(`Created sample activity: ${activity.title}`);
        }
      }

      logger.info('Sample activities created successfully');
    } catch (error) {
      logger.error('Failed to create sample activities:', error);
    }
  }
}

module.exports = ActivityService;