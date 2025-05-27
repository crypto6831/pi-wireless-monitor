# Automated Pi Installation Guide

This guide covers the fully automated installation script for the Pi Wireless Monitor.

## 🚀 **Quick Start**

### **Prerequisites**
- Raspberry Pi with Raspberry Pi OS installed
- User account named `admin` (not `pi`)
- WiFi connected and working
- Internet connection
- SSH access (optional, can run directly on Pi)

### **One-Command Installation**

Run this single command as user `admin`:

```bash
# Download and run the automated installer
curl -sSL https://raw.githubusercontent.com/crypto6831/pi-wireless-monitor/main/raspberry-pi/scripts/auto-install.sh | bash
```

**Alternative download method:**
```bash
wget -O - https://raw.githubusercontent.com/crypto6831/pi-wireless-monitor/main/raspberry-pi/scripts/auto-install.sh | bash
```

## 📋 **What the Script Does**

The automated installer performs **15 comprehensive steps**:

### **Step 1-3: System Preparation**
- ✅ Checks if running on Raspberry Pi
- ✅ Verifies internet connectivity  
- ✅ Updates system packages
- ✅ Installs all required dependencies

### **Step 4-6: Software Installation**
- ✅ Clones the Pi Wireless Monitor repository
- ✅ Creates Python virtual environment
- ✅ Installs all Python dependencies

### **Step 7-9: Configuration**
- ✅ Creates required directories with proper permissions
- ✅ Generates configuration file (.env)
- ✅ Installs and enables systemd service

### **Step 10-12: Testing & Verification**
- ✅ Tests manual run of the application
- ✅ Starts the pi-monitor service
- ✅ Tests connectivity to your server

### **Step 13-15: Final Setup**
- ✅ Configures WiFi interface automatically
- ✅ Sets up log rotation
- ✅ Comprehensive verification and status report

## 📝 **Interactive Configuration**

During installation, you'll be prompted for:

### **Server IP Configuration**
```
Enter your server IP address: 192.168.0.72
```
*This is the IP address of your Windows machine running Docker*

### **Monitor Configuration**
```
Enter Monitor ID (e.g., pi-kitchen, pi-bedroom): pi-living-room
Enter Monitor Name (e.g., Kitchen Pi): Living Room Pi  
Enter Monitor Location (e.g., Kitchen): Living Room
```

## 📊 **Installation Output Example**

```
============================================================================
Pi Wireless Monitor - Automated Installation
============================================================================

[1/15] System Check and Prerequisites
✅ System check completed

[2/15] Updating System Packages  
✅ System updated

[3/15] Installing System Dependencies
✅ Dependencies installed

[4/15] Cloning Pi Wireless Monitor Repository
✅ Repository cloned to /home/admin/pi-wireless-monitor

[5/15] Creating Python Virtual Environment
✅ Virtual environment created

... (continues for all 15 steps)

============================================================================
🎉 INSTALLATION COMPLETE!
============================================================================
```

## 🔍 **Final Verification Report**

The script provides a comprehensive verification report:

```
============================================================================
INSTALLATION VERIFICATION REPORT
============================================================================

Service Status:
✅ pi-monitor.service is running

Service Health:
● pi-monitor.service - Pi Wireless Monitor Service
   Loaded: loaded (/etc/systemd/system/pi-monitor.service; enabled)
   Active: active (running) since...

Recent Logs:
INFO - Pi Wireless Monitor Starting
INFO - Monitor registered with server
INFO - Initialization complete

File System Check:
✅ .env configuration file exists
✅ Python virtual environment exists  
✅ Log directory exists

Network Interface:
wlan0     IEEE 802.11  ESSID:"YourWiFiNetwork"

Server Connectivity:
✅ Can reach server at 192.168.0.72:3001

============================================================================
INSTALLATION SUMMARY
============================================================================
Installation Directory: /home/admin/pi-wireless-monitor
Configuration File: /home/admin/pi-wireless-monitor/raspberry-pi/.env
Service Name: pi-monitor.service
Log Directory: /var/log/pi-monitor
Server URL: http://192.168.0.72:3001
Monitor ID: pi-living-room
Monitor Name: Living Room Pi
Monitor Location: Living Room
```

## 🛠️ **Post-Installation Commands**

After installation, use these commands:

### **Service Management**
```bash
# Check service status
sudo systemctl status pi-monitor

# Restart service
sudo systemctl restart pi-monitor

# Stop service  
sudo systemctl stop pi-monitor

# Start service
sudo systemctl start pi-monitor

# View live logs
sudo journalctl -u pi-monitor -f
```

### **Configuration**
```bash
# Edit configuration
nano /home/admin/pi-wireless-monitor/raspberry-pi/.env

# After editing config, restart service
sudo systemctl restart pi-monitor
```

## 🔧 **Troubleshooting**

### **If Installation Fails**
1. **Check error messages** in the colored output
2. **Ensure running as user `admin`** (not root, not pi)
3. **Verify internet connection**: `ping google.com`
4. **Check disk space**: `df -h`

### **If Service Fails to Start**
1. **Check service logs**: `sudo journalctl -u pi-monitor --no-pager -n 20`
2. **Test manual run**: 
   ```bash
   cd /home/admin/pi-wireless-monitor/raspberry-pi
   source venv/bin/activate
   python src/main.py
   ```
3. **Verify server is running** on your Windows machine
4. **Check network connectivity**: `curl http://YOUR_SERVER_IP:3001/health`

### **Common Issues**
- **Wrong user**: Script must run as `admin`, not `pi` or `root`
- **Server not running**: Ensure Docker containers are running on server
- **Network issues**: Check WiFi connection and server IP
- **Permission errors**: Script handles permissions automatically

## 📞 **Getting Help**

If you encounter issues:
1. **Check the verification report** at the end of installation
2. **Review service logs**: `sudo journalctl -u pi-monitor -f`
3. **Consult troubleshooting guide**: `/home/admin/pi-wireless-monitor/Common Service Failure Causes & Solutions.txt`
4. **Test server connectivity**: Ensure your Docker server is accessible

## 🔄 **Re-running Installation**

The script can be safely re-run:
- **Existing installations are backed up** automatically
- **Configuration prompts will ask again** for server IP and monitor details
- **All steps are idempotent** and can be repeated safely

```bash
# Re-run installation  
curl -sSL https://raw.githubusercontent.com/crypto6831/pi-wireless-monitor/main/raspberry-pi/scripts/auto-install.sh | bash
```

## ✅ **Success Indicators**

Installation is successful when:
- ✅ All 15 steps complete without errors
- ✅ Service status shows "active (running)"
- ✅ Server connectivity test passes
- ✅ Pi appears in dashboard at `http://YOUR_SERVER_IP:3000`
- ✅ Live logs show network scanning activity

Your Pi Wireless Monitor is now ready to collect and send WiFi network data to your central dashboard! 