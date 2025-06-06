// MongoDB Initialization Script for Pi Wireless Monitor

// Switch to the pi-wireless-monitor database
db = db.getSiblingDB('pi-wireless-monitor');

// Create collections with validation schemas and indexes
print('Creating collections and indexes...');

// Monitors collection
db.createCollection('monitors', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['monitorId', 'name', 'location'],
            properties: {
                monitorId: {
                    bsonType: 'string',
                    description: 'Unique identifier for the monitor'
                },
                name: {
                    bsonType: 'string',
                    description: 'Human-readable name for the monitor'
                },
                location: {
                    bsonType: 'string',
                    description: 'Physical location of the monitor'
                }
            }
        }
    }
});

// Networks collection
db.createCollection('networks', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['ssid', 'bssid', 'monitorId'],
            properties: {
                ssid: {
                    bsonType: 'string',
                    description: 'Network SSID'
                },
                bssid: {
                    bsonType: 'string',
                    description: 'Network BSSID'
                },
                monitorId: {
                    bsonType: 'string',
                    description: 'ID of the monitor that detected this network'
                }
            }
        }
    }
});

// Metrics collection
db.createCollection('metrics', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['monitorId', 'timestamp'],
            properties: {
                monitorId: {
                    bsonType: 'string',
                    description: 'ID of the monitor'
                },
                timestamp: {
                    bsonType: 'date',
                    description: 'When the metric was recorded'
                },
                system: {
                    bsonType: 'object',
                    description: 'System metrics (CPU, memory, etc.)'
                },
                network: {
                    bsonType: 'object',
                    description: 'Network metrics (ping, bandwidth, etc.)'
                }
            }
        }
    }
});

// Alerts collection
db.createCollection('alerts', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['type', 'severity', 'message', 'timestamp'],
            properties: {
                type: {
                    bsonType: 'string',
                    description: 'Type of alert'
                },
                severity: {
                    bsonType: 'string',
                    enum: ['low', 'medium', 'high', 'critical'],
                    description: 'Alert severity level'
                },
                message: {
                    bsonType: 'string',
                    description: 'Alert message'
                },
                timestamp: {
                    bsonType: 'date',
                    description: 'When the alert was created'
                }
            }
        }
    }
});

// Create indexes for better performance
print('Creating indexes...');

// Monitors indexes
db.monitors.createIndex({ 'monitorId': 1 }, { unique: true });
db.monitors.createIndex({ 'location': 1 });
db.monitors.createIndex({ 'lastSeen': 1 });

// Networks indexes
db.networks.createIndex({ 'ssid': 1, 'bssid': 1 });
db.networks.createIndex({ 'monitorId': 1 });
db.networks.createIndex({ 'timestamp': 1 });
db.networks.createIndex({ 'signalStrength': 1 });

// Metrics indexes
db.metrics.createIndex({ 'monitorId': 1, 'timestamp': -1 });
db.metrics.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// Alerts indexes
db.alerts.createIndex({ 'monitorId': 1 });
db.alerts.createIndex({ 'type': 1 });
db.alerts.createIndex({ 'severity': 1 });
db.alerts.createIndex({ 'timestamp': -1 });
db.alerts.createIndex({ 'status': 1 });

// Create a user for the application
db.createUser({
    user: 'pi-monitor-app',
    pwd: 'secure-app-password',
    roles: [
        {
            role: 'readWrite',
            db: 'pi-wireless-monitor'
        }
    ]
});

print('MongoDB initialization completed successfully!');
print('Database: pi-wireless-monitor');
print('Collections created: monitors, networks, metrics, alerts');
print('Indexes created for optimal performance');
print('Application user created: pi-monitor-app'); 