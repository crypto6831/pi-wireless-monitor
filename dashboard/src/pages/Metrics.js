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
import api from '../services/api';

function Metrics() {
  const dispatch = useDispatch();
  const monitors = useSelector((state) => state.monitors.list);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonitor, setSelectedMonitor] = useState('');
  const [period, setPeriod] = useState('1h');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    dispatch(fetchMonitors());
  }, [dispatch]);

  useEffect(() => {
    if (monitors.length > 0 && !selectedMonitor) {
      setSelectedMonitor(monitors[0].monitorId);
    }
  }, [monitors, selectedMonitor]);

  useEffect(() => {
    if (selectedMonitor) {
      fetchMetricsData();
    }
  }, [selectedMonitor, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMetricsData = async () => {
    if (!selectedMonitor) {
      setError('No monitor selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/metrics/monitor/${selectedMonitor}/history?period=${period}&metric=all`);
      setChartData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch metrics data');
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
    if (!chartData || !chartData.chartData) return null;

    const { labels, datasets } = chartData.chartData;
    const timeLabels = labels.map(formatTime);

    switch (activeTab) {
      case 0: // System Performance
        return {
          xAxis: [{ scaleType: 'point', data: timeLabels }],
          series: [
            {
              data: datasets.cpu,
              label: 'CPU (%)',
              color: '#1976d2',
            },
            {
              data: datasets.memory,
              label: 'Memory (%)',
              color: '#dc004e',
            },
            {
              data: datasets.temperature,
              label: 'Temperature (°C)',
              color: '#ed6c02',
            }
          ],
          height: 400
        };
      
      case 1: // Network Performance
        return {
          xAxis: [{ scaleType: 'point', data: timeLabels }],
          series: [
            {
              data: datasets.latency,
              label: 'Latency (ms)',
              color: '#2e7d32',
            },
            {
              data: datasets.packetLoss,
              label: 'Packet Loss (%)',
              color: '#d32f2f',
            }
          ],
          height: 400
        };
      
      default:
        return null;
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
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Monitor</InputLabel>
              <Select
                value={selectedMonitor}
                onChange={(e) => setSelectedMonitor(e.target.value)}
                label="Monitor"
              >
                {monitors.map((monitor) => (
                  <MenuItem key={monitor.monitorId} value={monitor.monitorId}>
                    {monitor.name} ({monitor.monitorId})
                  </MenuItem>
                ))}
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
          <Tab label="System Performance" />
          <Tab label="Network Performance" />
        </Tabs>

        {chartConfig && chartData?.count > 0 ? (
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
              No metrics data available for the selected period
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2}>
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
      </Grid>
    </Box>
  );
}

export default Metrics; 