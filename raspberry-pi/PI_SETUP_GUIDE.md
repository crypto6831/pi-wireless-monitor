# Raspberry Pi Setup Guide for WiFi Monitor

This guide will help you set up a Raspberry Pi from scratch for the Pi Wireless Monitor project.

## Recommended Hardware

- **Raspberry Pi 4** (4GB RAM recommended, 2GB minimum)
- **High-quality SD card** (32GB Class 10 or better)
- **Official Raspberry Pi Power Supply** (5V 3A USB-C)
- **Ethernet cable** (for initial setup, optional)
- **Case with good ventilation** (recommended for 24/7 operation)

## Step 1: Download and Install Raspberry Pi OS

### Option A: Using Raspberry Pi Imager (Recommended)

1. **Download Raspberry Pi Imager**:
   - Visit: https://www.raspberrypi.org/software/
   - Download for Windows, Mac, or Linux
   - Install the application

2. **Prepare SD Card**:
   - Insert SD card (32GB+ recommended)
   - **Backup any existing data** - this process will erase everything

3. **Flash the OS**:
   - Open Raspberry Pi Imager
   - Click "CHOOSE OS"
   - Select: **"Raspberry Pi OS (64-bit)"** 
   - For headless setup: Choose **"Raspberry Pi OS Lite (64-bit)"**
   - Click "CHOOSE STORAGE" and select your SD card

4. **Configure Advanced Settings** (Click ⚙️ gear icon):
   ```
   ✅ Enable SSH
   ✅ Use password authentication
   Username: pimonitor (or your preference)
   Password: [choose a secure password]
   
   ✅ Configure wireless LAN
   SSID: [your WiFi network name]
   Password: [your WiFi password]
   Country: [your country code, e.g., US]
   
   ✅ Set locale settings
   Time zone: [your timezone]
   Keyboard layout: [your keyboard layout]
   ```

5. **Write to SD Card**:
   - Click "WRITE"
   - Wait for the process to complete (5-10 minutes)
   - Safely eject the SD card

## Step 2: First Boot and Initial Setup

1. **Insert SD card** into Raspberry Pi
2. **Connect power** - Pi will boot automatically
3. **Wait 2-3 minutes** for first boot completion
4. **Find Pi's IP address**:
   - Check your router's admin panel, or
   - Use network scanner: `nmap -sn 192.168.1.0/24`
   - Look for "Raspberry Pi Foundation" device

## Step 3: Connect via SSH

```bash
# Replace with your Pi's actual IP address
ssh pimonitor@192.168.1.XXX

# First time connection will ask to confirm fingerprint - type "yes"
# Enter the password you set during imaging
```

## Step 4: System Update and Basic Setup

```bash
# Update package lists and upgrade system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git python3-pip python3-venv wireless-tools net-tools curl

# Verify WiFi functionality
iwconfig
iwlist wlan0 scan | head -20

# Check system info
cat /proc/cpuinfo | grep "Raspberry Pi"
free -h
df -h
```

## Step 5: Install Pi Wireless Monitor

### Clone the Repository

```bash
# Navigate to home directory
cd $HOME

# Clone the project (replace with your actual repository URL)
git clone https://github.com/yourusername/pi-wireless-monitor.git

# Navigate to the Pi component
cd pi-wireless-monitor/raspberry-pi
```

### Run Automated Installation

```bash
# Make installation script executable
chmod +x scripts/install.sh

# Run the installation script
./scripts/install.sh
```

### Manual Installation (Alternative)

If the automated script doesn't work:

```bash
# Install system dependencies
sudo apt install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    wireless-tools \
    net-tools \
    arp-scan \
    git

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
sudo mkdir -p /var/log/pi-monitor
sudo mkdir -p /var/lib/pi-monitor/data
sudo chown -R $USER:$USER /var/log/pi-monitor
sudo chown -R $USER:$USER /var/lib/pi-monitor
```

## Step 6: Configure the Monitor

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### Required Configuration (.env file):

```env
# Server connection
SERVER_URL=http://your-server-ip:3001
API_TIMEOUT=30

# Monitor identification
MONITOR_ID=pi-001
MONITOR_NAME=Living Room Monitor
MONITOR_LOCATION=Living Room
MONITOR_INTERFACE=wlan0

# Scanning settings
SCAN_INTERVAL=60
DEEP_SCAN_INTERVAL=300
COLLECT_CONNECTED_DEVICES=true
BANDWIDTH_TEST_ENABLED=false

# Thresholds
MIN_SIGNAL_STRENGTH=-80
MAX_PACKET_LOSS=5

# Logging
LOG_LEVEL=INFO
LOCAL_STORAGE_ENABLED=true
```

