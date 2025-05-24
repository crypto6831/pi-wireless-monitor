"""
Network Metrics Collector for Pi Wireless Monitor
Measures network performance metrics like latency, packet loss, and bandwidth
"""
import os
import sys
import subprocess
import re
import statistics
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import psutil
import speedtest

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config
from src.utils.logger import get_logger

logger = get_logger('metrics')


class MetricsCollector:
    """Collects network performance metrics"""
    
    def __init__(self):
        logger.info("Metrics Collector initialized")
        self.speedtest_client = None
        if config.BANDWIDTH_TEST_ENABLED:
            try:
                self.speedtest_client = speedtest.Speedtest()
                logger.info("Speedtest client initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize speedtest client: {e}")
    
    def collect_all_metrics(self) -> Dict:
        """Collect all available metrics"""
        metrics = {
            'timestamp': datetime.utcnow().isoformat(),
            'monitor_id': config.MONITOR_ID,
            'system': self.get_system_metrics(),
            'network': {}
        }
        
        # Ping test
        if config.PING_TEST_ENABLED:
            ping_results = self.measure_latency(config.PING_TEST_HOST)
            metrics['network']['ping'] = ping_results
        
        # Bandwidth test (only if enabled as it takes time)
        if config.BANDWIDTH_TEST_ENABLED and self.speedtest_client:
            bandwidth_results = self.measure_bandwidth()
            metrics['network']['bandwidth'] = bandwidth_results
        
        # Network interface stats
        interface_stats = self.get_interface_stats(config.MONITOR_INTERFACE)
        metrics['network']['interface'] = interface_stats
        
        return metrics
    
    def measure_latency(self, host: str, count: int = 10) -> Dict:
        """Measure latency using ping"""
        results = {
            'host': host,
            'packets_sent': count,
            'packets_received': 0,
            'packet_loss': 0.0,
            'min': 0.0,
            'max': 0.0,
            'avg': 0.0,
            'stddev': 0.0,
            'raw_times': []
        }
        
        try:
            logger.debug(f"Pinging {host} with {count} packets...")
            
            # Use system ping command
            result = subprocess.run(
                ['ping', '-c', str(count), '-W', '1', host],
                capture_output=True,
                text=True,
                timeout=count + 5
            )
            
            if result.returncode == 0:
                results = self._parse_ping_output(result.stdout, host, count)
                logger.debug(f"Ping results: {results['avg']}ms avg, {results['packet_loss']}% loss")
            else:
                logger.error(f"Ping failed: {result.stderr}")
                results['packet_loss'] = 100.0
                
        except subprocess.TimeoutExpired:
            logger.error(f"Ping to {host} timed out")
            results['packet_loss'] = 100.0
        except Exception as e:
            logger.exception(f"Error measuring latency: {e}")
            results['packet_loss'] = 100.0
        
        return results
    
    def _parse_ping_output(self, output: str, host: str, count: int) -> Dict:
        """Parse ping command output"""
        results = {
            'host': host,
            'packets_sent': count,
            'packets_received': 0,
            'packet_loss': 0.0,
            'min': 0.0,
            'max': 0.0,
            'avg': 0.0,
            'stddev': 0.0,
            'raw_times': []
        }
        
        # Extract RTT times
        rtt_pattern = r'time=(\d+\.?\d*) ms'
        rtt_matches = re.findall(rtt_pattern, output)
        results['raw_times'] = [float(t) for t in rtt_matches]
        results['packets_received'] = len(results['raw_times'])
        
        # Calculate packet loss
        if results['packets_sent'] > 0:
            results['packet_loss'] = ((results['packets_sent'] - results['packets_received']) 
                                    / results['packets_sent']) * 100
        
        # Extract statistics
        stats_pattern = r'min/avg/max/(?:mdev|stddev) = ([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+) ms'
        stats_match = re.search(stats_pattern, output)
        
        if stats_match:
            results['min'] = float(stats_match.group(1))
            results['avg'] = float(stats_match.group(2))
            results['max'] = float(stats_match.group(3))
            results['stddev'] = float(stats_match.group(4))
        elif results['raw_times']:
            # Calculate manually if regex fails
            results['min'] = min(results['raw_times'])
            results['max'] = max(results['raw_times'])
            results['avg'] = statistics.mean(results['raw_times'])
            if len(results['raw_times']) > 1:
                results['stddev'] = statistics.stdev(results['raw_times'])
        
        return results
    
    def measure_bandwidth(self) -> Dict:
        """Measure bandwidth using speedtest"""
        results = {
            'download': 0.0,  # Mbps
            'upload': 0.0,    # Mbps
            'ping': 0.0,      # ms
            'server': {},
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if not self.speedtest_client:
            logger.warning("Speedtest client not available")
            return results
        
        try:
            logger.info("Starting bandwidth test (this may take a while)...")
            
            # Get best server
            self.speedtest_client.get_best_server()
            
            # Measure download speed
            download_speed = self.speedtest_client.download()
            results['download'] = round(download_speed / 1_000_000, 2)  # Convert to Mbps
            logger.debug(f"Download speed: {results['download']} Mbps")
            
            # Measure upload speed
            upload_speed = self.speedtest_client.upload()
            results['upload'] = round(upload_speed / 1_000_000, 2)  # Convert to Mbps
            logger.debug(f"Upload speed: {results['upload']} Mbps")
            
            # Get server info
            results['server'] = {
                'name': self.speedtest_client.results.server.get('name', ''),
                'country': self.speedtest_client.results.server.get('country', ''),
                'sponsor': self.speedtest_client.results.server.get('sponsor', ''),
                'host': self.speedtest_client.results.server.get('host', '')
            }
            
            # Get ping to speedtest server
            results['ping'] = self.speedtest_client.results.ping
            
            logger.info(f"Bandwidth test complete: {results['download']}↓/{results['upload']}↑ Mbps")
            
        except Exception as e:
            logger.error(f"Bandwidth test failed: {e}")
        
        return results
    
    def get_interface_stats(self, interface: str) -> Dict:
        """Get network interface statistics"""
        stats = {
            'interface': interface,
            'is_up': False,
            'speed': 0,  # Mbps
            'bytes_sent': 0,
            'bytes_recv': 0,
            'packets_sent': 0,
            'packets_recv': 0,
            'errors_in': 0,
            'errors_out': 0,
            'drops_in': 0,
            'drops_out': 0
        }
        
        try:
            # Get interface stats
            net_stats = psutil.net_io_counters(pernic=True)
            
            if interface in net_stats:
                nic_stats = net_stats[interface]
                stats.update({
                    'bytes_sent': nic_stats.bytes_sent,
                    'bytes_recv': nic_stats.bytes_recv,
                    'packets_sent': nic_stats.packets_sent,
                    'packets_recv': nic_stats.packets_recv,
                    'errors_in': nic_stats.errin,
                    'errors_out': nic_stats.errout,
                    'drops_in': nic_stats.dropin,
                    'drops_out': nic_stats.dropout
                })
            
            # Check if interface is up
            addrs = psutil.net_if_addrs()
            if interface in addrs:
                stats['is_up'] = any(addr.address for addr in addrs[interface])
            
            # Get interface speed (if available)
            if_stats = psutil.net_if_stats()
            if interface in if_stats:
                stats['speed'] = if_stats[interface].speed
                stats['is_up'] = if_stats[interface].isup
            
        except Exception as e:
            logger.error(f"Error getting interface stats: {e}")
        
        return stats
    
    def get_system_metrics(self) -> Dict:
        """Get system performance metrics"""
        metrics = {
            'cpu_percent': 0.0,
            'memory_percent': 0.0,
            'memory_available': 0,
            'disk_percent': 0.0,
            'disk_free': 0,
            'temperature': 0.0,
            'uptime': 0
        }
        
        try:
            # CPU usage
            metrics['cpu_percent'] = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            metrics['memory_percent'] = memory.percent
            metrics['memory_available'] = memory.available
            
            # Disk usage
            disk = psutil.disk_usage('/')
            metrics['disk_percent'] = disk.percent
            metrics['disk_free'] = disk.free
            
            # System uptime
            boot_time = psutil.boot_time()
            metrics['uptime'] = int(time.time() - boot_time)
            
            # Temperature (Raspberry Pi specific)
            temp = self._get_cpu_temperature()
            if temp:
                metrics['temperature'] = temp
            
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
        
        return metrics
    
    def _get_cpu_temperature(self) -> Optional[float]:
        """Get CPU temperature (Raspberry Pi specific)"""
        try:
            # Try thermal zone (works on most Linux systems)
            temp_file = '/sys/class/thermal/thermal_zone0/temp'
            if os.path.exists(temp_file):
                with open(temp_file, 'r') as f:
                    temp = float(f.read().strip()) / 1000.0
                    return round(temp, 1)
            
            # Try vcgencmd (Raspberry Pi specific)
            result = subprocess.run(
                ['vcgencmd', 'measure_temp'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                temp_match = re.search(r'temp=([\d.]+)', result.stdout)
                if temp_match:
                    return float(temp_match.group(1))
                    
        except Exception:
            pass
        
        return None
    
    def check_thresholds(self, metrics: Dict) -> List[Dict]:
        """Check if any metrics exceed configured thresholds"""
        alerts = []
        
        # Check ping latency
        if 'network' in metrics and 'ping' in metrics['network']:
            ping_data = metrics['network']['ping']
            
            # Check packet loss
            if ping_data['packet_loss'] > config.MAX_PACKET_LOSS:
                alerts.append({
                    'type': 'packet_loss',
                    'severity': 'high',
                    'message': f"High packet loss: {ping_data['packet_loss']}%",
                    'threshold': config.MAX_PACKET_LOSS,
                    'value': ping_data['packet_loss']
                })
        
        # Check system metrics
        if 'system' in metrics:
            system = metrics['system']
            
            # High CPU usage
            if system['cpu_percent'] > 90:
                alerts.append({
                    'type': 'cpu_usage',
                    'severity': 'medium',
                    'message': f"High CPU usage: {system['cpu_percent']}%",
                    'threshold': 90,
                    'value': system['cpu_percent']
                })
            
            # High memory usage
            if system['memory_percent'] > 90:
                alerts.append({
                    'type': 'memory_usage',
                    'severity': 'medium',
                    'message': f"High memory usage: {system['memory_percent']}%",
                    'threshold': 90,
                    'value': system['memory_percent']
                })
            
            # High temperature
            if system['temperature'] > 80:
                alerts.append({
                    'type': 'temperature',
                    'severity': 'high',
                    'message': f"High CPU temperature: {system['temperature']}°C",
                    'threshold': 80,
                    'value': system['temperature']
                })
        
        return alerts 