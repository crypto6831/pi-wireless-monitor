"""
WiFi Scanner Module for Pi Wireless Monitor
Handles network scanning and data collection
"""
import os
import sys
import subprocess
import re
import json
import time
from datetime import datetime
from typing import List, Dict, Optional, Tuple
# import netifaces  # Removed dependency - using ip command instead
import psutil

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config
from src.utils.logger import get_logger

logger = get_logger('scanner')


class WiFiScanner:
    """WiFi network scanner using system tools"""
    
    def __init__(self, interface: str = None):
        self.interface = interface or config.MONITOR_INTERFACE
        self._validate_interface()
        logger.info(f"WiFi Scanner initialized on interface: {self.interface}")
    
    def _validate_interface(self):
        """Validate that the network interface exists and is wireless"""
        try:
            # Check if interface exists using ip command
            result = subprocess.run(
                ['ip', 'link', 'show', self.interface],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise ValueError(f"Interface {self.interface} not found")
            
            # Check if it's a wireless interface using iwconfig
            result = subprocess.run(
                ['iwconfig', self.interface],
                capture_output=True,
                text=True
            )
            if 'no wireless extensions' in result.stderr:
                raise ValueError(f"Interface {self.interface} is not a wireless interface")
                
        except Exception as e:
            logger.error(f"Interface validation failed: {e}")
            raise
    
    def scan_networks(self) -> List[Dict]:
        """Scan for available WiFi networks"""
        networks = []
        
        try:
            # Use iwlist for scanning
            logger.debug("Starting network scan...")
            
            # First, bring interface up
            subprocess.run(['sudo', 'ip', 'link', 'set', self.interface, 'up'], 
                         capture_output=True)
            
            # Perform scan
            result = subprocess.run(
                ['sudo', 'iwlist', self.interface, 'scan'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                logger.error(f"Scan failed: {result.stderr}")
                return networks
            
            # Parse scan results
            networks = self._parse_iwlist_output(result.stdout)
            logger.info(f"Found {len(networks)} networks")
            
        except subprocess.TimeoutExpired:
            logger.error("Network scan timed out")
        except Exception as e:
            logger.exception(f"Error during network scan: {e}")
        
        return networks
    
    def _parse_iwlist_output(self, output: str) -> List[Dict]:
        """Parse iwlist scan output"""
        networks = []
        current_network = {}
        
        for line in output.split('\n'):
            line = line.strip()
            
            if line.startswith('Cell'):
                # Save previous network if exists
                if current_network:
                    networks.append(self._normalize_network_data(current_network))
                
                # Start new network
                current_network = {}
                # Extract MAC address
                mac_match = re.search(r'Address: ([\w:]+)', line)
                if mac_match:
                    current_network['bssid'] = mac_match.group(1)
            
            elif 'ESSID:' in line:
                # Extract SSID
                ssid_match = re.search(r'ESSID:"([^"]*)"', line)
                if ssid_match:
                    current_network['ssid'] = ssid_match.group(1)
                else:
                    current_network['ssid'] = '<hidden>'
            
            elif 'Channel:' in line:
                # Extract channel
                channel_match = re.search(r'Channel:(\d+)', line)
                if channel_match:
                    current_network['channel'] = int(channel_match.group(1))
            
            elif 'Frequency:' in line:
                # Extract frequency
                freq_match = re.search(r'Frequency:([\d.]+) GHz', line)
                if freq_match:
                    current_network['frequency'] = float(freq_match.group(1))
            
            elif 'Quality=' in line:
                # Extract signal quality and strength
                quality_match = re.search(r'Quality=(\d+)/(\d+)', line)
                signal_match = re.search(r'Signal level=(-?\d+) dBm', line)
                
                if quality_match:
                    current_network['quality'] = int(quality_match.group(1))
                    current_network['quality_max'] = int(quality_match.group(2))
                
                if signal_match:
                    current_network['signal_strength'] = int(signal_match.group(1))
            
            elif 'Encryption key:' in line:
                # Check if encryption is enabled
                current_network['encryption'] = 'on' in line
            
            elif 'IE:' in line and 'WPA' in line:
                # Detect WPA/WPA2
                if 'wpa_version' not in current_network:
                    current_network['wpa_version'] = []
                
                if 'WPA2' in line:
                    current_network['wpa_version'].append('WPA2')
                elif 'WPA' in line:
                    current_network['wpa_version'].append('WPA')
        
        # Don't forget the last network
        if current_network:
            networks.append(self._normalize_network_data(current_network))
        
        return networks
    
    def _normalize_network_data(self, network: Dict) -> Dict:
        """Normalize and enrich network data"""
        normalized = {
            'ssid': network.get('ssid', 'Unknown'),
            'bssid': network.get('bssid', ''),
            'channel': network.get('channel', 0),
            'frequency': network.get('frequency', 0.0),
            'signal_strength': network.get('signal_strength', -100),
            'quality': network.get('quality', 0),
            'quality_max': network.get('quality_max', 100),
            'quality_percentage': 0,
            'encryption': network.get('encryption', False),
            'encryption_type': 'Open',
            'band': '2.4GHz',
            'timestamp': datetime.utcnow().isoformat(),
            'monitor_id': config.MONITOR_ID
        }
        
        # Calculate quality percentage
        if normalized['quality_max'] > 0:
            normalized['quality_percentage'] = int(
                (normalized['quality'] / normalized['quality_max']) * 100
            )
        
        # Determine encryption type
        if normalized['encryption']:
            if 'wpa_version' in network:
                normalized['encryption_type'] = '/'.join(network['wpa_version'])
            else:
                normalized['encryption_type'] = 'WEP'
        
        # Determine band
        if normalized['frequency'] >= 5.0:
            normalized['band'] = '5GHz'
        
        return normalized
    
    def get_interface_info(self) -> Dict:
        """Get comprehensive WiFi connection information"""
        info = {
            'interface': self.interface,
            'mac_address': '',
            'ip_address': '',
            'connected_ssid': '',
            'connected_bssid': '',
            'signal_level': None,  # RSSI in dBm
            'channel': None,
            'frequency': None,
            'rx_rate': None,
            'tx_rate': None,
            'link_quality': None
        }
        
        try:
            # Get basic interface info using ip command
            result = subprocess.run(['ip', 'addr', 'show', self.interface], capture_output=True, text=True)
            if result.returncode == 0:
                # Extract MAC address
                mac_match = re.search(r'link/ether ([a-f0-9:]+)', result.stdout)
                if mac_match:
                    info['mac_address'] = mac_match.group(1)
                
                # Extract IP address
                ip_match = re.search(r'inet ([0-9.]+)/', result.stdout)
                if ip_match:
                    info['ip_address'] = ip_match.group(1)
            
            # Get WiFi connection details using nmcli
            result = subprocess.run(['nmcli', '-t', '-f', 'ACTIVE,SSID,BSSID,CHAN,FREQ,RATE,SIGNAL', 'device', 'wifi', 'list'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if line.startswith('yes:'):  # Active connection
                        # Split the line and handle BSSID with escaped colons
                        # Format: yes:SSID:BSSID:CHAN:FREQ:RATE:SIGNAL
                        parts = line.split(':')
                        if len(parts) >= 7:
                            ssid = parts[1]
                            # BSSID spans multiple parts due to escaped colons
                            bssid_parts = []
                            i = 2
                            while i < len(parts) and len(bssid_parts) < 6:  # MAC has 6 parts
                                bssid_parts.append(parts[i])
                                i += 1
                            bssid = ':'.join(bssid_parts).replace('\\', '')
                            
                            # Remaining parts are channel, freq, rate, signal
                            if i + 3 < len(parts):
                                channel = parts[i]
                                freq = parts[i + 1] 
                                rate = parts[i + 2]
                                signal = parts[i + 3]
                            
                            info['connected_ssid'] = ssid if ssid != '--' else ''
                            
                            # Parse BSSID 
                            if bssid and bssid != '--':
                                info['connected_bssid'] = bssid
                            
                            # Parse channel
                            if channel and channel != '--':
                                try:
                                    info['channel'] = int(channel)
                                except ValueError:
                                    pass
                            
                            # Parse frequency (MHz)
                            if freq and freq != '--':
                                try:
                                    freq_str = freq.replace(' MHz', '')
                                    info['frequency'] = int(freq_str)
                                except ValueError:
                                    pass
                            
                            # Parse data rate (Mbit/s)
                            if rate and rate != '--':
                                try:
                                    rate_str = rate.replace(' Mbit/s', '')
                                    rate_val = float(rate_str)
                                    info['rx_rate'] = rate_val
                                    info['tx_rate'] = rate_val  # Use same rate for both
                                except ValueError:
                                    pass
                            
                            # Parse signal strength (convert to dBm)
                            if signal and signal != '--':
                                try:
                                    signal_val = int(signal)
                                    # nmcli gives signal as percentage, convert to approximate dBm
                                    # Formula: dBm ≈ (percentage / 2) - 100
                                    info['signal_level'] = int((signal_val / 2) - 100)
                                except ValueError:
                                    pass
                            break
            
            # Get link quality from /proc/net/wireless
            try:
                with open('/proc/net/wireless', 'r') as f:
                    lines = f.readlines()
                    for line in lines:
                        if self.interface in line:
                            parts = line.split()
                            if len(parts) >= 3:
                                # Link quality is the second column (after interface name)
                                link_quality_str = parts[2].rstrip('.')
                                try:
                                    info['link_quality'] = int(link_quality_str)
                                except ValueError:
                                    pass
                            break
            except (FileNotFoundError, PermissionError):
                pass
                
        except Exception as e:
            logger.error(f"Error getting interface info: {e}")
        
        return info
    
    def get_channel_utilization(self, channel: int) -> float:
        """Estimate channel utilization (requires monitor mode)"""
        # This is a simplified implementation
        # In production, you would use monitor mode and packet capture
        return 0.0
    
    def scan_connected_devices(self) -> List[Dict]:
        """Scan for devices connected to the same network"""
        devices = []
        
        if not config.COLLECT_CONNECTED_DEVICES:
            return devices
        
        try:
            # Get current network gateway using ip route
            result = subprocess.run(['ip', 'route', 'show', 'default'], capture_output=True, text=True)
            if result.returncode != 0:
                logger.warning("No default gateway found")
                return devices
            
            # Parse gateway IP from output like: "default via 192.168.1.1 dev wlan0"
            gateway_match = re.search(r'default via ([0-9.]+)', result.stdout)
            if not gateway_match:
                logger.warning("Could not parse gateway IP")
                return devices
                
            gateway_ip = gateway_match.group(1)
            
            # Use ARP scan to find devices
            # Note: This requires sudo privileges
            result = subprocess.run(
                ['sudo', 'arp-scan', '--localnet', '-I', self.interface],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                devices = self._parse_arp_scan_output(result.stdout)
                logger.info(f"Found {len(devices)} connected devices")
            else:
                logger.error(f"ARP scan failed: {result.stderr}")
                
        except FileNotFoundError:
            logger.warning("arp-scan not installed. Install with: sudo apt-get install arp-scan")
        except subprocess.TimeoutExpired:
            logger.error("Device scan timed out")
        except Exception as e:
            logger.exception(f"Error scanning devices: {e}")
        
        return devices
    
    def _parse_arp_scan_output(self, output: str) -> List[Dict]:
        """Parse arp-scan output"""
        devices = []
        
        for line in output.split('\n'):
            # Skip header and footer lines
            if not line or line.startswith('Interface:') or line.startswith('Starting'):
                continue
            
            # Parse device lines (IP MAC Manufacturer)
            parts = line.split('\t')
            if len(parts) >= 2:
                ip_addr = parts[0].strip()
                mac_addr = parts[1].strip()
                
                # Skip empty or invalid entries
                if not ip_addr or not mac_addr or ip_addr == '0.0.0.0' or mac_addr == '00:00:00:00:00:00':
                    continue
                
                device = {
                    'ipAddress': ip_addr,  # camelCase to match server
                    'macAddress': mac_addr,  # camelCase to match server
                    'manufacturer': parts[2].strip() if len(parts) > 2 else 'Unknown',
                    'vendor': parts[2].strip() if len(parts) > 2 else 'Unknown',  # alias for manufacturer
                    'hostname': 'Unknown',
                    'deviceType': 'Unknown',
                    'timestamp': datetime.utcnow().isoformat()
                }
                devices.append(device)
        
        return devices
    
    def get_current_ssid_connection_status(self) -> Dict:
        """Get detailed status of current SSID connection"""
        connection_info = {}
        
        try:
            # Get currently connected SSID using nmcli
            result = subprocess.run(
                ['nmcli', '-t', '-f', 'ACTIVE,SSID,BSSID,SIGNAL,CHAN,FREQ,RATE,MODE', 'dev', 'wifi'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if line.startswith('yes:'):  # Active connection
                        # Parse nmcli output with escaped BSSID handling
                        parsed_data = self._parse_nmcli_wifi_line(line)
                        if parsed_data:
                            connection_info = {
                                'ssid': parsed_data.get('ssid', 'Hidden'),
                                'bssid': parsed_data.get('bssid'),
                                'signal_strength': self._parse_signal_strength(parsed_data.get('signal')),
                                'channel': self._parse_int(parsed_data.get('channel')),
                                'frequency': self._parse_frequency_mhz(parsed_data.get('frequency')),
                                'link_speed': self._parse_rate(parsed_data.get('rate')),
                                'rx_rate': self._parse_rate(parsed_data.get('rate')),
                                'tx_rate': self._parse_rate(parsed_data.get('rate')),
                                'connection_status': 'connected',
                                'timestamp': datetime.utcnow().isoformat()
                            }
                        break
            
            # If no active connection found via nmcli, check iwconfig
            if not connection_info:
                connection_info = self._get_iwconfig_connection_status()
            
            # Get additional connection metrics
            if connection_info:
                # Get connection quality and uptime
                quality_info = self._get_connection_quality()
                connection_info.update(quality_info)
                
                # Get network latency
                latency_info = self._get_network_latency()
                connection_info.update(latency_info)
                
                # Get connection uptime
                uptime_info = self._get_connection_uptime()
                connection_info.update(uptime_info)
                
                # Phase 3: Get performance metrics
                throughput_info = self._measure_throughput()
                connection_info.update(throughput_info)
                
                # Calculate stability score
                stability_score = self._calculate_stability_score(connection_info)
                connection_info['stability_score'] = stability_score
            else:
                connection_info = {
                    'connection_status': 'disconnected',
                    'timestamp': datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error getting SSID connection status: {e}")
            connection_info = {
                'connection_status': 'error',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
        
        return connection_info
    
    def _get_iwconfig_connection_status(self) -> Dict:
        """Fallback method using iwconfig for connection status"""
        try:
            result = subprocess.run(['iwconfig', self.interface], capture_output=True, text=True)
            if result.returncode == 0:
                output = result.stdout
                
                # Parse SSID
                ssid_match = re.search(r'ESSID:"([^"]*)"', output)
                if not ssid_match or ssid_match.group(1) == 'off/any':
                    return {}
                
                ssid = ssid_match.group(1)
                
                # Parse other details
                connection_info = {'ssid': ssid, 'connection_status': 'connected'}
                
                # Parse Access Point MAC
                ap_match = re.search(r'Access Point: ([A-Fa-f0-9:]{17})', output)
                if ap_match:
                    connection_info['bssid'] = ap_match.group(1)
                
                # Parse frequency
                freq_match = re.search(r'Frequency:([0-9.]+) GHz', output)
                if freq_match:
                    connection_info['frequency'] = int(float(freq_match.group(1)) * 1000)
                
                # Parse signal strength
                signal_match = re.search(r'Signal level=(-?\d+) dBm', output)
                if signal_match:
                    connection_info['signal_strength'] = int(signal_match.group(1))
                
                # Parse bit rate
                rate_match = re.search(r'Bit Rate=([0-9.]+) Mb/s', output)
                if rate_match:
                    rate = float(rate_match.group(1))
                    connection_info['link_speed'] = rate
                    connection_info['rx_rate'] = rate
                    connection_info['tx_rate'] = rate
                
                return connection_info
                
        except Exception as e:
            logger.error(f"Error getting iwconfig status: {e}")
        
        return {}
    
    def _get_connection_quality(self) -> Dict:
        """Get connection quality metrics"""
        quality_info = {}
        
        try:
            # Get quality from /proc/net/wireless
            with open('/proc/net/wireless', 'r') as f:
                lines = f.readlines()
                for line in lines:
                    if self.interface in line:
                        parts = line.split()
                        if len(parts) >= 3:
                            # Quality is typically in format "xx/70" or just "xx"
                            quality_str = parts[2].rstrip('.')
                            if '/' in quality_str:
                                quality_parts = quality_str.split('/')
                                if len(quality_parts) == 2:
                                    current = int(quality_parts[0])
                                    maximum = int(quality_parts[1])
                                    quality_info['quality'] = int((current / maximum) * 100)
                            else:
                                quality_info['quality'] = int(quality_str)
                        break
        except (FileNotFoundError, PermissionError, ValueError):
            pass
        
        return quality_info
    
    def _get_network_latency(self) -> Dict:
        """Get network latency to gateway and internet"""
        latency_info = {}
        
        try:
            # Get gateway IP
            result = subprocess.run(['ip', 'route', 'show', 'default'], capture_output=True, text=True)
            if result.returncode == 0:
                gateway_match = re.search(r'default via ([0-9.]+)', result.stdout)
                if gateway_match:
                    gateway_ip = gateway_match.group(1)
                    
                    # Ping gateway (network latency)
                    ping_result = subprocess.run(
                        ['ping', '-c', '3', '-W', '2', gateway_ip],
                        capture_output=True,
                        text=True
                    )
                    if ping_result.returncode == 0:
                        # Parse average latency from ping output
                        avg_match = re.search(r'min/avg/max/mdev = [0-9.]+/([0-9.]+)/[0-9.]+/[0-9.]+ ms', ping_result.stdout)
                        if avg_match:
                            latency_info['network_latency'] = float(avg_match.group(1))
            
            # Ping internet (8.8.8.8 for internet latency)
            ping_result = subprocess.run(
                ['ping', '-c', '3', '-W', '3', '8.8.8.8'],
                capture_output=True,
                text=True
            )
            if ping_result.returncode == 0:
                avg_match = re.search(r'min/avg/max/mdev = [0-9.]+/([0-9.]+)/[0-9.]+/[0-9.]+ ms', ping_result.stdout)
                if avg_match:
                    latency_info['internet_latency'] = float(avg_match.group(1))
                    
                # Calculate packet loss
                loss_match = re.search(r'(\d+)% packet loss', ping_result.stdout)
                if loss_match:
                    latency_info['packet_loss'] = int(loss_match.group(1))
                    
        except Exception as e:
            logger.debug(f"Error getting network latency: {e}")
        
        return latency_info
    
    def _get_connection_uptime(self) -> Dict:
        """Get connection uptime information"""
        uptime_info = {}
        
        try:
            # Try to get uptime from NetworkManager
            result = subprocess.run(
                ['nmcli', '-t', '-f', 'DEVICE,TYPE,STATE,CONNECTION', 'dev'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    parts = line.split(':')
                    if len(parts) >= 4 and parts[0] == self.interface and parts[2] == 'connected':
                        # Get connection start time (simplified - would need more complex logic for actual uptime)
                        uptime_info['uptime'] = 0  # Placeholder - implement actual uptime calculation
                        break
                        
        except Exception as e:
            logger.debug(f"Error getting connection uptime: {e}")
        
        return uptime_info
    
    def _clean_bssid(self, bssid: str) -> str:
        """Clean BSSID by removing escape characters"""
        if not bssid:
            return None
        # Remove escape characters like \: that appear in nmcli output
        return bssid.replace('\\:', ':')
    
    def _parse_signal_strength(self, signal_str: str) -> int:
        """Parse signal strength from nmcli output"""
        try:
            if not signal_str or signal_str == '--':
                return -100
            # nmcli returns signal as percentage, convert to approximate dBm
            signal_percent = int(signal_str)
            # Formula: dBm ≈ (percentage / 2) - 100
            return int((signal_percent / 2) - 100)
        except (ValueError, TypeError):
            return -100
    
    def _parse_int(self, value_str: str) -> Optional[int]:
        """Parse integer value from string"""
        try:
            if not value_str or value_str == '--':
                return None
            return int(value_str)
        except (ValueError, TypeError):
            return None
    
    def _parse_rate(self, rate_str: str) -> Optional[float]:
        """Parse data rate from string"""
        try:
            if not rate_str or rate_str == '--':
                return None
            # Remove units and parse (e.g., "540 Mbit/s" -> 540.0)
            rate_clean = rate_str.replace(' Mbit/s', '').replace(' Mbps', '')
            return float(rate_clean)
        except (ValueError, TypeError):
            return None
    
    def monitor_connection_stability(self, duration_minutes: int = 60) -> Dict:
        """Monitor connection stability over time"""
        stability_info = {
            'duration_minutes': duration_minutes,
            'disconnection_events': [],
            'signal_variations': [],
            'connection_quality_history': [],
            'start_time': datetime.utcnow().isoformat()
        }
        
        # This would be implemented as a background monitoring task
        # For now, return basic structure
        logger.info(f"Starting connection stability monitoring for {duration_minutes} minutes")
        
        return stability_info
    
    def _parse_nmcli_wifi_line(self, line: str) -> Dict:
        """Parse a single line from nmcli wifi output with proper BSSID handling"""
        try:
            # Example line: yes:SmartHome:6C\:5A\:B0\:7B\:09\:2F:56:48:5240 MHz:540 Mbit/s:Infra
            # The issue is that BSSID has escaped colons which get split
            
            parts = line.split(':')
            if len(parts) < 8:
                return {}
            
            active = parts[0]  # yes/no
            ssid = parts[1]    # SSID name
            
            # BSSID spans parts[2] through parts[7] due to escaped colons
            # Format: 6C\:5A\:B0\:7B\:09\:2F becomes ['6C\\', '5A\\', 'B0\\', '7B\\', '09\\', '2F']
            bssid_parts = []
            for i in range(2, 8):  # BSSID should be in positions 2-7
                if i < len(parts):
                    part = parts[i]
                    # Remove trailing backslash if present
                    if part.endswith('\\'):
                        part = part[:-1]
                    bssid_parts.append(part)
            
            bssid = ':'.join(bssid_parts) if len(bssid_parts) == 6 else None
            
            # Remaining fields start after the BSSID (position 8+)
            signal = parts[8] if len(parts) > 8 else ''
            channel = parts[9] if len(parts) > 9 else ''
            frequency = parts[10] if len(parts) > 10 else ''
            rate = parts[11] if len(parts) > 11 else ''
            
            return {
                'active': active,
                'ssid': ssid,
                'bssid': bssid,
                'signal': signal,
                'channel': channel,
                'frequency': frequency,
                'rate': rate
            }
            
        except Exception as e:
            logger.error(f"Error parsing nmcli wifi line: {e}")
            return {}
    
    def _parse_frequency_mhz(self, freq_str: str) -> Optional[int]:
        """Parse frequency from string like '5240 MHz'"""
        try:
            if not freq_str:
                return None
            # Extract number from string like "5240 MHz"
            freq_match = re.search(r'(\d+)', freq_str)
            if freq_match:
                return int(freq_match.group(1))
            return None
        except (ValueError, TypeError):
            return None 
    
    # Phase 3: Performance measurement methods
    def _get_network_latency(self) -> Dict:
        """Get network latency measurements"""
        latency_info = {}
        
        try:
            # Test network latency to local gateway
            gateway_result = subprocess.run(
                ['ping', '-c', '3', '-W', '2', '8.8.8.8'],
                capture_output=True, text=True
            )
            
            if gateway_result.returncode == 0:
                # Parse ping output for average latency
                avg_match = re.search(r'rtt min/avg/max/mdev = [0-9.]+/([0-9.]+)/[0-9.]+/[0-9.]+ ms', gateway_result.stdout)
                if avg_match:
                    latency_info['internet_latency'] = float(avg_match.group(1))
            
            # Test local network latency to gateway
            gateway_ip_result = subprocess.run(['ip', 'route', 'get', '1.1.1.1'], capture_output=True, text=True)
            if gateway_ip_result.returncode == 0:
                gateway_match = re.search(r'via ([0-9.]+)', gateway_ip_result.stdout)
                if gateway_match:
                    gateway_ip = gateway_match.group(1)
                    local_result = subprocess.run(
                        ['ping', '-c', '3', '-W', '1', gateway_ip],
                        capture_output=True, text=True
                    )
                    if local_result.returncode == 0:
                        avg_match = re.search(r'rtt min/avg/max/mdev = [0-9.]+/([0-9.]+)/[0-9.]+/[0-9.]+ ms', local_result.stdout)
                        if avg_match:
                            latency_info['network_latency'] = float(avg_match.group(1))
                            
            # Test DNS latency
            dns_result = subprocess.run(
                ['dig', '+time=2', '@8.8.8.8', 'google.com'],
                capture_output=True, text=True
            )
            if dns_result.returncode == 0:
                time_match = re.search(r'Query time: ([0-9]+) msec', dns_result.stdout)
                if time_match:
                    latency_info['dns_latency'] = float(time_match.group(1))
                    
        except Exception as e:
            logger.error(f"Error measuring network latency: {e}")
            
        return latency_info
    
    def _get_connection_quality(self) -> Dict:
        """Get WiFi connection quality metrics"""
        quality_info = {}
        
        try:
            # Get link quality from /proc/net/wireless
            with open('/proc/net/wireless', 'r') as f:
                lines = f.readlines()
                for line in lines:
                    if self.interface in line:
                        parts = line.split()
                        if len(parts) >= 3:
                            # Quality is typically in format like "60/100"
                            quality_str = parts[2].replace('.', '')
                            quality_info['quality'] = int(quality_str) if quality_str.isdigit() else None
                        break
                        
            # Get packet loss using ping
            ping_result = subprocess.run(
                ['ping', '-c', '10', '-W', '2', '8.8.8.8'],
                capture_output=True, text=True
            )
            if ping_result.returncode == 0:
                loss_match = re.search(r'([0-9]+)% packet loss', ping_result.stdout)
                if loss_match:
                    quality_info['packet_loss'] = float(loss_match.group(1))
                    
                # Extract jitter (mdev) if available
                jitter_match = re.search(r'rtt min/avg/max/mdev = [0-9.]+/[0-9.]+/[0-9.]+/([0-9.]+) ms', ping_result.stdout)
                if jitter_match:
                    quality_info['jitter'] = float(jitter_match.group(1))
                    
        except Exception as e:
            logger.error(f"Error measuring connection quality: {e}")
            
        return quality_info
    
    def _get_connection_uptime(self) -> Dict:
        """Get connection uptime information"""
        uptime_info = {}
        
        try:
            # Get network interface uptime from /proc/net/dev
            with open('/proc/net/dev', 'r') as f:
                content = f.read()
                if self.interface in content:
                    # Interface is up - use system uptime as approximation
                    with open('/proc/uptime', 'r') as uptime_file:
                        uptime_seconds = float(uptime_file.read().split()[0])
                        uptime_info['uptime'] = int(uptime_seconds)
                        
        except Exception as e:
            logger.error(f"Error getting connection uptime: {e}")
            
        return uptime_info
    
    def _measure_throughput(self) -> Dict:
        """Measure network throughput using iperf3 or basic methods"""
        throughput_info = {}
        
        try:
            # Try using speedtest-cli if available
            speedtest_result = subprocess.run(
                ['speedtest-cli', '--simple'],
                capture_output=True, text=True, timeout=60
            )
            
            if speedtest_result.returncode == 0:
                # Parse speedtest output
                for line in speedtest_result.stdout.split('\n'):
                    if 'Download:' in line:
                        download_match = re.search(r'Download: ([0-9.]+) Mbit/s', line)
                        if download_match:
                            throughput_info['download_throughput'] = float(download_match.group(1))
                    elif 'Upload:' in line:
                        upload_match = re.search(r'Upload: ([0-9.]+) Mbit/s', line)
                        if upload_match:
                            throughput_info['upload_throughput'] = float(upload_match.group(1))
            else:
                # Fallback: basic throughput estimate using wget
                download_result = subprocess.run(
                    ['wget', '--progress=dot', '--tries=1', '--timeout=10', 
                     'http://speedtest.ftp.otenet.gr/files/test1Mb.db', '-O', '/dev/null'],
                    capture_output=True, text=True, timeout=30
                )
                
                if download_result.returncode == 0:
                    # Parse wget speed output
                    speed_match = re.search(r'\(([0-9.]+) [KMG]B/s\)', download_result.stderr)
                    if speed_match:
                        speed_str = speed_match.group(1)
                        # Convert to Mbps (rough estimate)
                        speed_val = float(speed_str)
                        if 'MB/s' in download_result.stderr:
                            throughput_info['download_throughput'] = speed_val * 8  # MB/s to Mbps
                        elif 'KB/s' in download_result.stderr:
                            throughput_info['download_throughput'] = speed_val * 8 / 1000  # KB/s to Mbps
                            
        except Exception as e:
            logger.error(f"Error measuring throughput: {e}")
            
        return throughput_info
    
    def _calculate_stability_score(self, connection_data: Dict) -> float:
        """Calculate a stability score based on connection metrics"""
        try:
            score = 100.0  # Start with perfect score
            
            # Signal strength impact (0-40 points)
            signal = connection_data.get('signal_strength', -100)
            if signal >= -50:
                signal_score = 40
            elif signal >= -60:
                signal_score = 30
            elif signal >= -70:
                signal_score = 20
            elif signal >= -80:
                signal_score = 10
            else:
                signal_score = 0
            
            # Latency impact (0-20 points)
            latency = connection_data.get('network_latency', 0)
            if latency <= 10:
                latency_score = 20
            elif latency <= 20:
                latency_score = 15
            elif latency <= 50:
                latency_score = 10
            elif latency <= 100:
                latency_score = 5
            else:
                latency_score = 0
                
            # Packet loss impact (0-20 points)  
            packet_loss = connection_data.get('packet_loss', 0)
            if packet_loss == 0:
                loss_score = 20
            elif packet_loss <= 1:
                loss_score = 15
            elif packet_loss <= 5:
                loss_score = 10
            elif packet_loss <= 10:
                loss_score = 5
            else:
                loss_score = 0
                
            # Quality impact (0-20 points)
            quality = connection_data.get('quality', 0)
            if quality >= 80:
                quality_score = 20
            elif quality >= 60:
                quality_score = 15
            elif quality >= 40:
                quality_score = 10
            elif quality >= 20:
                quality_score = 5
            else:
                quality_score = 0
                
            total_score = signal_score + latency_score + loss_score + quality_score
            return min(100.0, max(0.0, total_score))
            
        except Exception as e:
            logger.error(f"Error calculating stability score: {e}")
            return 50.0  # Default middle score