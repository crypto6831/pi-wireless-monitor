# Troubleshooting Guide

## Common Issues and Solutions

### DNS Latency "N/A" Issue (RESOLVED)

**Problem**: DNS latency and Stability Score showed "N/A" for min/max values in Performance Summary

**Root Causes**:
1. **Missing Database Aggregation**: MongoDB queries lacked `minDnsLatency`, `maxDnsLatency`, `minStabilityScore`, `maxStabilityScore`
2. **API Response Incomplete**: Backend didn't return min/max values in performance metrics
3. **Frontend Hardcoded**: Dashboard had literal "N/A" text instead of using actual data

**Files Fixed**:
- `server/src/models/SSIDConnection.js` - Database aggregation
- `server/src/routes/ssidAnalyzer.js` - API response structure  
- `dashboard/src/pages/SSIDAnalyzer.js` - Frontend display logic

**Solution Pattern**:
```javascript
// Database aggregation pattern
avgDnsLatency: { $avg: '$dnsLatency' },
minDnsLatency: { $min: '$dnsLatency' },  // <- Added
maxDnsLatency: { $max: '$dnsLatency' },  // <- Added

// API response pattern  
dns: {
  avg: metrics.avgDnsLatency,
  min: metrics.minDnsLatency,    // <- Added
  max: metrics.maxDnsLatency     // <- Added
}

// Frontend display pattern
{formatLatency(performanceData.metrics?.latency?.dns?.min)}  // <- Not "N/A"
```

### Networks Tab "No Networks Detected" Bug (RESOLVED)

**Problem**: Networks tab showed "No networks detected" despite data in database

**Root Cause**: Redux slice API import/usage mismatch - trying to use `api.get()` directly instead of `apiService.getNetworks()`

**Solution**: Import `apiService` instead of `api` and use proper service methods

**Debugging Commands**:
```bash
# Check API data exists
curl -s http://localhost:3001/api/networks | grep -o '"ssid":"[^"]*"' | head -10

# Check API service functions
grep -n "getNetworks\|fetchNetworkStats" dashboard/src/services/api.js

# Check Redux slice imports
grep -n "import.*api" dashboard/src/store/slices/*.js
```

### Floor Plan Upload Issues (RESOLVED)

**Problem**: Upload button appeared non-functional and images showed 404 errors

**Solutions**:
- Added helpful UI feedback showing "(Select floor first)" when disabled
- Improved error handling to distinguish missing files from missing floor plans
- Removed confusing context menu options

### MUI X-Charts Label Visibility (RESOLVED)

**Problem**: Y-axis labels not visible in charts due to MUI X-Charts rendering issues

**Solution**: Custom positioned Typography elements with CSS transforms instead of built-in label properties

## Debugging "No Data Showing" Issues

### General Debugging Process
1. **Verify Backend Data**: Check database and API endpoints directly
2. **Add Console Logging**: Debug Redux slices and components
3. **Check Error Logs**: Look for rejected Redux actions
4. **API Service Verification**: Ensure consistent API service usage

### Key Debugging Commands
```bash
# Check API endpoints
curl -s http://localhost:3001/api/[endpoint] | head -200

# Check specific monitor data
curl -s http://localhost:3001/api/ssid-analyzer/status/PI-living

# Check DNS latency values
curl -s http://localhost:3001/api/ssid-analyzer/performance/PI-living | python3 -c "import json, sys; data=json.load(sys.stdin); print('DNS:', data['data']['metrics']['latency']['dns'])"
```

### Mock Data Generation for Testing
```bash
# Mock SSID connection data
docker-compose exec server node scripts/mock-ssid-data.js test 5

# Real DNS latency measurements  
docker-compose exec server node scripts/nodejs-dns-latency.js test 5
```

## Performance Optimization

### Docker Cache Issues
- Use `--no-cache` flag for problematic builds
- Remove images completely when needed
- Restart containers multiple times to clear React dev server cache

### API Import/Export Issues
- Ensure `apiService` object is exported as default, not raw Axios instance
- Check for consistent import patterns across Redux slices
- Verify API service functions match Redux slice calls

## Prevention Strategies

### Code Quality Checks
- Always verify API service exports match Redux slice imports
- Check entire data pipeline: database → API → frontend when debugging missing data
- Use consistent error handling patterns across components
- Add comprehensive logging for debugging data flow issues