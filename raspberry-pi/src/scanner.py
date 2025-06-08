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