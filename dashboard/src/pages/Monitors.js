import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import {
  Computer as ComputerIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Thermostat as ThermostatIcon,
  NetworkCheck as NetworkIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Wifi as WifiIcon,
  Router as RouterIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { fetchMonitors, fetchMonitorStats } from '../store/slices/monitorsSlice';
import { fetchLatestMetrics } from '../store/slices/metricsSlice';
import ServiceMonitorsList from '../components/monitors/ServiceMonitorsList';

function Monitors() {
  const dispatch = useDispatch();
  const { list: monitors, loading, stats } = useSelector((state) => state.monitors);
  const metrics = useSelector((state) => state.metrics.latest);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState(null);

  useEffect(() => {
    dispatch(fetchMonitors());
  }, [dispatch]);

  useEffect(() => {
    // Fetch stats and metrics for each monitor
    monitors.forEach(monitor => {
      dispatch(fetchMonitorStats(monitor.monitorId));
      dispatch(fetchLatestMetrics(monitor.monitorId));
    });
  }, [monitors, dispatch]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckIcon color="success" />;
      case 'inactive':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <ErrorIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getSignalQuality = (rssi) => {
    if (!rssi) return { label: 'Unknown', color: 'text.secondary' };
    if (rssi >= -50) return { label: 'Excellent', color: 'success.main' };
    if (rssi >= -60) return { label: 'Good', color: 'success.main' };
    if (rssi >= -70) return { label: 'Fair', color: 'warning.main' };
    if (rssi >= -80) return { label: 'Poor', color: 'error.main' };
    return { label: 'Very Poor', color: 'error.main' };
  };

  const formatDataRate = (rate) => {
    if (!rate) return 'N/A';
    if (rate >= 1000) return `${(rate / 1000).toFixed(1)} Gbps`;
    return `${rate} Mbps`;
  };

  const getBandFromFrequency = (frequency) => {
    if (!frequency) return '';
    return frequency >= 5000 ? '5GHz' : '2.4GHz';
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Monitors
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom>
        Monitors
      </Typography>

      <Grid container spacing={3}>
        {monitors.map((monitor) => {
          const monitorMetrics = metrics[monitor.monitorId];
          const monitorStats = stats[monitor.monitorId];

          return (
            <Grid item xs={12} md={6} lg={4} key={monitor.monitorId}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <ComputerIcon />
                      <Typography variant="h6">
                        {monitor.name}
                      </Typography>
                    </Box>
                    <Chip
                      icon={getStatusIcon(monitor.status)}
                      label={monitor.status}
                      color={getStatusColor(monitor.status)}
                      size="small"
                    />
                  </Box>

                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <LocationIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Location"
                        secondary={monitor.location || 'Not specified'}
                      />
                    </ListItem>

                    <ListItem>
                      <ListItemIcon>
                        <NetworkIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Monitor ID"
                        secondary={monitor.monitorId}
                      />
                    </ListItem>

                    <ListItem>
                      <ListItemIcon>
                        <TimeIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Last Heartbeat"
                        secondary={monitor.lastHeartbeat ? new Date(monitor.lastHeartbeat).toLocaleString() : 'Never'}
                      />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  {/* System Info */}
                  <Typography variant="subtitle2" gutterBottom>
                    System Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Platform"
                        secondary={`${monitor.systemInfo?.platform || 'Unknown'} (${monitor.systemInfo?.architecture || 'Unknown'})`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Hostname"
                        secondary={monitor.systemInfo?.hostname || 'Unknown'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Uptime"
                        secondary={monitor.uptime ? formatUptime(monitor.uptime) : 'Unknown'}
                      />
                    </ListItem>
                  </List>

                  {/* Latest Metrics */}
                  {monitorMetrics && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Current Metrics
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={4}>
                          <Box textAlign="center">
                            <MemoryIcon color="primary" />
                            <Typography variant="body2">CPU</Typography>
                            <Typography variant="h6">
                              {monitorMetrics.system?.cpuPercent?.toFixed(0) || 0}%
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box textAlign="center">
                            <StorageIcon color="primary" />
                            <Typography variant="body2">Memory</Typography>
                            <Typography variant="h6">
                              {monitorMetrics.system?.memoryPercent?.toFixed(0) || 0}%
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box textAlign="center">
                            <ThermostatIcon color="primary" />
                            <Typography variant="body2">Temp</Typography>
                            <Typography variant="h6">
                              {monitorMetrics.system?.temperature?.toFixed(0) || 0}°C
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </>
                  )}

                  {/* WiFi Connection Details */}
                  {monitor.wifiConnection && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        WiFi Connection
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <WifiIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="SSID"
                            secondary={monitor.wifiConnection.ssid || 'Unknown'}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <RouterIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="BSSID"
                            secondary={
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {monitor.wifiConnection.bssid || 'Unknown'}
                              </Typography>
                            }
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Signal Strength (RSSI)"
                            secondary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">
                                  {monitor.wifiConnection.rssi ? `${monitor.wifiConnection.rssi} dBm` : 'Unknown'}
                                </Typography>
                                {monitor.wifiConnection.rssi && (
                                  <Chip
                                    label={getSignalQuality(monitor.wifiConnection.rssi).label}
                                    size="small"
                                    sx={{ 
                                      backgroundColor: getSignalQuality(monitor.wifiConnection.rssi).color,
                                      color: 'white',
                                      fontSize: '0.75rem'
                                    }}
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Channel"
                            secondary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">
                                  {monitor.wifiConnection.channel || 'Unknown'}
                                </Typography>
                                {monitor.wifiConnection.frequency && (
                                  <Chip
                                    label={getBandFromFrequency(monitor.wifiConnection.frequency)}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Frequency"
                            secondary={monitor.wifiConnection.frequency ? `${monitor.wifiConnection.frequency} MHz` : 'Unknown'}
                          />
                        </ListItem>
                        <Grid container spacing={1} sx={{ px: 2, py: 1 }}>
                          <Grid item xs={4}>
                            <Box textAlign="center">
                              <SpeedIcon color="primary" fontSize="small" />
                              <Typography variant="caption" display="block">RX Rate</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {formatDataRate(monitor.wifiConnection.rxRate)}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box textAlign="center">
                              <SpeedIcon color="primary" fontSize="small" />
                              <Typography variant="caption" display="block">TX Rate</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {formatDataRate(monitor.wifiConnection.txRate)}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box textAlign="center">
                              <SpeedIcon color="primary" fontSize="small" />
                              <Typography variant="caption" display="block">Link Speed</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {formatDataRate(monitor.wifiConnection.linkSpeed)}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                        <ListItem>
                          <ListItemText 
                            primary="Quality"
                            secondary={monitor.wifiConnection.quality ? `${monitor.wifiConnection.quality}%` : 'Unknown'}
                          />
                        </ListItem>
                        {monitor.wifiConnection.lastUpdated && (
                          <ListItem>
                            <ListItemIcon>
                              <TimeIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Last Updated"
                              secondary={new Date(monitor.wifiConnection.lastUpdated).toLocaleString()}
                            />
                          </ListItem>
                        )}
                      </List>
                    </>
                  )}

                  {/* Stats */}
                  {monitorStats && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Statistics
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Networks Detected
                          </Typography>
                          <Typography variant="h6">
                            {monitorStats.networksDetected || 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Devices Connected
                          </Typography>
                          <Typography variant="h6">
                            {monitorStats.devicesConnected || 0}
                          </Typography>
                        </Grid>
                      </Grid>
                    </>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary">
                    View Details
                  </Button>
                  <Button 
                    size="small" 
                    color="primary"
                    startIcon={<SettingsIcon />}
                    onClick={() => {
                      setSelectedMonitor(monitor);
                      setConfigDialogOpen(true);
                    }}
                  >
                    Service Monitors
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {monitors.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No monitors connected
          </Typography>
        </Paper>
      )}

      {/* Service Monitors Configuration Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={() => {
          setConfigDialogOpen(false);
          setSelectedMonitor(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Service Monitors - {selectedMonitor?.name}
            </Typography>
            <IconButton
              onClick={() => {
                setConfigDialogOpen(false);
                setSelectedMonitor(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedMonitor && (
            <ServiceMonitorsList monitorId={selectedMonitor.monitorId} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default Monitors; 