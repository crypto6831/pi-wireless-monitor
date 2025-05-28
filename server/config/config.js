const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

module.exports = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pi-wireless-monitor',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // API Security
  api: {
    keyHeader: 'X-API-Key',
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 500, // requests per window (increased from 100)
    bcryptRounds: 10,
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    credentials: true,
  },
  
  // Socket.IO Configuration
  socketIO: {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  },
  
  // Data Retention
  dataRetention: {
    networkData: 30, // days
    metrics: 90, // days
    alerts: 180, // days
    aggregationInterval: 3600, // seconds (1 hour)
  },
  
  // Monitoring Thresholds (defaults, can be overridden per monitor)
  thresholds: {
    signalStrength: {
      min: -80, // dBm
      warning: -70, // dBm
    },
    packetLoss: {
      warning: 5, // %
      critical: 10, // %
    },
    latency: {
      warning: 100, // ms
      critical: 500, // ms
    },
    temperature: {
      warning: 70, // °C
      critical: 80, // °C
    },
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      dirname: process.env.LOG_DIR || 'logs',
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }
  },
  
  // Email Configuration (for alerts)
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    },
    from: process.env.EMAIL_FROM || 'noreply@pi-monitor.local',
    adminEmail: process.env.ADMIN_EMAIL,
  }
}; 