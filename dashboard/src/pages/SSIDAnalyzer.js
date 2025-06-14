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
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import {
  Wifi as WifiIcon,
  SignalWifi4Bar as SignalWifiIcon,
  Router as RouterIcon,
  Speed as SpeedIcon,
  AccessTime as AccessTimeIcon,
  NetworkCheck as NetworkCheckIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useSelector } from 'react-redux';
import apiService from '../services/api';

const SSIDAnalyzer = () => {
  const [selectedMonitor, setSelectedMonitor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [overviewData, setOverviewData] = useState([]);
  
  // Stability analysis state
  const [incidentData, setIncidentData] = useState([]);
  const [incidentStats, setIncidentStats] = useState(null);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [analysisLoading, setAnalysisLoading] = useState(false);

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

  const formatFrequency = (frequency) => {
    if (!frequency) return '';
    if (frequency >= 1000) {
      return `${Math.round(frequency / 1000)} GHz`;
    }
    return `${frequency} MHz`;
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

  const getIncidentSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const formatIncidentType = (type) => {
    switch (type) {
      case 'disconnection': return 'Disconnection';
      case 'reconnection': return 'Reconnection';
      case 'signal_drop': return 'Signal Drop';
      case 'timeout': return 'Timeout';
      default: return type;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Prepare chart data for incident timeline
  const getTimelineChartData = () => {
    if (!timelineData || timelineData.length === 0) {
      return { labels: [], datasets: { disconnections: [], signalDrops: [] } };
    }

    const labels = timelineData.map(item => {
      const date = new Date(item._id);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    });

    const disconnections = timelineData.map(item => item.disconnections || 0);
    const signalDrops = timelineData.map(item => item.signalDrops || 0);

    return {
      labels,
      datasets: { disconnections, signalDrops }
    };
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

  // Fetch incident analysis data
  const fetchIncidentAnalysis = async (monitorId) => {
    try {
      setAnalysisLoading(true);
      
      // Fetch incident data in parallel
      const [incidentsResponse, statsResponse, activeResponse, timelineResponse] = await Promise.all([
        apiService.getSSIDIncidents(monitorId, { timeRange, limit: 100 }),
        apiService.getSSIDIncidentStats(monitorId, { timeRange }),
        apiService.getActiveIncidents(monitorId),
        apiService.getIncidentTimeline(monitorId, { timeRange, granularity: 'hour' })
      ]);

      if (incidentsResponse.data.success) {
        setIncidentData(incidentsResponse.data.data);
      }

      if (statsResponse.data.success) {
        setIncidentStats(statsResponse.data.data);
      }

      if (activeResponse.data.success) {
        setActiveIncidents(activeResponse.data.data);
      }

      if (timelineResponse.data.success) {
        setTimelineData(timelineResponse.data.data);
      }

    } catch (err) {
      console.error('Error fetching incident analysis:', err);
    } finally {
      setAnalysisLoading(false);
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
      fetchIncidentAnalysis(selectedMonitor);
    } else {
      setConnectionStatus(null);
      setIncidentData([]);
      setIncidentStats(null);
      setActiveIncidents([]);
      setTimelineData([]);
    }
  }, [selectedMonitor, timeRange]);

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
                      label={connectionStatus.connectionStatus ? connectionStatus.connectionStatus.toUpperCase() : 'UNKNOWN'}
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
                      {connectionStatus.signalStrength || 0} dBm
                    </Typography>
                    <Chip
                      label={getSignalQuality(connectionStatus.signalStrength || 0).label}
                      color={getSignalQuality(connectionStatus.signalStrength || 0).color}
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
                      {connectionStatus.stabilityScore || 0}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={connectionStatus.stabilityScore || 0}
                      sx={{ mt: 1 }}
                      color={(connectionStatus.stabilityScore || 0) >= 95 ? 'success' : 
                             (connectionStatus.stabilityScore || 0) >= 80 ? 'warning' : 'error'}
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
                        <TableCell>
                          {connectionStatus.channel 
                            ? `${connectionStatus.channel}${connectionStatus.frequency ? ` (${formatFrequency(connectionStatus.frequency)})` : ''}`
                            : 'Unknown'
                          }
                        </TableCell>
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

      {/* Stability Analysis Section */}
      {selectedMonitor && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Stability Analysis - {monitors.find(m => m.monitorId === selectedMonitor)?.name}
            </Typography>
            <ToggleButtonGroup
              value={timeRange}
              exclusive
              onChange={(e, newValue) => newValue && setTimeRange(newValue)}
              size="small"
            >
              <ToggleButton value="1h">1H</ToggleButton>
              <ToggleButton value="6h">6H</ToggleButton>
              <ToggleButton value="24h">24H</ToggleButton>
              <ToggleButton value="7d">7D</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {analysisLoading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}

          {!analysisLoading && (
            <Grid container spacing={3}>
              {/* Active Incidents */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="h6">Active Incidents</Typography>
                    </Box>
                    {activeIncidents.length > 0 ? (
                      <Box>
                        {activeIncidents.map((incident, index) => (
                          <Box key={index} mb={1}>
                            <Chip
                              icon={<WarningIcon />}
                              label={`${formatIncidentType(incident.incidentType)} - ${formatDuration((new Date() - new Date(incident.startTime)) / 1000)}`}
                              color={getIncidentSeverityColor(incident.severity)}
                              size="small"
                            />
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center">
                        <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                        <Typography color="success.main">No active incidents</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Stability Metrics */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <TimelineIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">Stability Metrics</Typography>
                    </Box>
                    {incidentStats?.stability ? (
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Uptime
                          </Typography>
                          <Typography variant="h6">
                            {incidentStats.stability.uptime}%
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Total Incidents
                          </Typography>
                          <Typography variant="h6">
                            {incidentStats.stability.incidents}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Disconnections
                          </Typography>
                          <Typography variant="h6">
                            {incidentStats.stability.disconnections}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Signal Drops
                          </Typography>
                          <Typography variant="h6">
                            {incidentStats.stability.signalDrops}
                          </Typography>
                        </Grid>
                      </Grid>
                    ) : (
                      <Typography color="text.secondary">
                        No stability data available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Incident Timeline Chart */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Incident Timeline ({timeRange})
                    </Typography>
                    {(() => {
                      const chartData = getTimelineChartData();
                      return chartData.labels.length > 0 ? (
                        <Box sx={{ width: '100%', height: 300 }}>
                          <LineChart
                            xAxis={[{
                              scaleType: 'point',
                              data: chartData.labels,
                            }]}
                            series={[
                              {
                                data: chartData.datasets.disconnections,
                                label: 'Disconnections',
                                color: '#dc004e',
                              },
                              {
                                data: chartData.datasets.signalDrops,
                                label: 'Signal Drops',
                                color: '#ed6c02',
                              },
                            ]}
                            width={undefined}
                            height={300}
                            margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                          />
                        </Box>
                      ) : (
                        <Alert severity="info">
                          No incident data available for the selected time range.
                        </Alert>
                      );
                    })()}
                  </CardContent>
                </Card>
              </Grid>

              {/* Recent Incidents List */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Incidents
                    </Typography>
                    {incidentData.length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Type</TableCell>
                              <TableCell>Severity</TableCell>
                              <TableCell>Start Time</TableCell>
                              <TableCell>Duration</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {incidentData.slice(0, 10).map((incident) => (
                              <TableRow key={incident._id}>
                                <TableCell>
                                  {formatIncidentType(incident.incidentType)}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={incident.severity || 'unknown'}
                                    color={getIncidentSeverityColor(incident.severity)}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  {new Date(incident.startTime).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  {incident.duration ? formatDuration(incident.duration) : 'Ongoing'}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={incident.resolved ? 'Resolved' : 'Active'}
                                    color={incident.resolved ? 'success' : 'warning'}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">
                        No incidents recorded for the selected time range.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
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
                    <TableCell>{monitor.ssid || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip
                        label={monitor.connectionStatus || 'unknown'}
                        color={getConnectionStatusColor(monitor.connectionStatus)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {monitor.signalStrength || 0} dBm
                        </Typography>
                        <Chip
                          label={getSignalQuality(monitor.signalStrength || 0).label}
                          color={getSignalQuality(monitor.signalStrength || 0).color}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {monitor.stabilityScore || 0}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={monitor.stabilityScore || 0}
                          sx={{ width: 60 }}
                          color={(monitor.stabilityScore || 0) >= 95 ? 'success' : 
                                 (monitor.stabilityScore || 0) >= 80 ? 'warning' : 'error'}
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