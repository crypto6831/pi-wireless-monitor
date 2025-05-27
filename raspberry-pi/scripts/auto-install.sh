#!/bin/bash

# ============================================================================
# Pi Wireless Monitor - Fully Automated Installation Script
# ============================================================================
# This script will automatically install and configure the Pi Wireless Monitor
# for user 'admin' in /home/admin
# 
# Usage: curl -sSL https://raw.githubusercontent.com/yourusername/pi-wireless-monitor/main/raspberry-pi/scripts/auto-install.sh | bash
# Or: wget -O - https://raw.githubusercontent.com/yourusername/pi-wireless-monitor/main/raspberry-pi/scripts/auto-install.sh | bash
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PI_USER="admin"
INSTALL_DIR="/home/$PI_USER/pi-wireless-monitor"
PROJECT_REPO="https://github.com/crypto6831/pi-wireless-monitor.git"
API_KEY="PM2025-8f3a9d4e7b2c1a6f5e8d7c4b9a3e6f2d8c5b1a4e7f9c2d6a3b8e5f7c4d9a2b6e1f8c3d7a4b9e"

# Status tracking
STEPS_TOTAL=15
STEP_CURRENT=0

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "============================================================================"
    echo "$1"
    echo "============================================================================"
    echo -e "${NC}"
}

print_step() {
    STEP_CURRENT=$((STEP_CURRENT + 1))
    echo -e "${YELLOW}[$STEP_CURRENT/$STEPS_TOTAL] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root. Run as user '$PI_USER'."
        exit 1
    fi
}

check_user() {
    if [[ "$(whoami)" != "$PI_USER" ]]; then
        print_error "This script should be run as user '$PI_USER', not '$(whoami)'"
        exit 1
    fi
}

