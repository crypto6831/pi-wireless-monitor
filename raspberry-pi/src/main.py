"""
Main application for Pi Wireless Monitor
Coordinates all monitoring activities and scheduling
"""
import os
import sys
import time
import signal
import schedule
import asyncio
import threading
from datetime import datetime
from typing import Optional

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config
from src.utils.logger import get_logger
from src.scanner import WiFiScanner
from src.metrics import MetricsCollector
from src.api_client import APIClient
from src.service_monitor import ServiceMonitor

logger = get_logger('main')


class PiWirelessMonitor:
    """Main monitoring application"""
    
    def __init__(self):
        self.running = False
        self.scanner = None
        self.metrics_collector = None
        self.api_client = None
        self.service_monitor = None
        self.last_deep_scan = None
        self.service_monitor_task = None
        self.loop = None
        
        # Set up signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop()
    
    def initialize(self) -> bool:
        """Initialize all components"""
        try:
            logger.info("Initializing Pi Wireless Monitor...")
            
            # Initialize scanner
            self.scanner = WiFiScanner(config.MONITOR_INTERFACE)
            
            # Initialize metrics collector
            self.metrics_collector = MetricsCollector()
            
            # Initialize API client
            self.api_client = APIClient()
            
            # Initialize service monitor
            self.service_monitor = ServiceMonitor(
                monitor_id=config.MONITOR_ID,
                server_url=config.SERVER_URL
            )
            
            # Test server connection
            if not self.api_client.test_connection():
                logger.warning("Server connection failed, will retry during operation")
            
            # Register monitor with server
            if self.api_client.register_monitor():
                logger.info("Monitor registered with server")
            else:
                logger.warning("Monitor registration failed, will retry")
            
            # Get interface info
            interface_info = self.scanner.get_interface_info()
            logger.info(f"Interface {interface_info['interface']} - "
                       f"MAC: {interface_info['mac_address']}, "
                       f"IP: {interface_info['ip_address']}")
            
            logger.info("Initialization complete")
            return True
            
        except Exception as e:
            logger.exception(f"Initialization failed: {e}")
            return False
    
    def run_network_scan(self):
        """Run a network scan and send results"""
        try:
            logger.debug("Starting network scan...")
            
            # Scan for networks
            networks = self.scanner.scan_networks()
            
            # Send to server
            if networks:
                self.api_client.send_network_data(networks)
            
            # Check for weak signals
            for network in networks:
                if network['signal_strength'] < config.MIN_SIGNAL_STRENGTH:
                    alert = {
                        'type': 'weak_signal',
                        'severity': 'low',
                        'message': f"Weak signal for network {network['ssid']}: "
                                 f"{network['signal_strength']} dBm",
                        'network': network['ssid'],
                        'value': network['signal_strength']
                    }
                    self.api_client.send_alert(alert)
            
        except Exception as e:
            logger.error(f"Network scan failed: {e}")
    
    def run_device_scan(self):
        """Run a device scan and send results"""
        try:
            if not config.COLLECT_CONNECTED_DEVICES:
                return
            
            logger.debug("Starting device scan...")
            
            # Scan for connected devices
            devices = self.scanner.scan_connected_devices()
            
            # Send to server
            if devices:
                self.api_client.send_device_data(devices)
                
        except Exception as e:
            logger.error(f"Device scan failed: {e}")
    
    def collect_metrics(self):
        """Collect performance metrics and send results"""
        try:
            logger.info("Collecting metrics...")
            
            # Collect all metrics
            metrics = self.metrics_collector.collect_all_metrics()
            
            # Send to server
            self.api_client.send_metrics(metrics)
            
            # Check thresholds and send alerts
            alerts = self.metrics_collector.check_thresholds(metrics)
            for alert in alerts:
                self.api_client.send_alert(alert)
                
        except Exception as e:
            logger.error(f"Metrics collection failed: {e}")
    
    def send_heartbeat(self):
        """Send heartbeat to server"""
        try:
            self.api_client.send_heartbeat()
        except Exception as e:
            logger.error(f"Heartbeat failed: {e}")
    
    def run_deep_scan(self):
        """Run a comprehensive scan (less frequent)"""
        try:
            logger.info("Running deep scan...")
            self.last_deep_scan = datetime.utcnow()
            
            # Run all scans
            self.run_network_scan()
            self.run_device_scan()
            self.collect_metrics()
            
            # If bandwidth test is enabled, run it during deep scan
            if config.BANDWIDTH_TEST_ENABLED:
                bandwidth_metrics = self.metrics_collector.measure_bandwidth()
                self.api_client.send_metrics({'bandwidth': bandwidth_metrics})
                
        except Exception as e:
            logger.error(f"Deep scan failed: {e}")
    
    def setup_schedule(self):
        """Set up the monitoring schedule"""
        # Regular network scan
        schedule.every(config.SCAN_INTERVAL).seconds.do(self.run_network_scan)
        
        # Device scan (if enabled)
        if config.COLLECT_CONNECTED_DEVICES:
            schedule.every(config.SCAN_INTERVAL * 2).seconds.do(self.run_device_scan)
        
        # Metrics collection
        schedule.every(60).seconds.do(self.collect_metrics)
        
        # Heartbeat
        schedule.every(30).seconds.do(self.send_heartbeat)
        
        # Deep scan
        schedule.every(config.DEEP_SCAN_INTERVAL).seconds.do(self.run_deep_scan)
        
        logger.info(f"Schedule configured - Network scan: {config.SCAN_INTERVAL}s, "
                   f"Deep scan: {config.DEEP_SCAN_INTERVAL}s")
    
    def run_service_monitor_async(self):
        """Run service monitor in a separate thread with its own event loop"""
        async def run_monitor():
            await self.service_monitor.run()
        
        # Create new event loop for this thread
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
        try:
            self.loop.run_until_complete(run_monitor())
        except Exception as e:
            logger.error(f"Service monitor error: {e}")
        finally:
            self.loop.close()
    
    def start(self):
        """Start the monitoring service"""
        if not self.initialize():
            logger.error("Failed to initialize, exiting")
            return
        
        self.running = True
        self.setup_schedule()
        
        # Start service monitor in a separate thread
        self.service_monitor_task = threading.Thread(
            target=self.run_service_monitor_async,
            daemon=True
        )
        self.service_monitor_task.start()
        logger.info("Service monitor started in background")
        
        # Run initial scans
        logger.info("Running initial scans...")
        self.run_deep_scan()
        
        logger.info("Monitoring service started")
        
        # Main loop
        while self.running:
            try:
                schedule.run_pending()
                time.sleep(1)
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                time.sleep(5)
    
    def stop(self):
        """Stop the monitoring service"""
        logger.info("Stopping monitoring service...")
        self.running = False
        
        # Stop the async event loop if it's running
        if self.loop and self.loop.is_running():
            self.loop.call_soon_threadsafe(self.loop.stop)
        
        # Wait for service monitor thread to finish
        if self.service_monitor_task and self.service_monitor_task.is_alive():
            self.service_monitor_task.join(timeout=5)


def main():
    """Main entry point"""
    logger.info("=" * 50)
    logger.info("Pi Wireless Monitor Starting")
    logger.info(f"Monitor ID: {config.MONITOR_ID}")
    logger.info(f"Location: {config.MONITOR_LOCATION}")
    logger.info(f"Server: {config.SERVER_URL}")
    logger.info("=" * 50)
    
    monitor = PiWirelessMonitor()
    
    try:
        monitor.start()
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
    finally:
        monitor.stop()
        logger.info("Pi Wireless Monitor stopped")


if __name__ == "__main__":
    main()
