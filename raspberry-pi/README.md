# Pi Wireless Monitor - Raspberry Pi Component

This is the Raspberry Pi monitoring component of the Pi Wireless Monitor system. It runs on Raspberry Pi devices to collect wireless network data and send it to the central server.

## Features

- **WiFi Network Scanning**: Detects all available WiFi networks with detailed information
- **Signal Strength Monitoring**: Tracks RSSI values and signal quality
- **Connected Device Detection**: Identifies devices on the same network (requires arp-scan)
- **Performance Metrics**: Measures network latency, packet loss, and bandwidth
- **System Monitoring**: Tracks CPU, memory, disk usage, and temperature
- **Alert System**: Sends alerts when thresholds are exceeded
- **Automatic Retry**: Handles network failures gracefully

## Requirements

- Raspberry Pi 3B+ or newer (with WiFi capability)
- Raspbian OS (Buster or newer)
- Python 3.7+
- Root/sudo access for network scanning

## Quick Start

1. **Clone the repository** on your Raspberry Pi:
   ```bash
   cd /home/pi
   git clone https://github.com/yourusername/pi-wireless-monitor.git
   cd pi-wireless-monitor/raspberry-pi
   ```

2. **Run the installation script**:
   ```bash
   chmod +x scripts/install.sh
   ./scripts/install.sh
   ```

3. **Configure the monitor**:
   ```bash
   nano .env
   ```
   Update the following settings:
   - `SERVER_URL`: Your server's URL
   - `API_KEY`: Your API key from the server
   - `MONITOR_ID`: Unique identifier for this Pi
   - `MONITOR_NAME`: Friendly name for this monitor
   - `MONITOR_LOCATION`: Physical location

4. **Start the service**:
   ```bash
   sudo systemctl start pi-monitor
   ```

## Manual Installation

If you prefer to install manually:

1. **Install system dependencies**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y python3-pip python3-venv wireless-tools arp-scan
   ```

2. **Create virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Create configuration**:
   ```bash
   cp .env.example .env
   nano .env
   ```

5. **Run the monitor**:
   ```bash
   python src/main.py
   ```

## Configuration

All configuration is done through environment variables in the `.env` file:

### Server Settings
- `SERVER_URL`: Backend server URL
- `API_KEY`: Authentication key
- `API_TIMEOUT`: Request timeout in seconds

### Monitor Settings
- `MONITOR_ID`: Unique identifier
- `MONITOR_NAME`: Display name
- `MONITOR_LOCATION`: Physical location
- `MONITOR_INTERFACE`: WiFi interface (default: wlan0)

### Scanning Settings
- `SCAN_INTERVAL`: Network scan frequency (seconds)
- `DEEP_SCAN_INTERVAL`: Full scan frequency (seconds)
- `COLLECT_CONNECTED_DEVICES`: Enable device detection
- `BANDWIDTH_TEST_ENABLED`: Enable bandwidth testing

### Thresholds
- `MIN_SIGNAL_STRENGTH`: Alert threshold for weak signals (dBm)
- `MAX_PACKET_LOSS`: Alert threshold for packet loss (%)

## Usage

### Service Management

```bash
# Start the service
sudo systemctl start pi-monitor

# Stop the service
sudo systemctl stop pi-monitor

# Restart the service
sudo systemctl restart pi-monitor

# Check service status
sudo systemctl status pi-monitor

# View logs
sudo journalctl -u pi-monitor -f
```

### Running Manually

For testing or debugging:

```bash
cd /home/pi/pi-wireless-monitor/raspberry-pi
source venv/bin/activate
python src/main.py
```

## Troubleshooting

### Permission Errors

The monitor requires sudo privileges for network scanning. Make sure:
- The service runs as a user with sudo access
- Or add the user to the `netdev` group: `sudo usermod -a -G netdev pi`

### Network Interface Not Found

1. Check available interfaces:
   ```bash
   ip link show
   ```

2. Update `MONITOR_INTERFACE` in `.env` file

### Server Connection Failed

1. Check server is running and accessible
2. Verify `SERVER_URL` in configuration
3. Check firewall settings
4. Test connection:
   ```bash
   curl http://your-server:3001/health
   ```

### Missing Dependencies

If `arp-scan` is not available:
```bash
sudo apt-get install arp-scan
```

For WiFi tools:
```bash
sudo apt-get install wireless-tools
```

## Development

### Project Structure

```
raspberry-pi/
├── src/
│   ├── main.py           # Main application
│   ├── scanner.py        # WiFi scanning module
│   ├── metrics.py        # Performance metrics
│   ├── api_client.py     # Server communication
│   └── utils/
│       └── logger.py     # Logging utility
├── config/
│   └── config.py         # Configuration loader
├── scripts/
│   ├── install.sh        # Installation script
│   └── pi-monitor.service # Systemd service
├── requirements.txt      # Python dependencies
└── .env.example         # Configuration template
```

### Adding New Features

1. Create new module in `src/`
2. Import in `main.py`
3. Add to monitoring schedule
4. Update configuration if needed

### Testing

Run tests:
```bash
pytest tests/
```

## Security Considerations

- Keep your API key secret
- Use HTTPS for server communication in production
- Regularly update system packages
- Monitor system logs for anomalies

## Performance Tips

- Adjust `SCAN_INTERVAL` based on your needs
- Disable `BANDWIDTH_TEST_ENABLED` to reduce network usage
- Use `LOCAL_STORAGE_ENABLED` for offline capability
- Monitor CPU temperature in hot environments

## License

MIT License - see LICENSE file in the root directory