prompt_server_ip() {
    echo -e "${YELLOW}"
    echo "============================================================================"
    echo "SERVER CONFIGURATION REQUIRED"
    echo "============================================================================"
    echo "You need to provide your server's IP address where Docker is running."
    echo "This is typically your Windows machine's IP address."
    echo ""
    echo "To find your server IP:"
    echo "  Windows: Run 'ipconfig' and look for IPv4 Address"
    echo "  Linux:   Run 'ip addr' or 'hostname -I'"
    echo ""
    echo "Example: 192.168.1.100 or 192.168.0.72"
    echo "============================================================================"
    echo -e "${NC}"
    
    while true; do
        read -p "Enter your server IP address: " SERVER_IP
        if [[ $SERVER_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo -e "${GREEN}Server IP set to: $SERVER_IP${NC}"
            break
        else
            print_error "Invalid IP address format. Please try again."
        fi
    done
}

prompt_monitor_config() {
    echo -e "${YELLOW}"
    echo "============================================================================"
    echo "MONITOR CONFIGURATION"
    echo "============================================================================"
    echo -e "${NC}"
    
    read -p "Enter Monitor ID (e.g., pi-kitchen, pi-bedroom): " MONITOR_ID
    read -p "Enter Monitor Name (e.g., Kitchen Pi): " MONITOR_NAME
    read -p "Enter Monitor Location (e.g., Kitchen): " MONITOR_LOCATION
    
    echo -e "${GREEN}"
    echo "Configuration:"
    echo "  Monitor ID: $MONITOR_ID"
    echo "  Monitor Name: $MONITOR_NAME"
    echo "  Location: $MONITOR_LOCATION"
    echo -e "${NC}"
}

# ============================================================================
# Installation Steps
# ============================================================================

step1_system_check() {
    print_step "System Check and Prerequisites"
    
    # Check if running on Raspberry Pi
    if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
        print_warning "This doesn't appear to be a Raspberry Pi"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check internet connectivity
    if ! ping -c 1 google.com &> /dev/null; then
        print_error "No internet connection. Please check your network."
        exit 1
    fi
    
    # Check available space
    AVAILABLE_SPACE=$(df /home | awk 'NR==2 {print $4}')
    if [[ $AVAILABLE_SPACE -lt 1000000 ]]; then  # Less than 1GB
        print_warning "Low disk space. Available: $(($AVAILABLE_SPACE/1024))MB"
    fi
    
    print_success "System check completed"
}

step2_update_system() {
    print_step "Updating System Packages"
    
    sudo apt-get update -qq
    sudo apt-get upgrade -y -qq
    
    print_success "System updated"
}

step3_install_dependencies() {
    print_step "Installing System Dependencies"
    
    sudo apt-get install -y \
        python3-pip \
        python3-venv \
        python3-dev \
        wireless-tools \
        net-tools \
        arp-scan \
        git \
        curl \
        wget \
        htop \
        nano
    
    print_success "Dependencies installed"
}

step4_clone_repository() {
    print_step "Cloning Pi Wireless Monitor Repository"
    
    # Remove existing installation if present
    if [[ -d "$INSTALL_DIR" ]]; then
        print_warning "Existing installation found. Backing up..."
        mv "$INSTALL_DIR" "$INSTALL_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Clone repository
    git clone "$PROJECT_REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR/raspberry-pi"
    
    print_success "Repository cloned to $INSTALL_DIR"
}

step5_create_virtual_environment() {
    print_step "Creating Python Virtual Environment"
    
    cd "$INSTALL_DIR/raspberry-pi"
    python3 -m venv venv
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip -q
    
    print_success "Virtual environment created"
}

step6_install_python_packages() {
    print_step "Installing Python Dependencies"
    
    cd "$INSTALL_DIR/raspberry-pi"
    source venv/bin/activate
    
    # Install from requirements.txt
    pip install -r requirements.txt -q
    
    print_success "Python packages installed"
}

step7_create_directories() {
    print_step "Creating Required Directories"
    
    # Create log and data directories
    sudo mkdir -p /var/log/pi-monitor
    sudo mkdir -p /var/lib/pi-monitor/data
    
    # Set proper ownership
    sudo chown -R $PI_USER:$PI_USER /var/log/pi-monitor
    sudo chown -R $PI_USER:$PI_USER /var/lib/pi-monitor
    sudo chown -R $PI_USER:$PI_USER "$INSTALL_DIR"
    
    print_success "Directories created with proper permissions"
}

step8_create_configuration() {
    print_step "Creating Configuration File"
    
    cd "$INSTALL_DIR/raspberry-pi"
    
    # Create .env file
    cat > .env << EOF
# Pi Wireless Monitor Configuration
# Generated by auto-install script on $(date)

# Server connection
SERVER_URL=http://$SERVER_IP:3001
API_KEY=$API_KEY
API_TIMEOUT=30

# Monitor identification
MONITOR_ID=$MONITOR_ID
MONITOR_NAME=$MONITOR_NAME
MONITOR_LOCATION=$MONITOR_LOCATION
MONITOR_INTERFACE=wlan0

# Scanning settings
SCAN_INTERVAL=60
DEEP_SCAN_INTERVAL=300
COLLECT_CONNECTED_DEVICES=true
BANDWIDTH_TEST_ENABLED=false

# Alert thresholds
MIN_SIGNAL_STRENGTH=-80
MAX_PACKET_LOSS=5

# Logging
LOG_LEVEL=INFO
LOCAL_STORAGE_ENABLED=true

# Advanced settings
API_RETRY_ATTEMPTS=3
API_RETRY_DELAY=5
METRICS_INTERVAL=30
HEARTBEAT_INTERVAL=300
EOF
    
    print_success "Configuration file created"
}

step9_install_systemd_service() {
    print_step "Installing SystemD Service"
    
    # Update service file for admin user
    sudo tee /etc/systemd/system/pi-monitor.service > /dev/null << EOF
[Unit]
Description=Pi Wireless Monitor Service
After=network.target

[Service]
Type=simple
User=$PI_USER
WorkingDirectory=$INSTALL_DIR/raspberry-pi
Environment="PATH=$INSTALL_DIR/raspberry-pi/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=$INSTALL_DIR/raspberry-pi/venv/bin/python $INSTALL_DIR/raspberry-pi/src/main.py
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable pi-monitor.service
    
    print_success "SystemD service installed and enabled"
}

step10_test_manual_run() {
    print_step "Testing Manual Run"
    
    cd "$INSTALL_DIR/raspberry-pi"
    source venv/bin/activate
    
    print_info "Testing Python application..."
    timeout 10s python src/main.py || {
        if [[ $? -eq 124 ]]; then
            print_success "Manual test successful (timed out after 10s as expected)"
        else
            print_error "Manual test failed"
            return 1
        fi
    }
}

step11_start_service() {
    print_step "Starting Pi Monitor Service"
    
    sudo systemctl start pi-monitor.service
    sleep 3  # Give service time to start
    
    if sudo systemctl is-active --quiet pi-monitor.service; then
        print_success "Service started successfully"
    else
        print_error "Service failed to start"
        return 1
    fi
}

step12_test_connectivity() {
    print_step "Testing Server Connectivity"
    
    print_info "Testing connection to $SERVER_IP:3001..."
    
    # Test HTTP connection
    if curl -s --max-time 10 "http://$SERVER_IP:3001/health" > /dev/null; then
        print_success "Server connectivity test passed"
    else
        print_warning "Server connectivity test failed - server may not be running"
        print_info "Make sure your Docker server is running on $SERVER_IP:3001"
    fi
}

step13_configure_wifi_interface() {
    print_step "Configuring WiFi Interface"
    
    # Check WiFi interface
    WIFI_INTERFACE=$(iwconfig 2>/dev/null | grep -o '^[a-z0-9]*' | head -1)
    if [[ -z "$WIFI_INTERFACE" ]]; then
        print_warning "No WiFi interface detected"
    else
        print_success "WiFi interface detected: $WIFI_INTERFACE"
        
        # Update .env with correct interface if different
        if [[ "$WIFI_INTERFACE" != "wlan0" ]]; then
            sed -i "s/MONITOR_INTERFACE=wlan0/MONITOR_INTERFACE=$WIFI_INTERFACE/" "$INSTALL_DIR/raspberry-pi/.env"
            print_info "Updated interface to $WIFI_INTERFACE"
        fi
    fi
}

step14_setup_logrotate() {
    print_step "Setting Up Log Rotation"
    
    sudo tee /etc/logrotate.d/pi-monitor > /dev/null << EOF
/var/log/pi-monitor/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    copytruncate
    notifempty
    su $PI_USER $PI_USER
}
EOF
    
    print_success "Log rotation configured"
}

step15_final_verification() {
    print_step "Final Verification and Status Report"
    
    echo -e "${BLUE}"
    echo "============================================================================"
    echo "INSTALLATION VERIFICATION REPORT"
    echo "============================================================================"
    echo -e "${NC}"
    
    # Check service status
    echo -e "${YELLOW}Service Status:${NC}"
    if sudo systemctl is-active --quiet pi-monitor.service; then
        print_success "pi-monitor.service is running"
    else
        print_error "pi-monitor.service is not running"
    fi
    
    # Check service health
    echo -e "\n${YELLOW}Service Health:${NC}"
    sudo systemctl status pi-monitor.service --no-pager -l | head -10
    
    # Check recent logs
    echo -e "\n${YELLOW}Recent Logs:${NC}"
    sudo journalctl -u pi-monitor.service --no-pager -n 5
    
    # Check files and permissions
    echo -e "\n${YELLOW}File System Check:${NC}"
    if [[ -f "$INSTALL_DIR/raspberry-pi/.env" ]]; then
        print_success ".env configuration file exists"
    else
        print_error ".env configuration file missing"
    fi
    
    if [[ -d "$INSTALL_DIR/raspberry-pi/venv" ]]; then
        print_success "Python virtual environment exists"
    else
        print_error "Python virtual environment missing"
    fi
    
    if [[ -d "/var/log/pi-monitor" ]]; then
        print_success "Log directory exists"
    else
        print_error "Log directory missing"
    fi
    
    # Check network interface
    echo -e "\n${YELLOW}Network Interface:${NC}"
    iwconfig 2>/dev/null | grep -E "(wlan|wifi)" | head -3 || print_warning "No WiFi interface detected"
    
    # Server connectivity
    echo -e "\n${YELLOW}Server Connectivity:${NC}"
    if curl -s --max-time 5 "http://$SERVER_IP:3001/health" > /dev/null; then
        print_success "Can reach server at $SERVER_IP:3001"
    else
        print_warning "Cannot reach server at $SERVER_IP:3001"
    fi
    
    # Summary
    echo -e "\n${BLUE}============================================================================"
    echo "INSTALLATION SUMMARY"
    echo "============================================================================${NC}"
    echo "Installation Directory: $INSTALL_DIR"
    echo "Configuration File: $INSTALL_DIR/raspberry-pi/.env"
    echo "Service Name: pi-monitor.service"
    echo "Log Directory: /var/log/pi-monitor"
    echo "Server URL: http://$SERVER_IP:3001"
    echo "Monitor ID: $MONITOR_ID"
    echo "Monitor Name: $MONITOR_NAME"
    echo "Monitor Location: $MONITOR_LOCATION"
    
    print_success "Installation completed!"
}

# ============================================================================
# Main Installation Flow
# ============================================================================

main() {
    print_header "Pi Wireless Monitor - Automated Installation"
    
    # Pre-installation checks
    check_user
    check_root
    
    # Get configuration from user
    prompt_server_ip
    prompt_monitor_config
    
    echo -e "\n${GREEN}Starting installation...${NC}\n"
    
    # Run installation steps
    step1_system_check
    step2_update_system
    step3_install_dependencies
    step4_clone_repository
    step5_create_virtual_environment
    step6_install_python_packages
    step7_create_directories
    step8_create_configuration
    step9_install_systemd_service
    step10_test_manual_run
    step11_start_service
    step12_test_connectivity
    step13_configure_wifi_interface
    step14_setup_logrotate
    step15_final_verification
    
    echo -e "\n${GREEN}"
    echo "============================================================================"
    echo "🎉 INSTALLATION COMPLETE!"
    echo "============================================================================"
    echo -e "${NC}"
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Check service status: sudo systemctl status pi-monitor"
    echo "2. View live logs: sudo journalctl -u pi-monitor -f"
    echo "3. Open dashboard: http://$SERVER_IP:3000"
    echo "4. Check troubleshooting guide if needed: $INSTALL_DIR/Common Service Failure Causes & Solutions.txt"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  sudo systemctl restart pi-monitor  # Restart service"
    echo "  sudo systemctl stop pi-monitor     # Stop service"
    echo "  sudo systemctl start pi-monitor    # Start service"
    echo "  nano $INSTALL_DIR/raspberry-pi/.env  # Edit configuration"
}

# ============================================================================
# Script Entry Point
# ============================================================================

# Check if running with bash
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 