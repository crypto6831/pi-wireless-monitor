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
import netifaces
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
            interfaces = netifaces.interfaces()
            if self.interface not in interfaces:
                raise ValueError(f"Interface {self.interface} not found. Available: {interfaces}")
            
            # Check if it's a wireless interface
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
        """Get information about the wireless interface"""
        info = {
            'interface': self.interface,
            'mac_address': '',
            'ip_address': '',
            'mode': '',
            'connected_ssid': '',
            'tx_power': 0,
            'link_quality': 0
        }
        
        try:
            # Get MAC address
            addrs = netifaces.ifaddresses(self.interface)
            if netifaces.AF_LINK in addrs:
                info['mac_address'] = addrs[netifaces.AF_LINK][0]['addr']
            
            # Get IP address
            if netifaces.AF_INET in addrs:
                info['ip_address'] = addrs[netifaces.AF_INET][0]['addr']
            
            # Get wireless info using iwconfig
            result = subprocess.run(
                ['iwconfig', self.interface],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                output = result.stdout
                
                # Extract mode
                mode_match = re.search(r'Mode:(\w+)', output)
                if mode_match:
                    info['mode'] = mode_match.group(1)
                
                # Extract connected SSID
                ssid_match = re.search(r'ESSID:"([^"]*)"', output)
                if ssid_match:
                    info['connected_ssid'] = ssid_match.group(1)
                
                # Extract TX power
                tx_match = re.search(r'Tx-Power=(\d+) dBm', output)
                if tx_match:
                    info['tx_power'] = int(tx_match.group(1))
                
                # Extract link quality
                quality_match = re.search(r'Link Quality=(\d+)/(\d+)', output)
                if quality_match:
                    quality = int(quality_match.group(1))
                    max_quality = int(quality_match.group(2))
                    info['link_quality'] = int((quality / max_quality) * 100)
            
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
            # Get current network gateway
            gateways = netifaces.gateways()
            if 'default' not in gateways or netifaces.AF_INET not in gateways['default']:
                logger.warning("No default gateway found")
                return devices
            
            gateway_ip = gateways['default'][netifaces.AF_INET][0]
            
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
                device = {
                    'ip_address': parts[0].strip(),
                    'mac_address': parts[1].strip(),
                    'manufacturer': parts[2].strip() if len(parts) > 2 else 'Unknown',
                    'timestamp': datetime.utcnow().isoformat()
                }
                devices.append(device)
        
        return devices 