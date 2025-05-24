# Step 6: Configure the Monitor (DETAILED GUIDE)

This is a detailed explanation of how to configure your Raspberry Pi monitor.

## What You're Doing

You need to tell your Raspberry Pi:
1. **Where your server is** (IP address)
2. **What to call itself** (unique name and ID)
3. **How often to scan** for WiFi networks
4. **What WiFi interface to use** (usually wlan0)

## Step 6A: Create Configuration File

```bash
# Make sure you're in the right directory
cd $HOME/pi-wireless-monitor/raspberry-pi

# Copy the example configuration to create your real one
cp .env.example .env

# Check that the file was created
ls -la .env
```

## Step 6B: Find Your Server IP Address

**Before editing the config**, you need to know where your backend server is running.

### If server is on the same computer as this guide:
```bash
# From your Windows computer where you're running the server
ipconfig
# Look for your local IP (usually starts with 192.168.x.x or 10.x.x.x)
```

### If server is on a different computer:
- Check that computer's IP address
- Make sure the server is running on port 3001
- Test connection: `curl http://SERVER-IP:3001/health`

### Example server IPs:
- `192.168.1.100` (if server is on computer with this IP)
- `192.168.1.150` (if server is on different computer)
- `10.0.0.50` (different network range)

## Step 6C: Edit Configuration File

```bash
# Open the configuration file for editing
nano .env
```

This will open a text editor. Use arrow keys to move around.

## Step 6D: Fill In Each Setting

Here's what each setting means and example values:

### 1. Server Connection
```env
# Replace 192.168.1.100 with YOUR server's actual IP address
SERVER_URL=http://192.168.1.100:3001
API_TIMEOUT=30
```

**How to find this:**
- Run `ipconfig` on your Windows computer running the server
- Use that IP address
- Keep the `:3001` port number

### 2. Monitor Identification
```env
# Make each Pi unique - if you have multiple Pis, use different IDs
MONITOR_ID=pi-living-room
MONITOR_NAME=Living Room Monitor
MONITOR_LOCATION=Living Room, Main Floor
MONITOR_INTERFACE=wlan0
```

**Examples for multiple Pis:**
- Pi #1: `MONITOR_ID=pi-kitchen`, `MONITOR_NAME=Kitchen Monitor`
- Pi #2: `MONITOR_ID=pi-bedroom`, `MONITOR_NAME=Bedroom Monitor`
- Pi #3: `MONITOR_ID=pi-office`, `MONITOR_NAME=Office Monitor`

### 3. Scanning Settings
```env
# How often to scan (in seconds)
SCAN_INTERVAL=60                # Scan every 1 minute
DEEP_SCAN_INTERVAL=300          # Deep scan every 5 minutes
COLLECT_CONNECTED_DEVICES=true  # Try to find connected devices
BANDWIDTH_TEST_ENABLED=false    # Don't do speed tests (uses data)
```

**Recommendations:**
- **Home use**: `SCAN_INTERVAL=60` (every minute)
- **Office use**: `SCAN_INTERVAL=30` (every 30 seconds)
- **Low data**: Keep `BANDWIDTH_TEST_ENABLED=false`

### 4. Alert Thresholds
```env
# When to send alerts
MIN_SIGNAL_STRENGTH=-80         # Alert if WiFi signal below -80 dBm
MAX_PACKET_LOSS=5              # Alert if packet loss above 5%
```

**Signal strength guide:**
- `-50 dBm` = Excellent signal
- `-60 dBm` = Good signal
- `-70 dBm` = Fair signal
- `-80 dBm` = Poor signal (alert threshold)
- `-90 dBm` = Very poor signal

### 5. Logging
```env
LOG_LEVEL=INFO                  # How much detail in logs
LOCAL_STORAGE_ENABLED=true      # Save data locally as backup
```

## Step 6E: Complete Example Configuration

Here's a complete `.env` file example:

```env
# Server connection (CHANGE THIS IP!)
SERVER_URL=http://192.168.1.100:3001
API_TIMEOUT=30

# Monitor identification (MAKE THESE UNIQUE!)
MONITOR_ID=pi-living-room
MONITOR_NAME=Living Room Monitor
MONITOR_LOCATION=Living Room, Main Floor
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
```

## Step 6F: Save and Exit

In the nano editor:
1. **Save**: Press `Ctrl + O`, then `Enter`
2. **Exit**: Press `Ctrl + X`

## Step 6G: Verify Configuration

```bash
# Check that your file looks correct
cat .env

# Test if you can reach your server
curl http://192.168.1.100:3001/health
# (Replace 192.168.1.100 with your actual server IP)
```

**Expected response from server:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

## Troubleshooting Configuration

### Can't reach server?
```bash
# Check if server is running
ping 192.168.1.100

# Check if port 3001 is open
curl -v http://192.168.1.100:3001/health
```

### Wrong WiFi interface?
```bash
# See all network interfaces
iwconfig

# Common interfaces:
# wlan0 - first WiFi adapter
# wlan1 - second WiFi adapter (if you have USB WiFi)
```

### File not saving?
```bash
# Check file permissions
ls -la .env

# If needed, fix permissions
chmod 644 .env
```

## What Happens Next

After configuration:
1. **Step 7**: Start the monitoring service
2. **Step 8**: Verify it's working
3. Your Pi will connect to the server and start sending WiFi data
4. You'll see the data appear in your web dashboard

## Multiple Raspberry Pis

If you're setting up multiple Pis, **each one needs unique values**:

**Pi #1 (.env):**
```env
MONITOR_ID=pi-kitchen
MONITOR_NAME=Kitchen Monitor
MONITOR_LOCATION=Kitchen, Ground Floor
```

**Pi #2 (.env):**
```env
MONITOR_ID=pi-bedroom
MONITOR_NAME=Bedroom Monitor  
MONITOR_LOCATION=Master Bedroom, Second Floor
```

All Pis can use the same `SERVER_URL` (they all connect to the same backend server). 