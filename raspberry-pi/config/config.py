"""
Configuration settings for Raspberry Pi Wireless Monitor
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Server Configuration
SERVER_URL = os.getenv('SERVER_URL', 'http://localhost:3001')
API_KEY = os.getenv('API_KEY', 'your-api-key-here')
API_TIMEOUT = int(os.getenv('API_TIMEOUT', '30'))

# Monitor Configuration
MONITOR_ID = os.getenv('MONITOR_ID', 'pi-monitor-001')
MONITOR_NAME = os.getenv('MONITOR_NAME', 'Main Office Pi')
MONITOR_LOCATION = os.getenv('MONITOR_LOCATION', 'Unknown')

# Network Interface Configuration
MONITOR_INTERFACE = os.getenv('MONITOR_INTERFACE', 'wlan0')
ENABLE_MONITOR_MODE = os.getenv('ENABLE_MONITOR_MODE', 'false').lower() == 'true'

# Scanning Configuration
SCAN_INTERVAL = int(os.getenv('SCAN_INTERVAL', '60'))  # seconds
DEEP_SCAN_INTERVAL = int(os.getenv('DEEP_SCAN_INTERVAL', '300'))  # seconds
MAX_SCAN_RETRIES = int(os.getenv('MAX_SCAN_RETRIES', '3'))

# Data Collection Configuration
COLLECT_CONNECTED_DEVICES = os.getenv('COLLECT_CONNECTED_DEVICES', 'true').lower() == 'true'
COLLECT_SIGNAL_STRENGTH = os.getenv('COLLECT_SIGNAL_STRENGTH', 'true').lower() == 'true'
COLLECT_CHANNEL_INFO = os.getenv('COLLECT_CHANNEL_INFO', 'true').lower() == 'true'
COLLECT_ENCRYPTION_INFO = os.getenv('COLLECT_ENCRYPTION_INFO', 'true').lower() == 'true'

# Performance Monitoring
PING_TEST_ENABLED = os.getenv('PING_TEST_ENABLED', 'true').lower() == 'true'
PING_TEST_HOST = os.getenv('PING_TEST_HOST', '8.8.8.8')
BANDWIDTH_TEST_ENABLED = os.getenv('BANDWIDTH_TEST_ENABLED', 'false').lower() == 'true'

# Data Storage
LOCAL_STORAGE_ENABLED = os.getenv('LOCAL_STORAGE_ENABLED', 'true').lower() == 'true'
LOCAL_STORAGE_PATH = os.getenv('LOCAL_STORAGE_PATH', '/var/lib/pi-monitor/data')
MAX_LOCAL_STORAGE_DAYS = int(os.getenv('MAX_LOCAL_STORAGE_DAYS', '7'))

# Logging Configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = os.getenv('LOG_FILE', '/var/log/pi-monitor/monitor.log')
LOG_MAX_SIZE = int(os.getenv('LOG_MAX_SIZE', '10'))  # MB
LOG_BACKUP_COUNT = int(os.getenv('LOG_BACKUP_COUNT', '5'))

# Alert Thresholds
MIN_SIGNAL_STRENGTH = int(os.getenv('MIN_SIGNAL_STRENGTH', '-80'))  # dBm
MAX_CHANNEL_UTILIZATION = int(os.getenv('MAX_CHANNEL_UTILIZATION', '80'))  # percentage
MAX_PACKET_LOSS = int(os.getenv('MAX_PACKET_LOSS', '5'))  # percentage

# API Endpoints
API_ENDPOINTS = {
    'register': f'{SERVER_URL}/api/monitors/register',
    'heartbeat': f'{SERVER_URL}/api/monitors/heartbeat',
    'config-synced': f'{SERVER_URL}/api/monitors/config-synced',
    'monitors': f'{SERVER_URL}/api/monitors',
    'networks': f'{SERVER_URL}/api/networks',
    'devices': f'{SERVER_URL}/api/devices',
    'metrics': f'{SERVER_URL}/api/metrics',
    'alerts': f'{SERVER_URL}/api/alerts',
    'ssid-analyzer/connection': f'{SERVER_URL}/api/ssid-analyzer/connection'
} 