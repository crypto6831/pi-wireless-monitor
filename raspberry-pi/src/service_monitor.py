import asyncio
import logging
import time
import statistics
import subprocess
import socket
import struct
import requests
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import re
import platform

logger = logging.getLogger(__name__)

class ServiceMonitor:
    def __init__(self, monitor_id: str, server_url: str):
        self.monitor_id = monitor_id
        self.server_url = server_url
        self.services: List[Dict] = []
        self.last_check_times: Dict[str, float] = {}
        
    async def fetch_service_configs(self) -> List[Dict]:
        """Fetch service monitor configurations from server"""
        try:
            response = requests.get(
                f"{self.server_url}/api/service-monitors/monitor/{self.monitor_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                self.services = response.json()
                logger.info(f"Fetched {len(self.services)} service configurations")
                for svc in self.services:
                    logger.info(f"  - {svc.get('serviceName')} ({svc.get('target')}) - {svc.get('type')} - Enabled: {svc.get('enabled')}")
                return self.services
            else:
                logger.error(f"Failed to fetch service configs: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching service configurations: {e}")
            return []
    
    async def check_services(self):
        """Check all enabled services"""
        for service in self.services:
            if not service.get('enabled', True):
                continue
                
            # Check if it's time to run this check
            service_id = service['_id']
            interval = service.get('interval', 60)
            last_check = self.last_check_times.get(service_id, 0)
            
            if time.time() - last_check < interval:
                continue
                
            self.last_check_times[service_id] = time.time()
            
            # Run the appropriate check based on service type
            logger.info(f"Checking service: {service.get('serviceName')} ({service.get('target')})")
            check_result = await self._check_service(service)
            logger.info(f"Check result for {service.get('serviceName')}: {check_result.get('status')} - Latency: {check_result.get('latency')}ms")
            
            # Send result to server
            await self._send_check_result(service_id, check_result)
    
    async def _check_service(self, service: Dict) -> Dict:
        """Check a specific service based on its type"""
        service_type = service.get('type', 'ping')
        target = service['target']
        timeout = service.get('timeout', 5)
        
        if service_type == 'ping':
            return await self._ping_check(target, service.get('packetCount', 4), timeout)
        elif service_type in ['http', 'https']:
            port = service.get('port', 443 if service_type == 'https' else 80)
            return await self._http_check(service_type, target, port, timeout)
        elif service_type == 'tcp':
            port = service.get('port', 80)
            return await self._tcp_check(target, port, timeout)
        elif service_type == 'udp':
            port = service.get('port', 53)
            return await self._udp_check(target, port, timeout)
        else:
            return {
                'status': 'error',
                'errorMessage': f'Unsupported service type: {service_type}'
            }
    
    async def _ping_check(self, host: str, count: int = 4, timeout: int = 5) -> Dict:
        """Perform ping check and calculate metrics"""
        try:
            logger.debug(f"Starting ping check for {host}")
            # Platform-specific ping command
            if platform.system().lower() == 'windows':
                cmd = ['ping', '-n', str(count), '-w', str(timeout * 1000), host]
            else:
                cmd = ['ping', '-c', str(count), '-W', str(timeout), host]
            
            # Run ping command
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                # Check if host is unreachable
                if stderr or b'Destination host unreachable' in stdout:
                    return {
                        'status': 'down',
                        'errorMessage': 'Host unreachable'
                    }
            
            # Parse ping output
            output = stdout.decode('utf-8', errors='ignore')
            return self._parse_ping_output(output)
            
        except Exception as e:
            logger.error(f"Ping check failed for {host}: {e}")
            return {
                'status': 'error',
                'errorMessage': str(e)
            }
    
    def _parse_ping_output(self, output: str) -> Dict:
        """Parse ping command output to extract metrics"""
        try:
            lines = output.strip().split('\n')
            
            # Extract RTT values
            rtt_values = []
            
            # Different patterns for different OS
            if platform.system().lower() == 'windows':
                # Windows: Reply from X: bytes=32 time=10ms TTL=64
                rtt_pattern = r'time[<=](\d+)ms'
            else:
                # Unix: 64 bytes from X: icmp_seq=1 ttl=64 time=10.1 ms
                rtt_pattern = r'time=(\d+\.?\d*)\s*ms'
            
            for line in lines:
                match = re.search(rtt_pattern, line)
                if match:
                    rtt_values.append(float(match.group(1)))
            
            if not rtt_values:
                return {
                    'status': 'down',
                    'errorMessage': 'No ping responses received'
                }
            
            # Calculate metrics
            avg_rtt = statistics.mean(rtt_values)
            jitter = statistics.stdev(rtt_values) if len(rtt_values) > 1 else 0
            
            # Parse packet loss
            packet_loss = 0
            if platform.system().lower() == 'windows':
                # Windows: (4 sent, 4 received, 0% loss)
                loss_match = re.search(r'\((\d+)% loss\)', output)
            else:
                # Unix: 4 packets transmitted, 4 received, 0% packet loss
                loss_match = re.search(r'(\d+)% packet loss', output)
            
            if loss_match:
                packet_loss = float(loss_match.group(1))
            
            return {
                'status': 'up',
                'latency': round(avg_rtt, 2),
                'packetLoss': packet_loss,
                'jitter': round(jitter, 2)
            }
            
        except Exception as e:
            logger.error(f"Error parsing ping output: {e}")
            return {
                'status': 'error',
                'errorMessage': f'Failed to parse ping output: {e}'
            }
    
    async def _http_check(self, scheme: str, host: str, port: int, timeout: int) -> Dict:
        """Perform HTTP/HTTPS check"""
        try:
            url = f"{scheme}://{host}:{port}"
            
            start_time = time.time()
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: requests.get(url, timeout=timeout, verify=False)
            )
            end_time = time.time()
            
            latency = (end_time - start_time) * 1000  # Convert to ms
            
            if response.status_code < 400:
                return {
                    'status': 'up',
                    'latency': round(latency, 2),
                    'packetLoss': 0,
                    'jitter': 0
                }
            else:
                return {
                    'status': 'down',
                    'errorMessage': f'HTTP {response.status_code}'
                }
                
        except requests.exceptions.Timeout:
            return {
                'status': 'timeout',
                'errorMessage': 'Request timed out'
            }
        except Exception as e:
            return {
                'status': 'error',
                'errorMessage': str(e)
            }
    
    async def _tcp_check(self, host: str, port: int, timeout: int) -> Dict:
        """Perform TCP port check"""
        try:
            start_time = time.time()
            
            # Create socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            
            # Try to connect
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: sock.connect_ex((host, port))
            )
            sock.close()
            
            end_time = time.time()
            latency = (end_time - start_time) * 1000  # Convert to ms
            
            if result == 0:
                return {
                    'status': 'up',
                    'latency': round(latency, 2),
                    'packetLoss': 0,
                    'jitter': 0
                }
            else:
                return {
                    'status': 'down',
                    'errorMessage': f'Port {port} closed or filtered'
                }
                
        except socket.timeout:
            return {
                'status': 'timeout',
                'errorMessage': 'Connection timed out'
            }
        except Exception as e:
            return {
                'status': 'error',
                'errorMessage': str(e)
            }
    
    async def _udp_check(self, host: str, port: int, timeout: int) -> Dict:
        """Perform UDP port check (basic reachability)"""
        try:
            start_time = time.time()
            
            # Create UDP socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(timeout)
            
            # Send a dummy packet
            message = b'test'
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: sock.sendto(message, (host, port))
            )
            
            # Try to receive response (may not get one for UDP)
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: sock.recvfrom(1024)
                )
                status = 'up'
            except socket.timeout:
                # No response doesn't necessarily mean down for UDP
                status = 'up'
            
            sock.close()
            
            end_time = time.time()
            latency = (end_time - start_time) * 1000  # Convert to ms
            
            return {
                'status': status,
                'latency': round(latency, 2),
                'packetLoss': 0,
                'jitter': 0
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'errorMessage': str(e)
            }
    
    async def _send_check_result(self, service_id: str, result: Dict):
        """Send service check result to server"""
        try:
            # Add timestamp
            result['timestamp'] = datetime.utcnow().isoformat()
            
            response = requests.put(
                f"{self.server_url}/api/service-monitors/{service_id}/check",
                json=result,
                timeout=10
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to send check result: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error sending check result: {e}")
    
    async def run(self):
        """Main loop for service monitoring"""
        logger.info(f"Starting service monitor for monitor ID: {self.monitor_id}")
        logger.info(f"Server URL: {self.server_url}")
        
        while True:
            try:
                # Fetch latest configurations
                logger.info("Fetching service configurations...")
                await self.fetch_service_configs()
                
                # Check services
                if self.services:
                    logger.info(f"Starting checks for {len(self.services)} services...")
                    await self.check_services()
                    logger.info("Completed service checks")
                else:
                    logger.info("No services configured yet")
                
                # Wait before next iteration
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                logger.error(f"Error in service monitor loop: {e}")
                await asyncio.sleep(30)  # Wait longer on error