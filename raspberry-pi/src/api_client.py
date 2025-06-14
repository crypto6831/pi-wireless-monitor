"""
API Client for Pi Wireless Monitor
Handles communication with the central server
"""
import os
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config
from src.utils.logger import get_logger
from src.config_manager import ConfigManager

logger = get_logger('api_client')


class APIClient:
    """API client for communicating with the monitoring server"""
    
    def __init__(self):
        self.session = self._create_session()
        self.api_key = config.API_KEY
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key,
            'X-Monitor-ID': config.MONITOR_ID
        }
        self.is_registered = False
        self.config_manager = ConfigManager()
        logger.info(f"API Client initialized for server: {config.SERVER_URL}")
    
    def _create_session(self) -> requests.Session:
        """Create a requests session with retry logic"""
        session = requests.Session()
        
        # Configure retry strategy with compatibility for different urllib3 versions
        retry_kwargs = {
            'total': 3,
            'backoff_factor': 1,
            'status_forcelist': [429, 500, 502, 503, 504]
        }
        
        # Handle urllib3 version compatibility
        # urllib3 < 2.0 uses 'method_whitelist', >= 2.0 uses 'allowed_methods'
        methods = ["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE", "POST"]
        try:
            # Try new parameter name first (urllib3 >= 2.0)
            retry_strategy = Retry(allowed_methods=methods, **retry_kwargs)
        except TypeError:
            # Fall back to old parameter name (urllib3 < 2.0)
            retry_strategy = Retry(method_whitelist=methods, **retry_kwargs)
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def register_monitor(self) -> bool:
        """Register this monitor with the server"""
        try:
            data = {
                'monitor_id': config.MONITOR_ID,
                'name': config.MONITOR_NAME,
                'location': config.MONITOR_LOCATION,
                'interface': config.MONITOR_INTERFACE,
                'capabilities': {
                    'network_scan': True,
                    'device_detection': config.COLLECT_CONNECTED_DEVICES,
                    'bandwidth_test': config.BANDWIDTH_TEST_ENABLED,
                    'monitor_mode': config.ENABLE_MONITOR_MODE
                },
                'system_info': self._get_system_info()
            }
            
            response = self._post('register', data)
            
            if response and response.get('success'):
                self.is_registered = True
                logger.info("Monitor registered successfully")
                return True
            else:
                logger.error(f"Registration failed: {response}")
                return False
                
        except Exception as e:
            logger.exception(f"Error registering monitor: {e}")
            return False
    
    def send_heartbeat(self) -> bool:
        """Send heartbeat to server and check for configuration changes"""
        try:
            data = {
                'monitor_id': config.MONITOR_ID,
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'active',
                'uptime': self._get_uptime()
            }
            
            response = self._post('heartbeat', data)
            
            if response:
                # Check for configuration changes
                if response.get('configurationChanged'):
                    logger.info("Configuration change detected from server")
                    config_data = response.get('configuration', {})
                    self._handle_configuration_change(config_data)
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error sending heartbeat: {e}")
            return False
    
    def send_network_data(self, networks: List[Dict]) -> bool:
        """Send network scan data to server"""
        if not networks:
            logger.debug("No networks to send")
            return True
        
        try:
            data = {
                'monitor_id': config.MONITOR_ID,
                'timestamp': datetime.utcnow().isoformat(),
                'networks': networks
            }
            
            response = self._post('networks', data)
            
            if response:
                logger.info(f"Sent data for {len(networks)} networks")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error sending network data: {e}")
            return False
    
    def send_device_data(self, devices: List[Dict]) -> bool:
        """Send connected device data to server"""
        if not devices:
            logger.debug("No devices to send")
            return True
        
        try:
            data = {
                'monitor_id': config.MONITOR_ID,
                'timestamp': datetime.utcnow().isoformat(),
                'devices': devices
            }
            
            response = self._post('devices', data)
            
            if response:
                logger.info(f"Sent data for {len(devices)} devices")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error sending device data: {e}")
            return False
    
    def send_metrics(self, metrics: Dict) -> bool:
        """Send performance metrics to server"""
        try:
            data = {
                'monitor_id': config.MONITOR_ID,
                'timestamp': datetime.utcnow().isoformat(),
                'metrics': metrics
            }
            
            response = self._post('metrics', data)
            
            if response:
                logger.debug("Metrics sent successfully")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error sending metrics: {e}")
            return False
    
    def send_alert(self, alert: Dict) -> bool:
        """Send alert to server"""
        try:
            data = {
                'monitor_id': config.MONITOR_ID,
                'timestamp': datetime.utcnow().isoformat(),
                'alert': alert
            }
            
            response = self._post('alerts', data)
            
            if response:
                logger.warning(f"Alert sent: {alert['message']}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error sending alert: {e}")
            return False
    
    def _post(self, endpoint: str, data: Dict) -> Optional[Dict]:
        """Make POST request to API endpoint"""
        url = config.API_ENDPOINTS.get(endpoint)
        if not url:
            logger.error(f"Unknown endpoint: {endpoint}")
            return None
        
        try:
            response = self.session.post(
                url,
                json=data,
                headers=self.headers,
                timeout=config.API_TIMEOUT
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            elif response.status_code == 401:
                logger.error("Authentication failed - check API key")
                return None
            elif response.status_code == 404:
                logger.error(f"Endpoint not found: {url}")
                return None
            else:
                logger.error(f"API request failed: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"Request timed out: {url}")
            return None
        except requests.exceptions.ConnectionError:
            logger.error(f"Connection error: {url}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error in API request: {e}")
            return None
    
    def _get(self, endpoint: str, params: Dict = None) -> Optional[Dict]:
        """Make GET request to API endpoint"""
        url = config.API_ENDPOINTS.get(endpoint)
        if not url:
            logger.error(f"Unknown endpoint: {endpoint}")
            return None
        
        try:
            response = self.session.get(
                url,
                params=params,
                headers=self.headers,
                timeout=config.API_TIMEOUT
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"API request failed: {response.status_code}")
                return None
                
        except Exception as e:
            logger.exception(f"Error in API GET request: {e}")
            return None
    
    def _get_system_info(self) -> Dict:
        """Get system information"""
        try:
            import platform
            import psutil
            
            return {
                'platform': platform.system(),
                'platform_release': platform.release(),
                'platform_version': platform.version(),
                'architecture': platform.machine(),
                'hostname': platform.node(),
                'processor': platform.processor(),
                'ram_total': psutil.virtual_memory().total,
                'python_version': platform.python_version()
            }
        except Exception as e:
            logger.error(f"Error getting system info: {e}")
            return {}
    
    def _get_uptime(self) -> int:
        """Get system uptime in seconds"""
        try:
            import psutil
            boot_time = psutil.boot_time()
            return int(time.time() - boot_time)
        except Exception:
            return 0
    
    def test_connection(self) -> bool:
        """Test connection to the server"""
        try:
            logger.info("Testing connection to server...")
            
            # Try to reach the server
            response = self.session.get(
                f"{config.SERVER_URL}/health",
                timeout=5
            )
            
            if response.status_code == 200:
                logger.info("Server connection successful")
                return True
            else:
                logger.warning(f"Server returned status code: {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError:
            logger.error("Cannot connect to server - is it running?")
            return False
        except requests.exceptions.Timeout:
            logger.error("Server connection timed out")
            return False
        except Exception as e:
            logger.error(f"Error testing connection: {e}")
            return False 
    def _put(self, endpoint: str, data: Dict) -> Optional[Dict]:
        """Make PUT request to API endpoint"""
        # For direct endpoint paths like 'monitors/id/wifi-connection'
        if endpoint.startswith('monitors/'):
            url = f"{config.SERVER_URL}/api/{endpoint}"
        else:
            url = config.API_ENDPOINTS.get(endpoint)
            if not url:
                logger.error(f"Unknown endpoint: {endpoint}")
                return None
        
        try:
            response = self.session.put(
                url,
                json=data,
                headers=self.headers,
                timeout=config.API_TIMEOUT
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            elif response.status_code == 401:
                logger.error("Authentication failed - check API key")
                return None
            elif response.status_code == 404:
                logger.error(f"Endpoint not found: {url}")
                return None
            else:
                logger.error(f"API error: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error("API request timeout")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            return None

    def send_wifi_connection_data(self, wifi_info: Dict) -> bool:
        """Send WiFi connection information to server"""
        try:
            # Only send if we have valid connection data
            if not wifi_info.get('connected_ssid'):
                logger.debug("No WiFi connection data to send")
                return True
            
            # Prepare WiFi connection data
            wifi_data = {
                'ssid': wifi_info.get('connected_ssid'),
                'bssid': wifi_info.get('connected_bssid'),
                'rssi': wifi_info.get('signal_level'),
                'channel': wifi_info.get('channel'),
                'frequency': wifi_info.get('frequency'),
                'rxRate': wifi_info.get('rx_rate'),
                'txRate': wifi_info.get('tx_rate'),
                'linkSpeed': wifi_info.get('rx_rate'),  # Use RX rate as link speed
                'quality': wifi_info.get('link_quality')
            }
            
            # Remove None values
            wifi_data = {k: v for k, v in wifi_data.items() if v is not None}
            
            logger.debug(f"Sending WiFi connection data: {wifi_data}")
            
            # Get monitor ID from database
            monitor_id = self._get_monitor_id()
            if not monitor_id:
                logger.error("Could not get monitor ID for WiFi update")
                return False
            
            response = self._put(f'monitors/{monitor_id}/wifi-connection', wifi_data)
            
            if response:
                logger.debug("WiFi connection data sent successfully")
                return True
            else:
                logger.warning("Failed to send WiFi connection data")
                return False
            
        except Exception as e:
            logger.error(f"Error sending WiFi connection data: {e}")
            return False
    
    def send_ssid_connection_status(self, connection_data: Dict) -> bool:
        """Send SSID connection status to server"""
        try:
            logger.debug(f"Sending SSID connection status: {connection_data}")
            
            # Add monitor identification
            payload = {
                'monitorId': config.MONITOR_ID,
                **connection_data
            }
            
            response = self._post('ssid-analyzer/connection', payload)
            
            if response:
                logger.debug("SSID connection status sent successfully")
                return True
            else:
                logger.warning("Failed to send SSID connection status")
                return False
                
        except Exception as e:
            logger.error(f"Error sending SSID connection status: {e}")
            return False
    
    def _get_monitor_id(self) -> str:
        """Get the MongoDB ObjectId for this monitor"""
        try:
            response = self._get('monitors')
            if response and 'monitors' in response:
                for monitor in response['monitors']:
                    if monitor.get('monitorId') == config.MONITOR_ID:
                        return monitor.get('_id')
            return None
        except Exception as e:
            logger.error(f"Error getting monitor ID: {e}")
            return None
    
    def _handle_configuration_change(self, config_data: Dict) -> None:
        """Handle configuration change from server"""
        try:
            logger.info(f"Processing configuration change: {config_data}")
            
            # Sync the configuration
            if self.config_manager.sync_configuration(config_data):
                # Acknowledge the sync
                if self._acknowledge_config_sync():
                    logger.info("Configuration synced and acknowledged successfully")
                    # Restart the service
                    self._restart_service()
                else:
                    logger.error("Failed to acknowledge configuration sync")
            else:
                logger.error("Configuration sync failed")
                
        except Exception as e:
            logger.error(f"Error handling configuration change: {e}")
    
    def _acknowledge_config_sync(self) -> bool:
        """Acknowledge successful configuration sync to server"""
        try:
            data = {
                'monitor_id': config.MONITOR_ID,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            response = self._post('config-synced', data)
            return response is not None
            
        except Exception as e:
            logger.error(f"Error acknowledging config sync: {e}")
            return False
    
    def _restart_service(self) -> None:
        """Restart the monitor service"""
        try:
            logger.info("Restarting service due to configuration change...")
            
            # Use the config manager to restart the service
            # Use 'exit' method to let systemd restart the service
            self.config_manager.restart_service(method='exit')
            
        except Exception as e:
            logger.error(f"Error restarting service: {e}")
            # If restart fails, try alternative method
            try:
                self.config_manager.restart_service(method='systemctl')
            except Exception as e2:
                logger.error(f"Alternative restart method also failed: {e2}")
