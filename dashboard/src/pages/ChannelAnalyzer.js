import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { ScatterChart } from '@mui/x-charts/ScatterChart';
import { useSelector } from 'react-redux';
import apiService from '../services/api';

const ChannelAnalyzer = () => {
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('1h');
  const [band, setBand] = useState('all');
  const [selectedMonitor, setSelectedMonitor] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Data states
  const [channelData, setChannelData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [interferenceData, setInterferenceData] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedChannels, setSelectedChannels] = useState([]);

  const monitors = useSelector((state) => state.monitors.list);

  // Helper functions for channel filtering
  const getAvailableChannels = () => {
    return [...new Set(channelData.map(ch => ch.channel))].sort((a, b) => a - b);
  };

  const getTopChannels = () => {
    return channelData
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 3)
      .map(ch => ch.channel);
  };

  // Fetch channel utilization data
  const fetchChannelData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        timeRange,
        band,
      };
      
      if (selectedMonitor !== 'all') {
        params.monitorId = selectedMonitor;
      }

      const response = await apiService.getChannelUtilization(params);
      
      if (response.data.success) {
        const formattedData = response.data.channels.map(channel => ({
          ...channel,
          utilizationDisplay: `${channel.utilization}%`,
          signalQuality: getSignalQuality(channel.maxSignal),
          channelLabel: `Ch ${channel.channel}`,
        }));
        
        setChannelData(formattedData);
        setStats({
          totalNetworks: response.data.totalNetworks,
          totalChannels: response.data.channels.length,
          timeRange: response.data.timeRange,
          band: response.data.band,
        });
      } else {
        throw new Error(response.data.error || 'Failed to fetch channel data');
      }
    } catch (err) {
      console.error('Error fetching channel data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch interference data
  const fetchInterferenceData = async () => {
    try {
      const params = { band };
      if (selectedMonitor !== 'all') {
        params.monitorId = selectedMonitor;
      }

      const response = await apiService.getChannelInterference(params);
      
      if (response.data.success) {
        setInterferenceData(response.data.interference);
      }
    } catch (err) {
      console.error('Error fetching interference data:', err);
    }
  };

  // Fetch timeline data
  const fetchTimelineData = async () => {
    try {
      const params = { timeRange };
      if (selectedMonitor !== 'all') {
        params.monitorId = selectedMonitor;
      }

      const response = await apiService.getChannelTimeline(params);
      
      if (response.data.success) {
        // Process timeline data for visualization
        const processedData = response.data.timeline.map(point => ({
          ...point,
          time: new Date(point.timestamp).toLocaleTimeString(),
          signalQuality: getSignalQuality(point.signalStrength),
        }));
        setTimelineData(processedData);
      }
    } catch (err) {
      console.error('Error fetching timeline data:', err);
    }
  };

  // Helper function to get signal quality
  const getSignalQuality = (signal) => {
    if (signal >= -50) return 'Excellent';
    if (signal >= -60) return 'Good';
    if (signal >= -70) return 'Fair';
    if (signal >= -80) return 'Poor';
    return 'Very Poor';
  };

  // Helper function to get signal color
  const getSignalColor = (signal) => {
    if (signal >= -60) return '#4caf50'; // Green
    if (signal >= -70) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  // Helper function to get utilization color
  const getUtilizationColor = (utilization) => {
    if (utilization >= 80) return '#f44336'; // Red
    if (utilization >= 60) return '#ff9800'; // Orange
    if (utilization >= 40) return '#ffeb3b'; // Yellow
    return '#4caf50'; // Green
  };

  useEffect(() => {
    fetchChannelData();
    fetchInterferenceData();
    if (tabValue === 1) {
      fetchTimelineData();
    }
  }, [timeRange, band, selectedMonitor, tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 1 && timelineData.length === 0) {
      fetchTimelineData();
    }
  };

  // Format data for MUI X-Charts
  const formatChannelDataForChart = () => {
    return {
      xAxis: [{ 
        scaleType: 'band', 
        data: channelData.map(channel => `Ch ${channel.channel}`) 
      }],
      series: [
        {
          data: channelData.map(channel => channel.utilization),
          label: 'Utilization (%)',
          color: '#1976d2',
        }
      ],
      height: 400,
    };
  };

  const formatTimelineDataForChart = () => {
    if (!timelineData.length) return { xAxis: [], series: [], height: 400 };
    
    // Filter data by selected channels
    const filteredData = selectedChannels.length > 0 
      ? timelineData.filter(point => selectedChannels.includes(point.channel))
      : timelineData;
    
    if (!filteredData.length) return { xAxis: [], series: [], height: 400 };
    
    // Sample data to reduce density - take every 5th point for better performance
    const sampledData = filteredData.filter((_, index) => index % 5 === 0);
    
    // Get unique timestamps and sort them
    const timestamps = [...new Set(sampledData.map(point => point.timestamp))].sort();
    
    // Group data by channel
    const channelGroups = {};
    sampledData.forEach(point => {
      if (!channelGroups[point.channel]) {
        channelGroups[point.channel] = {};
      }
      channelGroups[point.channel][point.timestamp] = point.signalStrength;
    });

    // Define colors for channels
    const channelColors = {
      1: '#1f77b4', 2: '#ff7f0e', 3: '#2ca02c', 5: '#d62728', 6: '#9467bd',
      10: '#8c564b', 11: '#e377c2', 36: '#7f7f7f', 48: '#bcbd22', 52: '#17becf'
    };

    // Create series data with proper null handling for missing timestamps
    const series = Object.keys(channelGroups).map(channel => ({
      data: timestamps.map(timestamp => channelGroups[channel][timestamp] || null),
      label: `Channel ${channel}`,
      connectNulls: false,
      color: channelColors[channel] || '#1976d2',
    }));

    return {
      xAxis: [{ 
        scaleType: 'time',
        data: timestamps.map(ts => new Date(ts)),
        valueFormatter: (value) => new Date(value).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }],
      series,
      height: 400,
      margin: { top: 50, right: 30, left: 70, bottom: 80 },
    };
  };

  const formatInterferenceDataForChart = () => {
    return {
      xAxis: [{ 
        scaleType: 'band', 
        data: interferenceData.map(channel => `Ch ${channel.channel}`) 
      }],
      series: [
        {
          data: interferenceData.map(channel => channel.interferenceLevel),
          label: 'Interference Level (%)',
          color: '#ff7300',
        }
      ],
      height: 400,
    };
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        WiFi Channel Analyzer
      </Typography>
      
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Monitor</InputLabel>
              <Select
                value={selectedMonitor}
                onChange={(e) => setSelectedMonitor(e.target.value)}
                label="Monitor"
              >
                <MenuItem value="all">All Monitors</MenuItem>
                {monitors.map((monitor) => (
                  <MenuItem key={monitor._id} value={monitor.monitorId}>
                    {monitor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Band</InputLabel>
              <Select
                value={band}
                onChange={(e) => setBand(e.target.value)}
                label="Band"
              >
                <MenuItem value="all">All Bands</MenuItem>
                <MenuItem value="2.4GHz">2.4 GHz</MenuItem>
                <MenuItem value="5GHz">5 GHz</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={12} md={6}>
            <Typography variant="body2" gutterBottom>
              Time Range
            </Typography>
            <ToggleButtonGroup
              value={timeRange}
              exclusive
              onChange={(e, newTimeRange) => newTimeRange && setTimeRange(newTimeRange)}
              size="small"
            >
              <ToggleButton value="5m">5M</ToggleButton>
              <ToggleButton value="15m">15M</ToggleButton>
              <ToggleButton value="1h">1H</ToggleButton>
              <ToggleButton value="6h">6H</ToggleButton>
              <ToggleButton value="24h">24H</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats Cards */}
      {stats.totalNetworks && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Networks
                </Typography>
                <Typography variant="h4">
                  {stats.totalNetworks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Active Channels
                </Typography>
                <Typography variant="h4">
                  {stats.totalChannels}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Time Range
                </Typography>
                <Typography variant="h4">
                  {timeRange.toUpperCase()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Band Filter
                </Typography>
                <Typography variant="h4">
                  {stats.band === 'all' ? 'ALL' : stats.band}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Channel Utilization" />
          <Tab label="Signal Timeline" />
          <Tab label="Interference Analysis" />
          <Tab label="Channel Details" />
        </Tabs>

        {/* Tab Panels */}
        <Box sx={{ p: 3 }}>
          {loading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}

          {/* Channel Utilization Tab */}
          {tabValue === 0 && !loading && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Channel Utilization Overview
              </Typography>
              {channelData.length > 0 ? (
                <BarChart
                  {...formatChannelDataForChart()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  yAxis={[{ 
                    min: 0, 
                    max: 100,
                    label: 'Utilization (%)'
                  }]}
                />
              ) : (
                <Alert severity="info">No channel data available for the selected criteria.</Alert>
              )}
            </Box>
          )}

          {/* Signal Timeline Tab */}
          {tabValue === 1 && !loading && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Signal Strength Timeline
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Shows signal strength trends over time. Select channels for clearer visualization.
              </Typography>
              
              {/* Channel Filter for Timeline */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Channel Filter (select up to 5 channels):
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel size="small">Select Channels</InputLabel>
                    <Select
                      multiple
                      size="small"
                      value={selectedChannels}
                      onChange={(e) => setSelectedChannels(e.target.value.slice(0, 5))}
                      label="Select Channels"
                      renderValue={(selected) => `${selected.length} selected`}
                    >
                      {getAvailableChannels().map((channel) => (
                        <MenuItem key={channel} value={channel}>
                          Channel {channel}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => setSelectedChannels([])}
                    disabled={selectedChannels.length === 0}
                  >
                    Clear
                  </Button>
                  <Button 
                    size="small" 
                    variant="contained"
                    onClick={() => setSelectedChannels(getTopChannels())}
                  >
                    Top 3 Channels
                  </Button>
                </Box>
                {selectedChannels.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Selected: {selectedChannels.map(ch => `Ch ${ch}`).join(', ')}
                    </Typography>
                  </Box>
                )}
              </Box>

              {timelineData.length > 0 ? (
                selectedChannels.length > 0 ? (
                  <LineChart
                    {...formatTimelineDataForChart()}
                    yAxis={[{ 
                      min: -100, 
                      max: -20,
                      label: 'Signal Strength (dBm)',
                      valueFormatter: (value) => `${value} dBm`,
                      tickMinStep: 10,
                    }]}
                    grid={{ horizontal: true, vertical: true }}
                    slotProps={{
                      legend: {
                        direction: 'row',
                        position: { vertical: 'top', horizontal: 'middle' },
                        padding: 0,
                      },
                    }}
                  />
                ) : (
                  <Alert severity="info">
                    Please select channels from the filter above to view the timeline.
                  </Alert>
                )
              ) : (
                <Alert severity="info">No timeline data available for the selected criteria.</Alert>
              )}
            </Box>
          )}

          {/* Interference Analysis Tab */}
          {tabValue === 2 && !loading && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Channel Interference Analysis
              </Typography>
              {interferenceData.length > 0 ? (
                <BarChart
                  {...formatInterferenceDataForChart()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  yAxis={[{ 
                    min: 0, 
                    max: 100,
                    label: 'Interference Level (%)'
                  }]}
                />
              ) : (
                <Alert severity="info">No interference data available for the selected criteria.</Alert>
              )}
            </Box>
          )}

          {/* Channel Details Tab */}
          {tabValue === 3 && !loading && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Detailed Channel Information
              </Typography>
              {channelData.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Channel</TableCell>
                        <TableCell>Band</TableCell>
                        <TableCell>Frequency</TableCell>
                        <TableCell>Networks</TableCell>
                        <TableCell>Utilization</TableCell>
                        <TableCell>Max Signal</TableCell>
                        <TableCell>Avg Signal</TableCell>
                        <TableCell>Quality</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {channelData.map((channel) => (
                        <TableRow key={channel.channel}>
                          <TableCell>{channel.channel}</TableCell>
                          <TableCell>
                            <Chip 
                              label={channel.band} 
                              size="small"
                              color={channel.band === '5GHz' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell>{channel.frequency} MHz</TableCell>
                          <TableCell>{channel.networkCount}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${channel.utilization}%`}
                              size="small"
                              sx={{ 
                                backgroundColor: getUtilizationColor(channel.utilization),
                                color: 'white'
                              }}
                            />
                          </TableCell>
                          <TableCell>{channel.maxSignal} dBm</TableCell>
                          <TableCell>{channel.avgSignal} dBm</TableCell>
                          <TableCell>
                            <Chip 
                              label={getSignalQuality(channel.maxSignal)}
                              size="small"
                              sx={{ 
                                backgroundColor: getSignalColor(channel.maxSignal),
                                color: 'white'
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No channel details available for the selected criteria.</Alert>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ChannelAnalyzer;