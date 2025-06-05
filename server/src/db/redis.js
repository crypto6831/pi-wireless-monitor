const redis = require('redis');
const config = require('../../config/config');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;

const connectRedis = async () => {
  if (isConnected && client) {
    logger.info('Redis is already connected');
    return client;
  }

  try {
    // Create Redis client
    client = redis.createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db,
    });

    // Handle connection events
    client.on('error', (err) => {
      logger.error('Redis error:', err);
      isConnected = false;
    });

    client.on('connect', () => {
      logger.info('Redis connecting...');
    });

    client.on('ready', () => {
      logger.info('Redis connected and ready');
      isConnected = true;
    });

    client.on('end', () => {
      logger.warn('Redis connection closed');
      isConnected = false;
    });

    client.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // Connect to Redis
    await client.connect();

    return client;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

// Helper functions for common Redis operations
const redisHelpers = {
  // Set with expiration
  setEx: async (key, value, ttl = 3600) => {
    if (!client || !isConnected) {
      throw new Error('Redis not connected');
    }
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
    return await client.setEx(key, ttl, stringValue);
  },

  // Get and parse JSON
  getJson: async (key) => {
    if (!client || !isConnected) {
      throw new Error('Redis not connected');
    }
    const value = await client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },

  // Delete key
  del: async (key) => {
    if (!client || !isConnected) {
      throw new Error('Redis not connected');
    }
    return await client.del(key);
  },

  // Check if key exists
  exists: async (key) => {
    if (!client || !isConnected) {
      throw new Error('Redis not connected');
    }
    return await client.exists(key);
  },

  // Get all keys matching pattern
  keys: async (pattern) => {
    if (!client || !isConnected) {
      throw new Error('Redis not connected');
    }
    return await client.keys(pattern);
  },

  // Publish to channel
  publish: async (channel, message) => {
    if (!client || !isConnected) {
      throw new Error('Redis not connected');
    }
    const stringMessage = typeof message === 'object' ? JSON.stringify(message) : message;
    return await client.publish(channel, stringMessage);
  },

  // Subscribe to channel
  subscribe: async (channel, callback) => {
    if (!client || !isConnected) {
      throw new Error('Redis not connected');
    }
    const subscriber = client.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(channel, (message) => {
      try {
        const parsed = JSON.parse(message);
        callback(parsed);
      } catch {
        callback(message);
      }
    });
    return subscriber;
  },
};

module.exports = {
  connectRedis,
  getClient: () => client,
  isConnected: () => isConnected,
  ...redisHelpers,
}; 