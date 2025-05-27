# Issue Fixes - Authentication and Data Format Problems

## Issues Resolved

### 1. ✅ Authentication Failures Fixed
**Problem**: Pi was getting "Authentication failed - check API key" errors
**Root Cause**: Mismatch between monitor-specific API keys and global API key
**Solution**: 
- Updated authentication middleware to support both unique and global API keys
- Added fallback to global API key if monitor-specific key fails
- Created scripts to fix existing monitor records

### 2. ✅ Device Data Validation Errors Fixed  
**Problem**: Server rejecting device data with validation errors on macAddress/ipAddress
**Root Cause**: Field naming mismatch (snake_case vs camelCase)
- Pi was sending: `mac_address`, `ip_address` 
- Server expected: `macAddress`, `ipAddress`
**Solution**: Updated Pi scanner to use camelCase field names

### 3. ✅ Metrics Endpoint 500 Errors Fixed
**Problem**: Server throwing 500 errors when processing metrics data
**Root Cause**: Missing or incomplete settings.thresholds on monitor records
**Solution**: 
- Made metrics endpoint robust with default thresholds
- Updated Metric.checkAlerts() method to handle missing thresholds
- Created script to fix existing monitor settings

## Files Changed

### Server-side Fixes:
- `server/src/middleware/auth.js` - Enhanced authentication
- `server/src/routes/metrics.js` - Added default thresholds  
- `server/src/routes/networks.js` - Safe threshold access
- `server/src/models/Metric.js` - Robust alert checking
- `server/scripts/fix-monitor-auth.js` - Authentication repair
- `server/scripts/fix-monitor-settings.js` - Settings repair

### Pi-side Fixes:
- `raspberry-pi/src/scanner.py` - Fixed device data format

## What These Fixes Enable

✅ **Successful Authentication**: Pi can now authenticate with either unique or global API keys  
✅ **Device Detection**: Pi can now successfully send connected device data  
✅ **Metrics Collection**: Server can now process system/network metrics without errors  
✅ **Alert System**: Proper threshold checking and alert generation  
✅ **Backward Compatibility**: Works with existing monitor records  

## Success Indicators

After applying these fixes, you should see:
- ✅ No more "Authentication failed" errors
- ✅ No more device validation errors (400 status)
- ✅ No more metrics endpoint errors (500 status)  
- ✅ Successful device scanning: "Sent data for X devices"
- ✅ Successful network scanning: "Sent data for X networks"
- ✅ Proper metrics collection and processing

## Next Steps

1. **Restart your Docker server** to apply server-side fixes
2. **Run the database fix scripts** to update existing monitor records
3. **Pull latest changes on Pi** and restart the service
4. **Verify all data flows** are working correctly

The system should now be fully operational with all data collection features working! 