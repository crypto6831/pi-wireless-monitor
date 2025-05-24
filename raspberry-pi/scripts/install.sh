#!/bin/bash
# Installation script for Pi Wireless Monitor

set -e

echo "================================"
echo "Pi Wireless Monitor Installation"
echo "================================"

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo; then
    echo "Warning: This doesn't appear to be a Raspberry Pi"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install system dependencies
echo "Installing system dependencies..."
sudo apt-get install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    wireless-tools \
    net-tools \
    arp-scan \
    git

# Create virtual environment
echo "Creating Python virtual environment..."
cd /home/pi/pi-wireless-monitor/raspberry-pi
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create necessary directories
echo "Creating directories..."
sudo mkdir -p /var/log/pi-monitor
sudo mkdir -p /var/lib/pi-monitor/data
sudo chown -R pi:pi /var/log/pi-monitor
sudo chown -R pi:pi /var/lib/pi-monitor

# Copy environment file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please edit .env file with your configuration"
fi

# Install systemd service
echo "Installing systemd service..."
sudo cp scripts/pi-monitor.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pi-monitor.service

echo "================================"
echo "Installation complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Edit the .env file with your server details:"
echo "   nano /home/pi/pi-wireless-monitor/raspberry-pi/.env"
echo ""
echo "2. Start the service:"
echo "   sudo systemctl start pi-monitor"
echo ""
echo "3. Check service status:"
echo "   sudo systemctl status pi-monitor"
echo ""
echo "4. View logs:"
echo "   sudo journalctl -u pi-monitor -f"
echo "" 