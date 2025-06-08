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
// Temporarily comment out LineChart to test if that's the issue
// import { LineChart } from '@mui/x-charts/LineChart';
import api from '../../services/api';

function MetricsChart() {
  console.log('MetricsChart component rendering...');
  
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false to see static content
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState('1h');
  const monitors = useSelector((state) => state.monitors.list);
  const activeMonitor = monitors.find(m => m.status === 'active');

  // Debug logging
  console.log('MetricsChart - monitors:', monitors);
  console.log('MetricsChart - activeMonitor:', activeMonitor);

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

  // Simplified return for testing
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        System Metrics - TEST
      </Typography>
      <Box p={2}>
        <Typography variant="body1">
          Monitor Count: {monitors.length}
        </Typography>
        <Typography variant="body1">
          Active Monitor: {activeMonitor ? activeMonitor.name : 'None'}
        </Typography>
        <Typography variant="body1">
          Component Status: Rendering Successfully
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Error: {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
}

export default MetricsChart; 