import { io } from 'socket.io-client';
import { store } from '../store/store';
import { addNotification } from '../store/slices/uiSlice';
import { fetchAlerts } from '../store/slices/alertsSlice';

class AlertService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    if (this.socket) {
      return;
    }

    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      auth: {
        clientType: 'dashboard'
      },
      autoConnect: true
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Alert service connected to server');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('Alert service disconnected from server');
    });

    // Listen for new alerts
    this.socket.on('alert:new', (data) => {
      this.handleNewAlert(data);
    });

    // Listen for resolved alerts
    this.socket.on('alert:resolved', (data) => {
      this.handleResolvedAlert(data);
    });

    // Listen for incident-related events
    this.socket.on('incident:new', (data) => {
      this.handleNewIncident(data);
    });

    this.socket.on('incident:resolved', (data) => {
      this.handleResolvedIncident(data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  handleNewAlert(data) {
    const { alert, monitorId } = data;
    
    // Create notification based on alert type and severity
    const notificationConfig = this.getNotificationConfig(alert);
    
    store.dispatch(addNotification({
      id: `alert-${alert._id}`,
      type: notificationConfig.type,
      message: notificationConfig.message,
      timestamp: new Date().toISOString()
    }));

    // Refresh alerts list
    store.dispatch(fetchAlerts());

    // Log the alert
    console.log('New alert received:', alert);
  }

  handleResolvedAlert(data) {
    const { alert, monitorId } = data;
    
    // Show resolution notification for critical/high alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      store.dispatch(addNotification({
        id: `alert-resolved-${alert._id}`,
        type: 'success',
        message: `Alert resolved: ${alert.message}`,
        timestamp: new Date().toISOString()
      }));
    }

    // Refresh alerts list
    store.dispatch(fetchAlerts());

    console.log('Alert resolved:', alert);
  }

  handleNewIncident(data) {
    const { incident, monitorId } = data;
    
    // Show incident notification
    const incidentMessages = {
      'disconnection': `🔴 WiFi disconnected from "${incident.ssid}"`,
      'signal_drop': `📉 Signal strength dropped on "${incident.ssid}"`,
      'timeout': `⏰ Connection timeout on "${incident.ssid}"`,
      'reconnection': `🟢 Reconnected to "${incident.ssid}"`
    };

    const message = incidentMessages[incident.incidentType] || 
                   `Incident detected on "${incident.ssid}": ${incident.incidentType}`;

    const notificationType = incident.incidentType === 'disconnection' ? 'error' : 
                           incident.incidentType === 'reconnection' ? 'success' : 'warning';

    store.dispatch(addNotification({
      id: `incident-${incident._id}`,
      type: notificationType,
      message,
      timestamp: new Date().toISOString()
    }));

    console.log('New incident:', incident);
  }

  handleResolvedIncident(data) {
    const { incident, monitorId } = data;
    
    // Show resolution notification
    const duration = incident.duration ? this.formatDuration(incident.duration) : 'unknown duration';
    
    store.dispatch(addNotification({
      id: `incident-resolved-${incident._id}`,
      type: 'info',
      message: `✅ Incident resolved on "${incident.ssid}" after ${duration}`,
      timestamp: new Date().toISOString()
    }));

    console.log('Incident resolved:', incident);
  }

  getNotificationConfig(alert) {
    const severityTypeMap = {
      'critical': 'error',
      'high': 'error',
      'medium': 'warning',
      'low': 'info'
    };

    const alertTypeIcons = {
      'ssid_disconnection': '🔴',
      'ssid_signal_drop': '📉',
      'ssid_reconnection': '🟢',
      'ssid_timeout': '⏰',
      'weak_signal': '📶',
      'monitor_offline': '🔴',
      'network_lost': '🌐'
    };

    const icon = alertTypeIcons[alert.type] || '⚠️';
    
    return {
      type: severityTypeMap[alert.severity] || 'info',
      message: `${icon} ${alert.message}`
    };
  }

  formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  isConnected() {
    return this.connected;
  }
}

// Create singleton instance
const alertService = new AlertService();

export default alertService;