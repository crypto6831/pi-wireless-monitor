const socketIO = require('socket.io');
const config = require('../../config/config');
const logger = require('../utils/logger');
const redis = require('../db/redis');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
  }

  initialize(server) {
    this.io = socketIO(server, config.socketIO);

    // Middleware for authentication
    this.io.use(async (socket, next) => {
      try {
        const { monitorId, apiKey, clientType } = socket.handshake.auth;
        
        // Store client info
        socket.clientType = clientType || 'dashboard';
        socket.monitorId = monitorId;
        
        // TODO: Add proper authentication here
        
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Subscribe to Redis events
    this.subscribeToRedisEvents();

    logger.info('Socket.IO service initialized');
  }

  handleConnection(socket) {
    const clientId = socket.id;
    const clientInfo = {
      id: clientId,
      type: socket.clientType,
      monitorId: socket.monitorId,
      connectedAt: new Date(),
    };

    this.connectedClients.set(clientId, clientInfo);
    logger.info(`Client connected: ${clientId} (${socket.clientType})`);

    // Join rooms based on client type
    if (socket.clientType === 'monitor' && socket.monitorId) {
      socket.join(`monitor:${socket.monitorId}`);
      socket.join('monitors');
    } else if (socket.clientType === 'dashboard') {
      socket.join('dashboards');
    }

    // Send initial data
    this.sendInitialData(socket);

    // Handle events
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  handleDisconnection(socket) {
    const clientId = socket.id;
    this.connectedClients.delete(clientId);
    logger.info(`Client disconnected: ${clientId}`);

    // Notify if monitor disconnected
    if (socket.clientType === 'monitor' && socket.monitorId) {
      this.io.to('dashboards').emit('monitor:disconnected', {
        monitorId: socket.monitorId,
        timestamp: new Date(),
      });
    }
  }

  setupEventHandlers(socket) {
    // Monitor events
    if (socket.clientType === 'monitor') {
      // Real-time data updates
      socket.on('data:networks', (data) => {
        this.io.to('dashboards').emit('networks:update', {
          monitorId: socket.monitorId,
          data,
          timestamp: new Date(),
        });
      });

      socket.on('data:metrics', (data) => {
        this.io.to('dashboards').emit('metrics:update', {
          monitorId: socket.monitorId,
          data,
          timestamp: new Date(),
        });
      });

      socket.on('data:alert', (data) => {
        this.io.to('dashboards').emit('alert:new', {
          monitorId: socket.monitorId,
          alert: data,
          timestamp: new Date(),
        });
      });
    }

    // Dashboard events
    if (socket.clientType === 'dashboard') {
      // Subscribe to specific monitor updates
      socket.on('monitor:subscribe', (monitorId) => {
        socket.join(`monitor:${monitorId}:updates`);
        logger.debug(`Dashboard subscribed to monitor ${monitorId}`);
      });

      socket.on('monitor:unsubscribe', (monitorId) => {
        socket.leave(`monitor:${monitorId}:updates`);
        logger.debug(`Dashboard unsubscribed from monitor ${monitorId}`);
      });

      // Command to monitor
      socket.on('monitor:command', async (data) => {
        const { monitorId, command, params } = data;
        
        // Send command to specific monitor
        this.io.to(`monitor:${monitorId}`).emit('command', {
          command,
          params,
          timestamp: new Date(),
        });

        // Also publish to Redis for offline monitors
        await redis.publish('monitor:command', {
          monitorId,
          command,
          params,
        });
      });
    }

    // Common events
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });
  }

  async sendInitialData(socket) {
    try {
      if (socket.clientType === 'dashboard') {
        // Send list of active monitors
        const monitors = await this.getActiveMonitors();
        socket.emit('monitors:list', monitors);

        // Send recent alerts
        const alerts = await this.getRecentAlerts();
        socket.emit('alerts:recent', alerts);
      }
    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  async subscribeToRedisEvents() {
    try {
      // Check if Redis is available
      if (!redis.isConnected()) {
        logger.warn('Redis not connected, skipping event subscriptions');
        return;
      }

      // Subscribe to monitor events
      await redis.subscribe('monitor:heartbeat', (data) => {
        this.io.to('dashboards').emit('monitor:heartbeat', data);
      });

      await redis.subscribe('network:scan', (data) => {
        this.io.to('dashboards').emit('networks:scan:complete', data);
        this.io.to(`monitor:${data.monitorId}:updates`).emit('networks:update', data);
      });

      await redis.subscribe('metrics:update', (data) => {
        this.io.to(`monitor:${data.monitorId}:updates`).emit('metrics:update', data);
      });

      await redis.subscribe('alert:new', (data) => {
        this.io.to('dashboards').emit('alert:new', data);
        this.io.to(`monitor:${data.monitorId}:updates`).emit('alert:new', data);
      });

      await redis.subscribe('alert:threshold', (data) => {
        this.io.to('dashboards').emit('alert:threshold', data);
      });

      logger.info('Subscribed to Redis events');
    } catch (error) {
      logger.warn('Redis subscription failed, continuing without Redis events:', error.message);
    }
  }

  // Helper methods
  async getActiveMonitors() {
    try {
      // Get from Redis cache if available
      if (redis.isConnected()) {
        const cached = await redis.getJson('monitors:active');
        if (cached) return cached;
      }
      // TODO: Get from database
      return [];
    } catch (error) {
      logger.error('Error getting active monitors:', error);
      return [];
    }
  }

  async getRecentAlerts() {
    try {
      // Get from Redis cache if available
      if (redis.isConnected()) {
        const cached = await redis.getJson('alerts:recent');
        if (cached) return cached;
      }
      // TODO: Get from database
      return [];
    } catch (error) {
      logger.error('Error getting recent alerts:', error);
      return [];
    }
  }

  // Public methods
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  sendToMonitor(monitorId, event, data) {
    this.io.to(`monitor:${monitorId}`).emit(event, data);
  }

  sendToDashboards(event, data) {
    this.io.to('dashboards').emit(event, data);
  }

  getConnectedClients() {
    return Array.from(this.connectedClients.values());
  }

  getConnectedMonitors() {
    return this.getConnectedClients().filter(client => client.type === 'monitor');
  }

  getConnectedDashboards() {
    return this.getConnectedClients().filter(client => client.type === 'dashboard');
  }
}

module.exports = new SocketService(); 