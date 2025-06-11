import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Typography, 
  Box, 
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  LinearProgress,
  Tabs,
  Tab,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ShowChart as ChartIcon,
  Memory as CpuIcon,
  Storage as MemoryIcon,
  Thermostat as TempIcon,
  NetworkCheck as NetworkIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { LineChart } from '@mui/x-charts/LineChart';
import { fetchMetricsHistory, setSelectedPeriod } from '../store/slices/metricsSlice';
import { fetchMonitors } from '../store/slices/monitorsSlice';
import apiService from '../services/api';

function Metrics() {
  const dispatch = useDispatch();
  const monitors = useSelector((state) => state.monitors.list);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonitor, setSelectedMonitor] = useState('');
  const [selectedServiceMonitor, setSelectedServiceMonitor] = useState('');
  const [serviceMonitors, setServiceMonitors] = useState([]);
  const [period, setPeriod] = useState('1h');
  console.log('Current period state:', period);
  const [activeTab, setActiveTab] = useState(0);
  const [metricType, setMetricType] = useState('system'); // 'system' or 'service'

  useEffect(() => {
    dispatch(fetchMonitors());
  }, [dispatch]);

  useEffect(() => {
    console.log('Monitors from Redux:', monitors);
    console.log('Current selectedMonitor:', selectedMonitor);
    if (monitors.length > 0 && !selectedMonitor) {
      console.log('Setting selectedMonitor to:', monitors[0].monitorId);
      setSelectedMonitor(monitors[0].monitorId);
    }
  }, [monitors, selectedMonitor]);

  // Fetch service monitors when monitor is selected
  useEffect(() => {
    if (selectedMonitor && metricType === 'service') {
      fetchServiceMonitors();
    }
  }, [selectedMonitor, metricType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (metricType === 'system' && selectedMonitor) {
      fetchMetricsData();
    } else if (metricType === 'service' && selectedServiceMonitor) {
      fetchServiceMetricsData();
    }
  }, [selectedMonitor, selectedServiceMonitor, period, metricType]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMetricsData = async () => {
    if (!selectedMonitor) {
      setError('No monitor selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Metrics page: Fetching data for monitor:', selectedMonitor, 'period:', period);
      console.log('API URL will be:', `/metrics/monitor/${selectedMonitor}/history?period=${period}&metric=all`);
      const response = await apiService.getMetricsHistory(selectedMonitor, { period, metric: 'all' });
      console.log('Metrics page: Response received:', response.data);
      console.log('Response chartData:', response.data?.chartData);
      console.log('Response count:', response.data?.count);
      setChartData(response.data);
    } catch (err) {
      console.error('Metrics fetch error:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.message || 'Failed to fetch metrics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceMonitors = async () => {
    try {
      console.log('Fetching service monitors for:', selectedMonitor);
      const response = await apiService.getServiceMonitorsWithMetrics(selectedMonitor);
      console.log('Service monitors response:', response.data);
      setServiceMonitors(response.data || []);
      if (response.data && response.data.length > 0 && !selectedServiceMonitor) {
        setSelectedServiceMonitor(response.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch service monitors:', err);
      setServiceMonitors([]);
      setChartData(null); // Clear any existing chart data
    }
  };

  const fetchServiceMetricsData = async () => {
    if (!selectedServiceMonitor) {
      setError('No service monitor selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching service metrics for:', selectedServiceMonitor, 'period:', period);
      const response = await apiService.getServiceMonitorHistory(selectedServiceMonitor, { period });
      console.log('Service metrics response:', response.data);
      setChartData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch service metrics data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const getChartConfig = () => {
    console.log('getChartConfig called, chartData:', chartData);
    if (!chartData || !chartData.chartData) {
      console.log('getChartConfig returning null - no chartData');
      return null;
    }

    const { labels, datasets } = chartData.chartData;
    console.log('Chart labels length:', labels?.length);
    console.log('Chart datasets:', datasets);
    
    // Validate data exists and has length
    if (!labels || labels.length === 0) {
      console.log('getChartConfig returning null - no labels');
      return null;
    }
    
    const timeLabels = labels.map(formatTime);

    if (metricType === 'system') {
      switch (activeTab) {
        case 0: // System Performance
          return {
            xAxis: [{ scaleType: 'point', data: timeLabels }],
            series: [
              {
                data: datasets.cpu || [],
                label: 'CPU (%)',
                color: '#1976d2',
              },
              {
                data: datasets.memory || [],
                label: 'Memory (%)',
                color: '#dc004e',
              },
              {
                data: datasets.temperature || [],
                label: 'Temperature (°C)',
                color: '#ed6c02',
              }
            ].filter(serie => {
              console.log(`Filtering series ${serie.label}: data length = ${serie.data?.length}`);
              return serie.data && serie.data.length > 0;
            }), // Only include series with data
            height: 400
          };
        
        case 1: // Network Performance
          return {
            xAxis: [{ scaleType: 'point', data: timeLabels }],
            series: [
              {
                data: datasets.latency || [],
                label: 'Latency (ms)',
                color: '#2e7d32',
              },
              {
                data: datasets.packetLoss || [],
                label: 'Packet Loss (%)',
                color: '#d32f2f',
              }
            ].filter(serie => {
              console.log(`Filtering network series ${serie.label}: data length = ${serie.data?.length}`);
              return serie.data && serie.data.length > 0;
            }),
            height: 400
          };
        
        default:
          return null;
      }
    } else {
      // Service monitor metrics
      switch (activeTab) {
        case 0: // Service Performance
          const perfSeries = [
            {
              data: datasets.latency || [],
              label: 'Response Time (ms)',
              color: '#1976d2',
            },
            {
              data: datasets.jitter || [],
              label: 'Jitter (ms)',
              color: '#ed6c02',
            }
          ].filter(serie => serie.data.length > 0);
          
          // Return null if no series have data
          if (perfSeries.length === 0) return null;
          
          return {
            xAxis: [{ scaleType: 'point', data: timeLabels }],
            series: perfSeries,
            height: 400
          };
        
        case 1: // Service Availability
          const availSeries = [
            {
              data: datasets.successRate || [],
              label: 'Success Rate (%)',
              color: '#2e7d32',
            },
            {
              data: datasets.packetLoss || [],
              label: 'Packet Loss (%)',
              color: '#d32f2f',
            }
          ].filter(serie => serie.data.length > 0);
          
          if (availSeries.length === 0) return null;
          
          return {
            xAxis: [{ scaleType: 'point', data: timeLabels }],
            series: availSeries,
            height: 400
          };
        
        default:
          return null;
      }
    }
  };

  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod) {
      setPeriod(newPeriod);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getCurrentMetricValue = (metric) => {
    if (!chartData?.chartData?.datasets?.[metric]) return 0;
    const values = chartData.chartData.datasets[metric];
    return values[values.length - 1] || 0;
  };

  const handleMetricTypeChange = (event) => {
    setMetricType(event.target.value);
    setActiveTab(0); // Reset to first tab
  };

  if (loading && !chartData) {
    return (
      <Box className="fade-in">
        <Typography variant="h4" gutterBottom>
          System Metrics
        </Typography>
        <Box display="flex" justifyContent="center" alignItems="center" height={200}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="fade-in">
        <Typography variant="h4" gutterBottom>
          System Metrics
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  const chartConfig = getChartConfig();

  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom>
        System Metrics
      </Typography>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Metric Type</InputLabel>
              <Select
                value={metricType}
                onChange={handleMetricTypeChange}
                label="Metric Type"
              >
                <MenuItem value="system">System Metrics</MenuItem>
                <MenuItem value="service">Service Monitors</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>{metricType === 'system' ? 'Monitor' : 'Service'}</InputLabel>
              <Select
                value={metricType === 'system' ? selectedMonitor : selectedServiceMonitor}
                onChange={(e) => {
                  if (metricType === 'system') {
                    setSelectedMonitor(e.target.value);
                  } else {
                    setSelectedServiceMonitor(e.target.value);
                  }
                }}
                label={metricType === 'system' ? 'Monitor' : 'Service'}
              >
                {metricType === 'system' 
                  ? monitors.map((monitor) => (
                      <MenuItem key={monitor.monitorId} value={monitor.monitorId}>
                        {monitor.name} ({monitor.monitorId})
                      </MenuItem>
                    ))
                  : serviceMonitors.length > 0 
                    ? serviceMonitors.map((sm) => (
                        <MenuItem key={sm._id} value={sm._id}>
                          {sm.serviceName} ({sm.type})
                        </MenuItem>
                      ))
                    : <MenuItem value="" disabled>No service monitors configured</MenuItem>
                }
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={handlePeriodChange}
              fullWidth
            >
              <ToggleButton value="1h">1H</ToggleButton>
              <ToggleButton value="6h">6H</ToggleButton>
              <ToggleButton value="24h">24H</ToggleButton>
              <ToggleButton value="7d">7D</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Chart */}
      <Paper sx={{ p: 2, mb: 3 }}>
        {loading && <LinearProgress />}
        
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label={metricType === 'system' ? 'System Performance' : 'Service Performance'} />
          <Tab label={metricType === 'system' ? 'Network Performance' : 'Service Availability'} />
        </Tabs>

        {(() => {
          console.log('Chart render conditions:');
          console.log('- chartConfig exists:', !!chartConfig);
          console.log('- chartData:', chartData);
          console.log('- chartData?.count:', chartData?.count);
          console.log('- chartConfig?.series exists:', !!chartConfig?.series);
          console.log('- chartConfig?.series?.length:', chartConfig?.series?.length);
          console.log('- Full chartConfig:', chartConfig);
          const shouldRenderChart = chartConfig && chartData?.count > 0 && chartConfig.series && chartConfig.series.length > 0;
          console.log('- Should render chart:', shouldRenderChart);
          return shouldRenderChart;
        })() ? (
          <Box>
            <LineChart
              {...chartConfig}
              margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
              grid={{ vertical: true, horizontal: true }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Showing {chartData.count} data points from {new Date(chartData.startDate).toLocaleString()} to {new Date(chartData.endDate).toLocaleString()}
            </Typography>
          </Box>
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              {metricType === 'service' && serviceMonitors.length === 0 
                ? 'No service monitors configured. Please add service monitors first.'
                : 'No metrics data available for the selected period'
              }
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2}>
        {metricType === 'system' ? (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CpuIcon color="primary" />
                    <Typography variant="h6">CPU Usage</Typography>
                  </Box>
                  <Typography variant="h4">
                    {getCurrentMetricValue('cpu').toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <MemoryIcon color="primary" />
                    <Typography variant="h6">Memory</Typography>
                  </Box>
                  <Typography variant="h4">
                    {getCurrentMetricValue('memory').toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <TempIcon color="primary" />
                    <Typography variant="h6">Temperature</Typography>
                  </Box>
                  <Typography variant="h4">
                    {getCurrentMetricValue('temperature').toFixed(0)}°C
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <NetworkIcon color="primary" />
                    <Typography variant="h6">Latency</Typography>
                  </Box>
                  <Typography variant="h4">
                    {getCurrentMetricValue('latency').toFixed(0)}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <SpeedIcon color="primary" />
                    <Typography variant="h6">Packet Loss</Typography>
                  </Box>
                  <Typography variant="h4">
                    {getCurrentMetricValue('packetLoss').toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        ) : (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <NetworkIcon color="primary" />
                    <Typography variant="h6">Response Time</Typography>
                  </Box>
                  <Typography variant="h4">
                    {getCurrentMetricValue('latency').toFixed(0)}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <ChartIcon color="primary" />
                    <Typography variant="h6">Success Rate</Typography>
                  </Box>
                  <Typography variant="h4">
                    {chartData?.successRate || getCurrentMetricValue('successRate').toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overall
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <SpeedIcon color="primary" />
                    <Typography variant="h6">Jitter</Typography>
                  </Box>
                  <Typography variant="h4">
                    {getCurrentMetricValue('jitter').toFixed(1)}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <SpeedIcon color="primary" />
                    <Typography variant="h6">Packet Loss</Typography>
                  </Box>
                  <Typography variant="h4">
                    {getCurrentMetricValue('packetLoss').toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <NetworkIcon color="primary" />
                    <Typography variant="h6">Service Type</Typography>
                  </Box>
                  <Typography variant="h4">
                    {chartData?.serviceMonitor?.type?.toUpperCase() || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {chartData?.serviceMonitor?.target || 'No target'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
}

export default Metrics; 