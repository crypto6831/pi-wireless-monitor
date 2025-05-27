const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const logger = require('./utils/logger');
const { connectDB } = require('./db/connection');
const { connectRedis } = require('./db/redis');
const socketService = require('./services/socketService');

// Import routes
const monitorsRouter = require('./routes/monitors');
const networksRouter = require('./routes/networks');
const devicesRouter = require('./routes/devices');
const metricsRouter = require('./routes/metrics');
const alertsRouter = require('./routes/alerts');

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO (temporarily disabled for debugging)// socketService.initialize(server);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: config.api.rateLimitWindow,
  max: config.api.rateLimitMax,
  message: 'Too many requests from this IP',
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/monitors', monitorsRouter);
app.use('/api/networks', networksRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/alerts', alertsRouter);

// Socket.IO status endpoint
app.get('/api/socket/status', (req, res) => {
  const clients = socketService.getConnectedClients();
  const monitors = socketService.getConnectedMonitors();
  const dashboards = socketService.getConnectedDashboards();

  res.json({
    connected: clients.length,
    monitors: monitors.length,
    dashboards: dashboards.length,
    clients: config.nodeEnv === 'development' ? clients : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });
});

// Start server
async function startServer() {
  try {
    // Connect to databases
    await connectDB();
    
    // Try to connect to Redis, but don't fail if it's not available
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn('Redis connection failed, continuing without Redis:', error.message);
    }

    // Start listening
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  logger.info('Graceful shutdown initiated');
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections
  // MongoDB connection is handled in connection.js
  
  // Wait a bit for connections to close
  setTimeout(() => {
    logger.info('Forcing shutdown');
    process.exit(0);
  }, 10000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer(); 