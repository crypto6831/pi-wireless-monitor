import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  WifiIcon,
  SignalWifiIcon,
  RouterIcon,
  SpeedIcon,
  AccessTimeIcon,
  NetworkCheckIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import apiService from '../services/api';

const SSIDAnalyzer = () => {
  const [selectedMonitor, setSelectedMonitor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [overviewData, setOverviewData] = useState([]);

  const monitors = useSelector((state) => state.monitors.list);

  // Helper functions
  const getSignalQuality = (signal) => {
    if (signal >= -50) return { label: 'Excellent', color: 'success' };
    if (signal >= -60) return { label: 'Good', color: 'success' };
    if (signal >= -70) return { label: 'Fair', color: 'warning' };
    if (signal >= -80) return { label: 'Poor', color: 'error' };
    return { label: 'Very Poor', color: 'error' };
  };

  const getConnectionStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'reconnecting': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  // Fetch connection status for selected monitor
  const fetchConnectionStatus = async (monitorId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getSSIDStatus(monitorId);
      
      if (response.data.success) {
        setConnectionStatus(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch connection status');
      }
    } catch (err) {
      console.error('Error fetching connection status:', err);
      setError(err.message);
      setConnectionStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch overview of all monitors
  const fetchOverview = async () => {
    try {
      const response = await apiService.getSSIDOverview();
      
      if (response.data.success) {
        setOverviewData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching SSID overview:', err);
    }
  };

  useEffect(() => {
    fetchOverview();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchOverview();
      if (selectedMonitor) {
        fetchConnectionStatus(selectedMonitor);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedMonitor) {
      fetchConnectionStatus(selectedMonitor);
    } else {
      setConnectionStatus(null);
    }
  }, [selectedMonitor]);

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        SSID Connection Analyzer
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Monitor WiFi connection stability and performance for your Raspberry Pi monitors
      </Typography>

      {/* Monitor Selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Monitor</InputLabel>
              <Select
                value={selectedMonitor}
                onChange={(e) => setSelectedMonitor(e.target.value)}
                label="Select Monitor"
              >
                <MenuItem value="">
                  <em>Select a monitor...</em>
                </MenuItem>
                {monitors.map((monitor) => (
                  <MenuItem key={monitor._id} value={monitor.monitorId}>
                    {monitor.name} ({monitor.monitorId})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Connection Status Details */}
      {selectedMonitor && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Connection Status - {monitors.find(m => m.monitorId === selectedMonitor)?.name}
          </Typography>

          {loading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}

          {connectionStatus && !loading && (
            <Grid container spacing={3}>
              {/* Status Cards */}
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <WifiIcon sx={{ mr: 1 }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Connection Status
                      </Typography>
                    </Box>
                    <Chip
                      label={connectionStatus.connectionStatus.toUpperCase()}
                      color={getConnectionStatusColor(connectionStatus.connectionStatus)}
                      variant="filled"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <SignalWifiIcon sx={{ mr: 1 }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Signal Strength
                      </Typography>
                    </Box>
                    <Typography variant="h6">
                      {connectionStatus.signalStrength} dBm
                    </Typography>
                    <Chip
                      label={getSignalQuality(connectionStatus.signalStrength).label}
                      color={getSignalQuality(connectionStatus.signalStrength).color}
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <SpeedIcon sx={{ mr: 1 }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Link Speed
                      </Typography>
                    </Box>
                    <Typography variant="h6">
                      {connectionStatus.linkSpeed ? `${connectionStatus.linkSpeed} Mbps` : 'Unknown'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <AccessTimeIcon sx={{ mr: 1 }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Stability Score
                      </Typography>
                    </Box>
                    <Typography variant="h6">
                      {connectionStatus.stabilityScore}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={connectionStatus.stabilityScore || 0}
                      sx={{ mt: 1 }}
                      color={connectionStatus.stabilityScore >= 95 ? 'success' : 
                             connectionStatus.stabilityScore >= 80 ? 'warning' : 'error'}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Connection Details */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Connection Details
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>SSID</strong></TableCell>
                        <TableCell>{connectionStatus.ssid || 'Unknown'}</TableCell>
                        <TableCell><strong>BSSID</strong></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>
                          {connectionStatus.bssid || 'Unknown'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Channel</strong></TableCell>
                        <TableCell>{connectionStatus.channel || 'Unknown'}</TableCell>
                        <TableCell><strong>Frequency</strong></TableCell>
                        <TableCell>{connectionStatus.frequency ? `${connectionStatus.frequency} MHz` : 'Unknown'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>RX Rate</strong></TableCell>
                        <TableCell>{connectionStatus.rxRate ? `${connectionStatus.rxRate} Mbps` : 'Unknown'}</TableCell>
                        <TableCell><strong>TX Rate</strong></TableCell>
                        <TableCell>{connectionStatus.txRate ? `${connectionStatus.txRate} Mbps` : 'Unknown'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Quality</strong></TableCell>
                        <TableCell>{connectionStatus.quality ? `${connectionStatus.quality}%` : 'Unknown'}</TableCell>
                        <TableCell><strong>Last Seen</strong></TableCell>
                        <TableCell>{formatTimestamp(connectionStatus.lastSeen)}</TableCell>
                      </TableRow>
                      {connectionStatus.networkLatency && (
                        <TableRow>
                          <TableCell><strong>Network Latency</strong></TableCell>
                          <TableCell>{connectionStatus.networkLatency} ms</TableCell>
                          <TableCell><strong>Internet Latency</strong></TableCell>
                          <TableCell>{connectionStatus.internetLatency || 'Unknown'} ms</TableCell>
                        </TableRow>
                      )}
                      {connectionStatus.packetLoss !== undefined && (
                        <TableRow>
                          <TableCell><strong>Packet Loss</strong></TableCell>
                          <TableCell>{connectionStatus.packetLoss}%</TableCell>
                          <TableCell><strong>Uptime</strong></TableCell>
                          <TableCell>{formatUptime(connectionStatus.uptime)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}

          {!connectionStatus && !loading && selectedMonitor && (
            <Alert severity="info">
              No connection data available for this monitor. 
              Make sure the monitor is online and sending SSID data.
            </Alert>
          )}
        </Paper>
      )}

      {/* Overview Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          All Monitors Overview
        </Typography>
        
        {overviewData.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Monitor</TableCell>
                  <TableCell>SSID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Signal</TableCell>
                  <TableCell>Stability</TableCell>
                  <TableCell>Last Seen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overviewData.map((monitor) => (
                  <TableRow 
                    key={monitor.monitorId}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedMonitor(monitor.monitorId)}
                    hover
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {monitor.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {monitor.monitorId}
                      </Typography>
                    </TableCell>
                    <TableCell>{monitor.ssid}</TableCell>
                    <TableCell>
                      <Chip
                        label={monitor.connectionStatus}
                        color={getConnectionStatusColor(monitor.connectionStatus)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {monitor.signalStrength} dBm
                        </Typography>
                        <Chip
                          label={getSignalQuality(monitor.signalStrength).label}
                          color={getSignalQuality(monitor.signalStrength).color}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {monitor.stabilityScore}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={monitor.stabilityScore || 0}
                          sx={{ width: 60 }}
                          color={monitor.stabilityScore >= 95 ? 'success' : 
                                 monitor.stabilityScore >= 80 ? 'warning' : 'error'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTimestamp(monitor.lastSeen)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            No monitor data available. Make sure at least one monitor is online and sending data.
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default SSIDAnalyzer;