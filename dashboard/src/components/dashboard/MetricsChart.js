import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Typography,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import api from '../../services/api';

function MetricsChart() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState('1h');
  const monitors = useSelector((state) => state.monitors.list);
  const activeMonitor = monitors.find(m => m.status === 'active');

  useEffect(() => {
    if (activeMonitor) {
      fetchMetricsData();
    }
  }, [activeMonitor, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMetricsData = async () => {
    if (!activeMonitor) {
      setError('No active monitors found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/metrics/monitor/${activeMonitor.monitorId}/history?period=${period}&metric=all`);
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
          height: 300
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
          height: 300
        };
      
      default:
        return null;
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };

  if (!activeMonitor) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          System Metrics
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          No active monitors found. Please ensure at least one monitor is connected.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
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
      <Box>
        <Typography variant="h6" gutterBottom>
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
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          System Metrics - {activeMonitor.name}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select value={period} onChange={handlePeriodChange} label="Period">
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="6h">Last 6 Hours</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="System Performance" />
        <Tab label="Network Performance" />
      </Tabs>

      {chartConfig && chartData.count > 0 ? (
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
    </Box>
  );
}

export default MetricsChart; 