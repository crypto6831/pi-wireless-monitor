import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import {
  SignalCellularAlt,
  Router,
  Speed,
  AccessTime,
  WifiTethering,
  Devices,
  Radio,
  Download,
  Upload,
  Link,
  BarChart,
  Place,
} from '@mui/icons-material';

const MonitorTooltip = ({ monitor }) => {
  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getSignalQuality = (rssi) => {
    if (!rssi) return { label: 'Unknown', color: 'default' };
    if (rssi >= -50) return { label: 'Excellent', color: 'success' };
    if (rssi >= -60) return { label: 'Good', color: 'success' };
    if (rssi >= -70) return { label: 'Fair', color: 'warning' };
    if (rssi >= -80) return { label: 'Poor', color: 'error' };
    return { label: 'Very Poor', color: 'error' };
  };

  const formatDataRate = (rate) => {
    if (!rate) return 'N/A';
    if (rate >= 1000) return `${(rate / 1000).toFixed(1)} Gbps`;
    return `${rate} Mbps`;
  };

  const wifiConnection = monitor.wifiConnection || {};
  const signalQuality = getSignalQuality(wifiConnection.rssi);
  

  return (
    <Box sx={{ p: 1.5, minWidth: 280 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Router sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="subtitle2" fontWeight="bold">
          {monitor.name}
        </Typography>
        <Chip
          label={monitor.status}
          size="small"
          color={monitor.isOnline ? 'success' : 'error'}
          sx={{ ml: 'auto', height: 20 }}
        />
      </Box>
      
      <Typography variant="caption" color="text.secondary" gutterBottom>
        ID: {monitor.monitorId}
      </Typography>

      <Divider sx={{ my: 1 }} />

      {/* WiFi Connection Info */}
      {wifiConnection.ssid ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.5 }}>
            {/* SSID */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WifiTethering sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                SSID:
              </Typography>
              <Typography variant="caption" fontWeight="medium">
                {wifiConnection.ssid}
              </Typography>
            </Box>

            {/* Signal Strength */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SignalCellularAlt sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Signal:
              </Typography>
              <Typography variant="caption" fontWeight="medium">
                {wifiConnection.rssi ? `${wifiConnection.rssi} dBm` : 'N/A'}
              </Typography>
              {wifiConnection.rssi && (
                <Chip
                  label={signalQuality.label}
                  size="small"
                  color={signalQuality.color}
                  sx={{ height: 16, fontSize: '0.65rem', ml: 0.5 }}
                />
              )}
            </Box>

            {/* BSSID */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Devices sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                BSSID:
              </Typography>
              <Typography 
                variant="caption" 
                fontWeight="medium"
                sx={{ 
                  fontFamily: 'monospace',
                  fontSize: '0.7rem'
                }}
              >
                {wifiConnection.bssid || 'N/A'}
              </Typography>
            </Box>

            {/* Channel & Frequency */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Radio sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Channel:
              </Typography>
              <Typography variant="caption" fontWeight="medium">
                {wifiConnection.channel || 'N/A'}
                {wifiConnection.frequency && (
                  <strong style={{ color: '#1976d2', marginLeft: '4px' }}>
                    ({wifiConnection.frequency >= 5000 ? '5GHz' : '2.4GHz'})
                  </strong>
                )}
              </Typography>
            </Box>

            {/* RX Rate */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Download sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                RX Rate:
              </Typography>
              <Typography variant="caption" fontWeight="medium">
                {formatDataRate(wifiConnection.rxRate)}
              </Typography>
            </Box>

            {/* TX Rate */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Upload sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                TX Rate:
              </Typography>
              <Typography variant="caption" fontWeight="medium">
                {formatDataRate(wifiConnection.txRate)}
              </Typography>
            </Box>

            {/* Link Speed */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Link sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Link Speed:
              </Typography>
              <Typography variant="caption" fontWeight="medium">
                {formatDataRate(wifiConnection.linkSpeed)}
              </Typography>
            </Box>

            {/* Quality */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChart sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Quality:
              </Typography>
              <Typography variant="caption" fontWeight="medium">
                {wifiConnection.quality ? `${wifiConnection.quality}%` : 'N/A'}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />
        </>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          No WiFi connection data available
        </Typography>
      )}

      {/* Last Seen */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          Last seen:
        </Typography>
        <Typography variant="caption" fontWeight="medium">
          {formatLastSeen(monitor.lastHeartbeat)}
        </Typography>
      </Box>

      {/* Position */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        <Place sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          Position: ({monitor.position?.x || 0}, {monitor.position?.y || 0})
        </Typography>
      </Box>
    </Box>
  );
};

export default MonitorTooltip;