## Step 7: Start the Service

### Test Run (Manual)

```bash
# Test the monitor manually first
cd $HOME/pi-wireless-monitor/raspberry-pi
source venv/bin/activate
python src/main.py
```

### Install as System Service

```bash
# Install systemd service
sudo cp scripts/pi-monitor.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pi-monitor.service

# Start the service
sudo systemctl start pi-monitor

# Check service status
sudo systemctl status pi-monitor

# View logs
sudo journalctl -u pi-monitor -f
```

## Step 8: Verify Operation

### Check Service Status

```bash
# Service status
sudo systemctl status pi-monitor

# Recent logs
sudo journalctl -u pi-monitor --no-pager -n 50

# Real-time logs
sudo journalctl -u pi-monitor -f
```

### Test Network Scanning

```bash
# Manual WiFi scan
sudo iwlist wlan0 scan | grep ESSID

# Check if monitor can reach server
curl http://your-server-ip:3001/health
```

## Troubleshooting

### Common Issues

#### 1. Cannot SSH to Pi
- Check if SSH is enabled in advanced settings
- Verify Pi is connected to WiFi
- Try ethernet connection instead
- Check if IP address is correct

#### 2. WiFi Not Working
```bash
# Check WiFi interface
iwconfig

# Check network configuration
cat /etc/wpa_supplicant/wpa_supplicant.conf

# Restart WiFi
sudo systemctl restart wpa_supplicant
sudo ifconfig wlan0 down && sudo ifconfig wlan0 up
```

#### 3. Service Won't Start
```bash
# Check detailed service status
sudo systemctl status pi-monitor -l

# Check Python virtual environment
source venv/bin/activate
python src/main.py

# Check permissions
ls -la /var/log/pi-monitor
ls -la /var/lib/pi-monitor
```

#### 4. Cannot Connect to Server
- Verify server is running: `curl http://server-ip:3001/health`
- Check firewall settings on server
- Verify API_KEY in .env file
- Check network connectivity: `ping server-ip`

### Performance Optimization

#### For 24/7 Operation

```bash
# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable hciuart

# Configure log rotation
sudo nano /etc/logrotate.d/pi-monitor
```

#### Memory Optimization

```bash
# Check memory usage
free -h
top

# If memory is limited, disable GUI
sudo systemctl set-default multi-user.target
```

## Security Considerations

1. **Change default passwords**
2. **Enable firewall if needed**:
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   ```
3. **Keep system updated**:
   ```bash
   sudo apt update && sudo apt upgrade
   ```
4. **Use strong WiFi encryption** (WPA3/WPA2)
5. **Secure your server connection** (HTTPS in production)

## Maintenance

### Regular Tasks

```bash
# Weekly system update
sudo apt update && sudo apt upgrade -y

# Check service health
sudo systemctl status pi-monitor

# Check disk space
df -h

# Check logs for errors
sudo journalctl -u pi-monitor --since "1 week ago" | grep -i error
```

### Backup Configuration

```bash
# Backup your configuration
cp .env .env.backup
tar -czf pi-monitor-config-$(date +%Y%m%d).tar.gz .env logs/
```

## Advanced Configuration

### Multiple Monitors

To run multiple monitors on the same Pi (different interfaces):

```bash
# Copy configuration for second interface
cp .env .env.wlan1
# Edit .env.wlan1 with different MONITOR_ID and MONITOR_INTERFACE=wlan1
```

### Custom Alerting

Edit thresholds in `.env`:
```env
MIN_SIGNAL_STRENGTH=-75
MAX_PACKET_LOSS=3
MAX_CPU_TEMP=70
```

### Performance Monitoring

```bash
# Monitor system resources
htop

# Monitor network usage
iftop

# Monitor WiFi signal
watch -n 5 'iwconfig wlan0'
```

## Getting Help

1. **Check logs**: `sudo journalctl -u pi-monitor -f`
2. **Test manually**: Run `python src/main.py` in the virtual environment
3. **Check server connection**: Verify server is accessible
4. **Review configuration**: Ensure all settings in `.env` are correct
5. **System resources**: Check if Pi has enough memory/storage

## Next Steps

After successful setup:
1. **Monitor the dashboard** - Check if data appears in the web interface
2. **Set up multiple Pis** - Repeat this process for additional monitoring points
3. **Configure alerts** - Set up proper alerting thresholds
4. **Schedule maintenance** - Set up automatic updates and monitoring 