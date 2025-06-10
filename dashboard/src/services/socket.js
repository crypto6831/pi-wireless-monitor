import io from 'socket.io-client';
import { store } from '../store/store';
import { updateMonitorStatus, setMonitors } from '../store/slices/monitorsSlice';
import { updateNetwork } from '../store/slices/networksSlice';
import { updateLatestMetrics } from '../store/slices/metricsSlice';
import { addAlert, updateAlert, setAlerts } from '../store/slices/alertsSlice';
import { setSocketConnected, addNotification } from '../store/slices/uiSlice';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(socketUrl, {
      auth: {
        clientType: 'dashboard',
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected');
      store.dispatch(setSocketConnected(true));
      store.dispatch(addNotification({
        type: 'success',
        message: 'Connected to server',
      }));
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      store.dispatch(setSocketConnected(false));
      store.dispatch(addNotification({
        type: 'warning',
        message: 'Disconnected from server',
      }));
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        store.dispatch(addNotification({
          type: 'error',
          message: 'Failed to connect to server',
        }));
      }
    });

    // Monitor events
    this.socket.on('monitors:list', (monitors) => {
      console.log('Received monitors list:', monitors);
      store.dispatch(setMonitors(monitors));
    });

    this.socket.on('monitor:heartbeat', (data) => {
      console.log('Monitor heartbeat:', data);
      store.dispatch(updateMonitorStatus({
        monitorId: data.monitorId,
        status: data.status || 'active',
      }));
    });

    this.socket.on('monitor:disconnected', (data) => {
      console.log('Monitor disconnected:', data);
      store.dispatch(updateMonitorStatus({
        monitorId: data.monitorId,
        status: 'inactive',
      }));
      store.dispatch(addNotification({
        type: 'warning',
        message: `Monitor ${data.monitorId} disconnected`,
      }));
    });

    // Network events
    this.socket.on('networks:update', (data) => {
      console.log('Networks update:', data);
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach(network => {
          store.dispatch(updateNetwork({ network }));
        });
      }
    });

    this.socket.on('networks:scan:complete', (data) => {
      console.log('Network scan complete:', data);
      store.dispatch(addNotification({
        type: 'info',
        message: `Network scan completed for ${data.monitorId}`,
      }));
    });

    // Metrics events
    this.socket.on('metrics:update', (data) => {
      console.log('Metrics update:', data);
      store.dispatch(updateLatestMetrics({
        monitorId: data.monitorId,
        metrics: data.metrics,
      }));
    });

    // Alert events
    this.socket.on('alert:new', (data) => {
      console.log('New alert:', data);
      store.dispatch(addAlert(data.alert));
      
      // Show notification for high/critical alerts
      if (['high', 'critical'].includes(data.alert.severity)) {
        store.dispatch(addNotification({
          type: 'error',
          message: data.alert.message,
          alert: true,
        }));
      }
    });

    this.socket.on('alert:threshold', (data) => {
      console.log('Threshold alert:', data);
      store.dispatch(addNotification({
        type: 'warning',
        message: `Threshold exceeded on ${data.monitorId}`,
      }));
    });

    this.socket.on('alert:acknowledged', (data) => {
      console.log('Alert acknowledged:', data);
    });

    this.socket.on('alert:resolved', (data) => {
      console.log('Alert resolved:', data);
    });

    // Recent alerts
    this.socket.on('alerts:recent', (alerts) => {
      console.log('Recent alerts:', alerts);
      store.dispatch(setAlerts(alerts));
    });
  }

  // Subscribe to monitor updates
  subscribeToMonitor(monitorId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('monitor:subscribe', monitorId);
    }
  }

  // Unsubscribe from monitor updates
  unsubscribeFromMonitor(monitorId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('monitor:unsubscribe', monitorId);
    }
  }

  // Send command to monitor
  sendCommand(monitorId, command, params = {}) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('monitor:command', {
        monitorId,
        command,
        params,
      });
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Check if connected
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService; 