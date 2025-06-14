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
  const [oldTimelineData, setOldTimelineData] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Phase 3.2: Performance analytics state
  const [performanceData, setPerformanceData] = useState(null);
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [performanceTimeRange, setPerformanceTimeRange] = useState('24h');
  const [performanceMetric, setPerformanceMetric] = useState('all');
  const [performanceLoading, setPerformanceLoading] = useState(false);

  // Phase 3.3: Timeline and comparison state
  const [detailedTimelineData, setDetailedTimelineData] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineTimeRange, setTimelineTimeRange] = useState('24h');
  const [timelineFilters, setTimelineFilters] = useState({
    incidentTypes: 'all',
    severityFilter: 'all'
  });
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonPeriods, setComparisonPeriods] = useState({
    baseline: { label: 'Previous Week', days: 7, offset: 7 },
    comparison: { label: 'Current Week', days: 7, offset: 0 }
  });

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

  // Phase 3.2: Performance formatting helpers
  const formatThroughput = (value) => {
    if (!value) return 'N/A';
    if (value >= 1000) return `${(value / 1000).toFixed(2)} Gbps`;
    return `${value.toFixed(1)} Mbps`;
  };

  const formatLatency = (value) => {
    if (!value) return 'N/A';
    return `${value.toFixed(1)} ms`;
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const getPerformanceQuality = (metric, value) => {
    if (!value) return { label: 'Unknown', color: 'default' };
    
    switch (metric) {
      case 'latency':
        if (value <= 10) return { label: 'Excellent', color: 'success' };
        if (value <= 20) return { label: 'Good', color: 'success' };
        if (value <= 50) return { label: 'Fair', color: 'warning' };
        if (value <= 100) return { label: 'Poor', color: 'error' };
        return { label: 'Very Poor', color: 'error' };
      
      case 'throughput':
        if (value >= 100) return { label: 'Excellent', color: 'success' };
        if (value >= 50) return { label: 'Good', color: 'success' };
        if (value >= 20) return { label: 'Fair', color: 'warning' };
        if (value >= 5) return { label: 'Poor', color: 'error' };
        return { label: 'Very Poor', color: 'error' };
      
      case 'packetLoss':
        if (value === 0) return { label: 'Perfect', color: 'success' };
        if (value <= 0.5) return { label: 'Excellent', color: 'success' };
        if (value <= 2) return { label: 'Good', color: 'warning' };
        if (value <= 5) return { label: 'Fair', color: 'warning' };
        return { label: 'Poor', color: 'error' };
      
      default:
        return { label: 'Unknown', color: 'default' };
    }
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
    if (!oldTimelineData || oldTimelineData.length === 0) {
      return { labels: [], datasets: { disconnections: [], signalDrops: [] } };
    }

    const labels = oldTimelineData.map(item => {
      const date = new Date(item._id);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    });

    const disconnections = oldTimelineData.map(item => item.disconnections || 0);
    const signalDrops = oldTimelineData.map(item => item.signalDrops || 0);

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
        setOldTimelineData(timelineResponse.data.data);
      }

    } catch (err) {
      console.error('Error fetching incident analysis:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Phase 3.2: Fetch performance analytics data
  const fetchPerformanceAnalytics = async (monitorId) => {
    try {
      setPerformanceLoading(true);
      
      // Fetch performance metrics and history in parallel
      const [metricsResponse, historyResponse] = await Promise.all([
        apiService.getSSIDPerformance(monitorId, { period: performanceTimeRange }),
        apiService.getSSIDPerformanceHistory(monitorId, { 
          period: performanceTimeRange, 
          metric: performanceMetric 
        })
      ]);

      if (metricsResponse.data.success) {
        setPerformanceData(metricsResponse.data.data);
      }

      if (historyResponse.data.success) {
        setPerformanceHistory(historyResponse.data.data);
      }

    } catch (err) {
      console.error('Error fetching performance analytics:', err);
    } finally {
      setPerformanceLoading(false);
    }
  };

  // Phase 3.3: Fetch detailed incident timeline
  const fetchIncidentTimeline = async (monitorId) => {
    try {
      setTimelineLoading(true);
      
      const params = {
        timeRange: timelineTimeRange,
        incidentTypes: timelineFilters.incidentTypes === 'all' ? undefined : timelineFilters.incidentTypes,
        severityFilter: timelineFilters.severityFilter === 'all' ? undefined : timelineFilters.severityFilter
      };

      const response = await apiService.getDetailedIncidentTimeline(monitorId, params);
      
      if (response.data.success) {
        setDetailedTimelineData(response.data.data);
      }

    } catch (err) {
      console.error('Error fetching incident timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  // Phase 3.3: Fetch incident comparison data
  const fetchIncidentComparison = async (monitorId, baselineStart, baselineEnd, comparisonStart, comparisonEnd) => {
    try {
      setComparisonLoading(true);
      
      const params = {
        baselineStart: baselineStart.toISOString(),
        baselineEnd: baselineEnd.toISOString(),
        comparisonStart: comparisonStart.toISOString(),
        comparisonEnd: comparisonEnd.toISOString()
      };

      const response = await apiService.compareIncidentPeriods(monitorId, params);
      
      if (response.data.success) {
        setComparisonData(response.data.data);
      }

    } catch (err) {
      console.error('Error fetching incident comparison:', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  // Helper function to run comparison analysis
  const runComparisonAnalysis = () => {
    if (!selectedMonitor) return;
    
    const now = new Date();
    
    // Calculate baseline period (e.g., previous week)
    const baselineEnd = new Date(now.getTime() - comparisonPeriods.baseline.offset * 24 * 60 * 60 * 1000);
    const baselineStart = new Date(baselineEnd.getTime() - comparisonPeriods.baseline.days * 24 * 60 * 60 * 1000);
    
    // Calculate comparison period (e.g., current week)
    const comparisonEnd = new Date(now.getTime() - comparisonPeriods.comparison.offset * 24 * 60 * 60 * 1000);
    const comparisonStart = new Date(comparisonEnd.getTime() - comparisonPeriods.comparison.days * 24 * 60 * 60 * 1000);
    
    fetchIncidentComparison(selectedMonitor, baselineStart, baselineEnd, comparisonStart, comparisonEnd);
  };

  // Prepare chart data for performance metrics
  const getPerformanceChartData = () => {
    if (!performanceHistory || !performanceHistory.chartData || performanceHistory.chartData.labels.length === 0) {
      return { labels: [], datasets: {} };
    }

    const { labels, datasets } = performanceHistory.chartData;
    
    // Aggressive sampling - take only 6-8 data points maximum
    const maxPoints = 6;
    const totalPoints = labels.length;
    const step = Math.max(1, Math.floor(totalPoints / (maxPoints - 1)));
    
    const sampledIndices = [];
    for (let i = 0; i < totalPoints; i += step) {
      sampledIndices.push(i);
    }
    // Always include the last point if not already included
    if (sampledIndices[sampledIndices.length - 1] !== totalPoints - 1) {
      sampledIndices.push(totalPoints - 1);
    }
    
    // Create clean labels - only show hour:minute
    const sampledLabels = sampledIndices.map(i => {
      const date = new Date(labels[i]);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    });
    
    // Filter and clean datasets - remove null/undefined values
    const sampledDatasets = {};
    Object.keys(datasets).forEach(key => {
      if (datasets[key] && Array.isArray(datasets[key])) {
        const rawData = sampledIndices.map(i => datasets[key][i]);
        // Filter out null/undefined values and ensure numbers
        sampledDatasets[key] = rawData.map(val => {
          if (val === null || val === undefined || isNaN(val)) {
            return 0; // Replace with 0 instead of null
          }
          return Number(val);
        });
      }
    });

    return {
      labels: sampledLabels,
      datasets: sampledDatasets
    };
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
      fetchPerformanceAnalytics(selectedMonitor);
    } else {
      setConnectionStatus(null);
      setIncidentData([]);
      setIncidentStats(null);
      setActiveIncidents([]);
      setOldTimelineData([]);
      setPerformanceData(null);
      setPerformanceHistory([]);
      setDetailedTimelineData([]);
    }
  }, [selectedMonitor, timeRange]);

  // Phase 3.2: Performance analytics effect
  useEffect(() => {
    if (selectedMonitor) {
      fetchPerformanceAnalytics(selectedMonitor);
    }
  }, [selectedMonitor, performanceTimeRange, performanceMetric]);

  // Phase 3.3: Timeline analytics effect
  useEffect(() => {
    if (selectedMonitor) {
      fetchIncidentTimeline(selectedMonitor);
    }
  }, [selectedMonitor, timelineTimeRange, timelineFilters]);

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

      {/* Phase 3.2: Performance Analytics Section */}
      {selectedMonitor && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Performance Analytics - {monitors.find(m => m.monitorId === selectedMonitor)?.name}
            </Typography>
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Metric</InputLabel>
                <Select
                  value={performanceMetric}
                  onChange={(e) => setPerformanceMetric(e.target.value)}
                  label="Metric"
                >
                  <MenuItem value="all">All Metrics</MenuItem>
                  <MenuItem value="latency">Latency</MenuItem>
                  <MenuItem value="throughput">Throughput</MenuItem>
                  <MenuItem value="quality">Quality</MenuItem>
                </Select>
              </FormControl>
              <ToggleButtonGroup
                value={performanceTimeRange}
                exclusive
                onChange={(e, newValue) => newValue && setPerformanceTimeRange(newValue)}
                size="small"
              >
                <ToggleButton value="1h">1H</ToggleButton>
                <ToggleButton value="6h">6H</ToggleButton>
                <ToggleButton value="24h">24H</ToggleButton>
                <ToggleButton value="7d">7D</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {performanceLoading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}

          {!performanceLoading && performanceData && (
            <Grid container spacing={3}>
              {/* Performance Summary Cards */}
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <SpeedIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Download Speed
                      </Typography>
                    </Box>
                    <Typography variant="h6">
                      {formatThroughput(performanceData.metrics?.throughput?.download?.avg)}
                    </Typography>
                    <Chip
                      label={getPerformanceQuality('throughput', performanceData.metrics?.throughput?.download?.avg).label}
                      color={getPerformanceQuality('throughput', performanceData.metrics?.throughput?.download?.avg).color}
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <SpeedIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Upload Speed
                      </Typography>
                    </Box>
                    <Typography variant="h6">
                      {formatThroughput(performanceData.metrics?.throughput?.upload?.avg)}
                    </Typography>
                    <Chip
                      label={getPerformanceQuality('throughput', performanceData.metrics?.throughput?.upload?.avg).label}
                      color={getPerformanceQuality('throughput', performanceData.metrics?.throughput?.upload?.avg).color}
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <NetworkCheckIcon sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Latency
                      </Typography>
                    </Box>
                    <Typography variant="h6">
                      {formatLatency(performanceData.metrics?.latency?.network?.avg)}
                    </Typography>
                    <Chip
                      label={getPerformanceQuality('latency', performanceData.metrics?.latency?.network?.avg).label}
                      color={getPerformanceQuality('latency', performanceData.metrics?.latency?.network?.avg).color}
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Packet Loss
                      </Typography>
                    </Box>
                    <Typography variant="h6">
                      {formatPercentage(performanceData.metrics?.quality?.packetLoss?.avg)}
                    </Typography>
                    <Chip
                      label={getPerformanceQuality('packetLoss', performanceData.metrics?.quality?.packetLoss?.avg).label}
                      color={getPerformanceQuality('packetLoss', performanceData.metrics?.quality?.packetLoss?.avg).color}
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Performance Charts */}
              {(performanceMetric === 'all' || performanceMetric === 'throughput') && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Throughput ({performanceTimeRange})
                      </Typography>
                      {(() => {
                        const chartData = getPerformanceChartData();
                        return chartData.labels.length > 0 && chartData.datasets.downloadThroughput ? (
                          <Box sx={{ width: '100%', height: 350 }}>
                            <LineChart
                              xAxis={[{
                                scaleType: 'point',
                                data: chartData.labels,
                                tickLabelStyle: { fontSize: 12 },
                                label: 'Time',
                              }]}
                              yAxis={[{
                                label: 'Throughput (Mbps)',
                                tickLabelStyle: { fontSize: 12 },
                              }]}
                              series={[
                                {
                                  data: chartData.datasets.downloadThroughput,
                                  label: 'Download',
                                  color: '#1976d2',
                                  curve: 'linear',
                                },
                                {
                                  data: chartData.datasets.uploadThroughput,
                                  label: 'Upload',
                                  color: '#2e7d32',
                                  curve: 'linear',
                                },
                              ]}
                              width={undefined}
                              height={350}
                              margin={{ left: 80, right: 40, top: 40, bottom: 80 }}
                              grid={{ horizontal: true, vertical: true }}
                              slotProps={{
                                legend: {
                                  direction: 'row',
                                  position: { vertical: 'top', horizontal: 'middle' },
                                  padding: 0,
                                },
                              }}
                            />
                          </Box>
                        ) : (
                          <Alert severity="info">
                            No throughput data available for the selected time range.
                          </Alert>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {(performanceMetric === 'all' || performanceMetric === 'latency') && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Latency ({performanceTimeRange})
                      </Typography>
                      {(() => {
                        const chartData = getPerformanceChartData();
                        return chartData.labels.length > 0 && chartData.datasets.networkLatency ? (
                          <Box sx={{ width: '100%', height: 350 }}>
                            <LineChart
                              xAxis={[{
                                scaleType: 'point',
                                data: chartData.labels,
                                tickLabelStyle: { fontSize: 12 },
                                label: 'Time',
                              }]}
                              yAxis={[{
                                label: 'Latency (ms)',
                                tickLabelStyle: { fontSize: 12 },
                              }]}
                              series={[
                                {
                                  data: chartData.datasets.networkLatency,
                                  label: 'Network',
                                  color: '#1976d2',
                                  curve: 'linear',
                                },
                                {
                                  data: chartData.datasets.internetLatency,
                                  label: 'Internet',
                                  color: '#dc004e',
                                  curve: 'linear',
                                },
                                {
                                  data: chartData.datasets.dnsLatency,
                                  label: 'DNS',
                                  color: '#ed6c02',
                                  curve: 'linear',
                                },
                              ]}
                              width={undefined}
                              height={350}
                              margin={{ left: 80, right: 40, top: 40, bottom: 80 }}
                              grid={{ horizontal: true, vertical: true }}
                              slotProps={{
                                legend: {
                                  direction: 'row',
                                  position: { vertical: 'top', horizontal: 'middle' },
                                  padding: 0,
                                },
                              }}
                            />
                          </Box>
                        ) : (
                          <Alert severity="info">
                            No latency data available for the selected time range.
                          </Alert>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {(performanceMetric === 'all' || performanceMetric === 'quality') && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Quality Metrics ({performanceTimeRange})
                      </Typography>
                      {(() => {
                        const chartData = getPerformanceChartData();
                        return chartData.labels.length > 0 && (chartData.datasets.packetLoss || chartData.datasets.jitter || chartData.datasets.stabilityScore) ? (
                          <Box sx={{ width: '100%', height: 350 }}>
                            <LineChart
                              xAxis={[{
                                scaleType: 'point',
                                data: chartData.labels,
                                tickLabelStyle: { fontSize: 12 },
                                label: 'Time',
                              }]}
                              yAxis={[{
                                label: 'Quality Metrics',
                                tickLabelStyle: { fontSize: 12 },
                              }]}
                              series={[
                                ...(chartData.datasets.packetLoss ? [{
                                  data: chartData.datasets.packetLoss,
                                  label: 'Packet Loss (%)',
                                  color: '#dc004e',
                                  curve: 'linear',
                                }] : []),
                                ...(chartData.datasets.jitter ? [{
                                  data: chartData.datasets.jitter,
                                  label: 'Jitter (ms)',
                                  color: '#ed6c02',
                                  curve: 'linear',
                                }] : []),
                                ...(chartData.datasets.stabilityScore ? [{
                                  data: chartData.datasets.stabilityScore,
                                  label: 'Stability Score',
                                  color: '#2e7d32',
                                  curve: 'linear',
                                }] : []),
                              ]}
                              width={undefined}
                              height={350}
                              margin={{ left: 80, right: 40, top: 50, bottom: 90 }}
                              grid={{ horizontal: true, vertical: false }}
                              slotProps={{
                                legend: {
                                  direction: 'row',
                                  position: { vertical: 'top', horizontal: 'middle' },
                                  padding: 10,
                                },
                              }}
                            />
                          </Box>
                        ) : (
                          <Alert severity="info">
                            No quality metrics available for the selected time range.
                          </Alert>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Performance Details Table */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Performance Summary
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Metric</TableCell>
                            <TableCell>Average</TableCell>
                            <TableCell>Minimum</TableCell>
                            <TableCell>Maximum</TableCell>
                            <TableCell>Data Points</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell><strong>Download Throughput</strong></TableCell>
                            <TableCell>{formatThroughput(performanceData.metrics?.throughput?.download?.avg)}</TableCell>
                            <TableCell>{formatThroughput(performanceData.metrics?.throughput?.download?.min)}</TableCell>
                            <TableCell>{formatThroughput(performanceData.metrics?.throughput?.download?.max)}</TableCell>
                            <TableCell>{performanceData.count || 0}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Upload Throughput</strong></TableCell>
                            <TableCell>{formatThroughput(performanceData.metrics?.throughput?.upload?.avg)}</TableCell>
                            <TableCell>{formatThroughput(performanceData.metrics?.throughput?.upload?.min)}</TableCell>
                            <TableCell>{formatThroughput(performanceData.metrics?.throughput?.upload?.max)}</TableCell>
                            <TableCell>{performanceData.count || 0}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Network Latency</strong></TableCell>
                            <TableCell>{formatLatency(performanceData.metrics?.latency?.network?.avg)}</TableCell>
                            <TableCell>{formatLatency(performanceData.metrics?.latency?.network?.min)}</TableCell>
                            <TableCell>{formatLatency(performanceData.metrics?.latency?.network?.max)}</TableCell>
                            <TableCell>{performanceData.count || 0}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Internet Latency</strong></TableCell>
                            <TableCell>{formatLatency(performanceData.metrics?.latency?.internet?.avg)}</TableCell>
                            <TableCell>{formatLatency(performanceData.metrics?.latency?.internet?.min)}</TableCell>
                            <TableCell>{formatLatency(performanceData.metrics?.latency?.internet?.max)}</TableCell>
                            <TableCell>{performanceData.count || 0}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>DNS Latency</strong></TableCell>
                            <TableCell>{formatLatency(performanceData.metrics?.latency?.dns?.avg)}</TableCell>
                            <TableCell>{formatLatency(performanceData.metrics?.latency?.dns?.min)}</TableCell>
                            <TableCell>{formatLatency(performanceData.metrics?.latency?.dns?.max)}</TableCell>
                            <TableCell>{performanceData.count || 0}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Packet Loss</strong></TableCell>
                            <TableCell>{formatPercentage(performanceData.metrics?.quality?.packetLoss?.avg)}</TableCell>
                            <TableCell>{formatPercentage(performanceData.metrics?.quality?.packetLoss?.min)}</TableCell>
                            <TableCell>{formatPercentage(performanceData.metrics?.quality?.packetLoss?.max)}</TableCell>
                            <TableCell>{performanceData.count || 0}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Stability Score</strong></TableCell>
                            <TableCell>{formatPercentage(performanceData.metrics?.quality?.stabilityScore?.avg)}</TableCell>
                            <TableCell>{formatPercentage(performanceData.metrics?.quality?.stabilityScore?.min)}</TableCell>
                            <TableCell>{formatPercentage(performanceData.metrics?.quality?.stabilityScore?.max)}</TableCell>
                            <TableCell>{performanceData.count || 0}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {!performanceLoading && (!performanceData || !performanceData.metrics) && (
            <Alert severity="info">
              No performance data available for this monitor. 
              Make sure the monitor is online and collecting performance metrics.
            </Alert>
          )}
        </Paper>
      )}

      {/* Phase 3.3: Incident Timeline and Analysis */}
      {selectedMonitor && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Incident Timeline & Analysis
            </Typography>
            <Box display="flex" gap={2}>
              {/* Timeline filters */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Incident Types</InputLabel>
                <Select
                  value={timelineFilters.incidentTypes}
                  onChange={(e) => setTimelineFilters({...timelineFilters, incidentTypes: e.target.value})}
                  label="Incident Types"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="disconnection">Disconnections</MenuItem>
                  <MenuItem value="signal_drop">Signal Drops</MenuItem>
                  <MenuItem value="timeout">Timeouts</MenuItem>
                  <MenuItem value="reconnection">Reconnections</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={timelineFilters.severityFilter}
                  onChange={(e) => setTimelineFilters({...timelineFilters, severityFilter: e.target.value})}
                  label="Severity"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>

              <ToggleButtonGroup
                value={timelineTimeRange}
                exclusive
                onChange={(e, newValue) => newValue && setTimelineTimeRange(newValue)}
                size="small"
              >
                <ToggleButton value="1h">1H</ToggleButton>
                <ToggleButton value="6h">6H</ToggleButton>
                <ToggleButton value="24h">24H</ToggleButton>
                <ToggleButton value="7d">7D</ToggleButton>
              </ToggleButtonGroup>

              <Divider orientation="vertical" flexItem />

              <ToggleButtonGroup
                value={comparisonMode}
                exclusive
                onChange={(e, newValue) => {
                  setComparisonMode(newValue);
                  if (newValue && selectedMonitor) {
                    runComparisonAnalysis();
                  }
                }}
                size="small"
              >
                <ToggleButton value={false}>Timeline</ToggleButton>
                <ToggleButton value={true}>Compare</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {timelineLoading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}

          {!timelineLoading && !comparisonMode && detailedTimelineData && (
            <Grid container spacing={3}>
              {/* Timeline Metrics Cards */}
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <WarningIcon sx={{ mr: 1, color: 'error.main' }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Incidents
                      </Typography>
                    </Box>
                    <Typography variant="h5">
                      {detailedTimelineData.metrics?.totalIncidents || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <AccessTimeIcon sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Downtime
                      </Typography>
                    </Box>
                    <Typography variant="h5">
                      {formatDuration(detailedTimelineData.metrics?.totalDowntime || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <AccessTimeIcon sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Avg Duration
                      </Typography>
                    </Box>
                    <Typography variant="h5">
                      {formatDuration(detailedTimelineData.metrics?.avgDuration || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <RouterIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Disconnections
                      </Typography>
                    </Box>
                    <Typography variant="h5">
                      {detailedTimelineData.metrics?.incidentsByType?.disconnection || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Interactive Timeline Visualization */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Incident Timeline ({timelineTimeRange})
                    </Typography>
                    {detailedTimelineData.incidents && detailedTimelineData.incidents.length > 0 ? (
                      <Box sx={{ position: 'relative', height: 200, overflow: 'auto' }}>
                        {detailedTimelineData.incidents.map((incident, index) => (
                          <Box
                            key={incident._id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              p: 2,
                              mb: 1,
                              backgroundColor: 'background.paper',
                              border: `2px solid ${incident.severityColor}`,
                              borderRadius: 1,
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'action.hover'
                              }
                            }}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: incident.severityColor,
                                mr: 2,
                                flexShrink: 0
                              }}
                            />
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                {formatIncidentType(incident.incidentType)} - {incident.ssid}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatTimestamp(incident.displayTime)} • {incident.durationFormatted} • {incident.severity || 'medium'} severity
                              </Typography>
                            </Box>
                            <Chip
                              label={incident.severity || 'medium'}
                              size="small"
                              color={getIncidentSeverityColor(incident.severity)}
                            />
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Alert severity="info">
                        No incidents found for the selected time range and filters.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Incident Breakdown Charts */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Incidents by Type
                    </Typography>
                    {detailedTimelineData.metrics?.incidentsByType && Object.keys(detailedTimelineData.metrics.incidentsByType).length > 0 ? (
                      <Box>
                        {Object.entries(detailedTimelineData.metrics.incidentsByType).map(([type, count]) => (
                          <Box key={type} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {formatIncidentType(type)}
                            </Typography>
                            <Chip label={count} size="small" variant="outlined" />
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No incident data available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Incidents by Severity
                    </Typography>
                    {detailedTimelineData.metrics?.incidentsBySeverity && Object.keys(detailedTimelineData.metrics.incidentsBySeverity).length > 0 ? (
                      <Box>
                        {Object.entries(detailedTimelineData.metrics.incidentsBySeverity).map(([severity, count]) => (
                          <Box key={severity} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {severity}
                            </Typography>
                            <Chip 
                              label={count} 
                              size="small" 
                              color={getIncidentSeverityColor(severity)}
                            />
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No severity data available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Phase 3.3c: Comparison Analysis View */}
          {comparisonMode && (
            <>
              {comparisonLoading && (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              )}
              
              {!comparisonLoading && comparisonData && (
                <Grid container spacing={3}>
                  {/* Comparison Summary Cards */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Period Comparison: {comparisonPeriods.baseline.label} vs {comparisonPeriods.comparison.label}
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Box p={2} border={1} borderColor="grey.300" borderRadius={1}>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Total Incidents Change
                              </Typography>
                              <Box display="flex" alignItems="center">
                                <Typography variant="h4" sx={{ mr: 1 }}>
                                  {comparisonData.analysis.changes.totalIncidents.absolute > 0 ? '+' : ''}
                                  {comparisonData.analysis.changes.totalIncidents.absolute}
                                </Typography>
                                <Chip
                                  label={`${comparisonData.analysis.changes.totalIncidents.percentage > 0 ? '+' : ''}${comparisonData.analysis.changes.totalIncidents.percentage.toFixed(1)}%`}
                                  color={comparisonData.analysis.changes.totalIncidents.percentage > 0 ? 'error' : 'success'}
                                  size="small"
                                />
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Box p={2} border={1} borderColor="grey.300" borderRadius={1}>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Downtime Change
                              </Typography>
                              <Box display="flex" alignItems="center">
                                <Typography variant="h4" sx={{ mr: 1 }}>
                                  {comparisonData.analysis.changes.totalDowntime.absolute > 0 ? '+' : ''}
                                  {formatDuration(Math.abs(comparisonData.analysis.changes.totalDowntime.absolute))}
                                </Typography>
                                <Chip
                                  label={`${comparisonData.analysis.changes.totalDowntime.percentage > 0 ? '+' : ''}${comparisonData.analysis.changes.totalDowntime.percentage.toFixed(1)}%`}
                                  color={comparisonData.analysis.changes.totalDowntime.percentage > 0 ? 'error' : 'success'}
                                  size="small"
                                />
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Box p={2} border={1} borderColor="grey.300" borderRadius={1}>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Average Duration Change
                              </Typography>
                              <Box display="flex" alignItems="center">
                                <Typography variant="h4" sx={{ mr: 1 }}>
                                  {comparisonData.analysis.changes.avgDuration.absolute > 0 ? '+' : ''}
                                  {formatDuration(Math.abs(comparisonData.analysis.changes.avgDuration.absolute))}
                                </Typography>
                                <Chip
                                  label={`${comparisonData.analysis.changes.avgDuration.percentage > 0 ? '+' : ''}${comparisonData.analysis.changes.avgDuration.percentage.toFixed(1)}%`}
                                  color={comparisonData.analysis.changes.avgDuration.percentage > 0 ? 'error' : 'success'}
                                  size="small"
                                />
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Period Details Comparison */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {comparisonPeriods.baseline.label}
                        </Typography>
                        <Box mb={2}>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(comparisonData.baseline.period.start).toLocaleDateString()} - {new Date(comparisonData.baseline.period.end).toLocaleDateString()}
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Total Incidents</Typography>
                            <Typography variant="h6">{comparisonData.baseline.metrics.totalIncidents}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Total Downtime</Typography>
                            <Typography variant="h6">{formatDuration(comparisonData.baseline.metrics.totalDowntime)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Avg Duration</Typography>
                            <Typography variant="h6">{formatDuration(comparisonData.baseline.metrics.avgDuration)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Disconnections</Typography>
                            <Typography variant="h6">{comparisonData.baseline.metrics.disconnectionRate}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {comparisonPeriods.comparison.label}
                        </Typography>
                        <Box mb={2}>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(comparisonData.comparison.period.start).toLocaleDateString()} - {new Date(comparisonData.comparison.period.end).toLocaleDateString()}
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Total Incidents</Typography>
                            <Typography variant="h6">{comparisonData.comparison.metrics.totalIncidents}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Total Downtime</Typography>
                            <Typography variant="h6">{formatDuration(comparisonData.comparison.metrics.totalDowntime)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Avg Duration</Typography>
                            <Typography variant="h6">{formatDuration(comparisonData.comparison.metrics.avgDuration)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Disconnections</Typography>
                            <Typography variant="h6">{comparisonData.comparison.metrics.disconnectionRate}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Trend Analysis */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Trend Analysis & Insights
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                              Overall Trend: 
                              <Chip 
                                label={comparisonData.analysis.summary.overallTrend} 
                                size="small" 
                                color={comparisonData.analysis.summary.overallTrend === 'increasing' ? 'error' : 
                                       comparisonData.analysis.summary.overallTrend === 'decreasing' ? 'success' : 'default'}
                                sx={{ ml: 1 }}
                              />
                            </Typography>
                            
                            {comparisonData.analysis.summary.significantChanges.length > 0 && (
                              <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Significant Changes (>10%):
                                </Typography>
                                {comparisonData.analysis.summary.significantChanges.map((change, index) => (
                                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                      {change.metric.replace(/([A-Z])/g, ' $1').trim()}
                                    </Typography>
                                    <Chip 
                                      label={`${change.change > 0 ? '+' : ''}${change.change.toFixed(1)}%`}
                                      size="small"
                                      color={change.trend === 'worse' ? 'error' : 'success'}
                                    />
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                              Recommendations
                            </Typography>
                            <Box>
                              {comparisonData.analysis.changes.totalIncidents.percentage > 10 && (
                                <Alert severity="warning" sx={{ mb: 1 }}>
                                  Incident rate increased significantly. Consider reviewing network configuration.
                                </Alert>
                              )}
                              {comparisonData.analysis.changes.totalDowntime.percentage > 20 && (
                                <Alert severity="error" sx={{ mb: 1 }}>
                                  Downtime increased substantially. Immediate attention required.
                                </Alert>
                              )}
                              {comparisonData.analysis.changes.totalIncidents.percentage < -10 && (
                                <Alert severity="success" sx={{ mb: 1 }}>
                                  Great improvement! Incident rate decreased significantly.
                                </Alert>
                              )}
                              {Math.abs(comparisonData.analysis.changes.totalIncidents.percentage) < 5 && (
                                <Alert severity="info" sx={{ mb: 1 }}>
                                  Network stability is consistent between periods.
                                </Alert>
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              
              {!comparisonLoading && !comparisonData && (
                <Alert severity="info">
                  Click "Compare" to analyze incident trends between different time periods.
                </Alert>
              )}
            </>
          )}

          {!timelineLoading && !comparisonMode && (!detailedTimelineData || !detailedTimelineData.incidents) && (
            <Alert severity="info">
              No timeline data available for this monitor. 
              Make sure the monitor is online and has incident tracking enabled.
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