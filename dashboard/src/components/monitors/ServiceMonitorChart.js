import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Grid,
  LinearProgress,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  NetworkCheck as NetworkIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  ShowChart as ChartIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { LineChart } from '@mui/x-charts/LineChart';
import axios from 'axios';

const ServiceMonitorChart = ({ service, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('1h');
  const [selectedMetrics, setSelectedMetrics] = useState(['latency']);

  useEffect(() => {
    fetchMetricsHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service._id, period]);

  const fetchMetricsHistory = async () => {
    try {
      setLoading(true);
      // Note: This endpoint would need to be implemented in the backend
      const response = await axios.get(`/api/service-monitors/${service._id}/history`, {
        params: { period },
      });
      
      // Use the chartData from the API response
      if (response.data.success && response.data.chartData) {
        // Transform the labels to time format and prepare data
        const transformedData = {
          labels: response.data.chartData.labels.map(label => 
            new Date(label).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          ),
          datasets: response.data.chartData.datasets
        };
        setData(transformedData);
      } else {
        console.error('Invalid response format:', response.data);
        generateSampleData();
      }
    } catch (error) {
      console.error('Error fetching metrics history:', error);
      // For now, generate sample data
      generateSampleData();
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    // Generate sample data for demonstration
    const now = new Date();
    const labels = [];
    const datasets = {
      latency: [],
      packetLoss: [],
      jitter: [],
      successRate: []
    };
    
    for (let i = 60; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60000); // 1 minute intervals
      const baseLatency = 50;
      const variation = Math.random() * 20 - 10;
      const latency = Math.max(10, baseLatency + variation + (i < 20 ? 30 : 0)); // Spike in recent data
      
      labels.push(timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      datasets.latency.push(latency);
      datasets.packetLoss.push(Math.random() * 5);
      datasets.jitter.push(Math.random() * 10 + 5);
      datasets.successRate.push(95 + Math.random() * 5);
    }
    
    setData({ labels, datasets });
  };

  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  const handleMetricsChange = (event, newMetrics) => {
    if (newMetrics.length > 0) {
      setSelectedMetrics(newMetrics);
    }
  };

  const getChartConfig = () => {
    if (!data || !data.labels || !data.datasets) return null;

    const series = [];
    const colors = {
      latency: '#2196f3',
      packetLoss: '#f44336',
      jitter: '#ff9800',
      successRate: '#4caf50',
    };

    const metricLabels = {
      latency: 'Latency (ms)',
      packetLoss: 'Packet Loss (%)',
      jitter: 'Jitter (ms)',
      successRate: 'Success Rate (%)',
    };

    selectedMetrics.forEach(metric => {
      if (data.datasets[metric]) {
        series.push({
          label: metricLabels[metric],
          data: data.datasets[metric],
          color: colors[metric],
        });
      }
    });

    return {
      xAxis: [{ 
        scaleType: 'point', 
        data: data.labels,
        label: 'Time'
      }],
      series: series,
      height: 400
    };
  };

  const chartConfig = getChartConfig();

  // Calculate current values for summary cards
  const currentValues = data.labels && data.datasets && data.labels.length > 0 ? {
    latency: data.datasets.latency?.[data.datasets.latency.length - 1] || 0,
    packetLoss: data.datasets.packetLoss?.[data.datasets.packetLoss.length - 1] || 0,
    jitter: data.datasets.jitter?.[data.datasets.jitter.length - 1] || 0,
    successRate: data.datasets.successRate?.[data.datasets.successRate.length - 1] || 0,
  } : {};

  return (
    <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          {service.serviceName} - Metrics History
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Controls */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <ToggleButtonGroup
                  value={selectedMetrics}
                  onChange={handleMetricsChange}
                  fullWidth
                >
                  <ToggleButton value="latency" size="small">
                    <NetworkIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Latency
                  </ToggleButton>
                  <ToggleButton value="packetLoss" size="small">
                    <SpeedIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Loss
                  </ToggleButton>
                  <ToggleButton value="jitter" size="small">
                    <TimelineIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Jitter
                  </ToggleButton>
                  <ToggleButton value="successRate" size="small">
                    <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Success Rate
                  </ToggleButton>
                </ToggleButtonGroup>
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
            {chartConfig && !loading ? (
              <Box>
                <LineChart
                  {...chartConfig}
                  margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                  grid={{ vertical: true, horizontal: true }}
                />
                {selectedMetrics.includes('cusum') && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Note: Decision Interval at {service.cusumConfig.decisionInterval} is shown for reference
                  </Typography>
                )}
              </Box>
            ) : (
              !loading && (
                <Box display="flex" alignItems="center" justifyContent="center" height={400}>
                  <Typography color="text.secondary">
                    No data available for the selected period
                  </Typography>
                </Box>
              )
            )}
          </Paper>

          {/* Summary Cards */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <NetworkIcon color="primary" />
                    <Typography variant="h6">Latency</Typography>
                  </Box>
                  <Typography variant="h4">
                    {currentValues.latency?.toFixed(1) || 0}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Target: {service.thresholds?.latency?.warning || 100}ms
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
                    {currentValues.packetLoss?.toFixed(1) || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Threshold: {service.thresholds?.packetLoss?.warning}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <TimelineIcon color="primary" />
                    <Typography variant="h6">Jitter</Typography>
                  </Box>
                  <Typography variant="h4">
                    {currentValues.jitter?.toFixed(1) || 0}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Threshold: {service.thresholds?.jitter?.warning}ms
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <TrendingUpIcon color={currentValues.successRate >= 95 ? 'success' : 'warning'} />
                    <Typography variant="h6">Success Rate</Typography>
                  </Box>
                  <Typography variant="h4" color={currentValues.successRate >= 95 ? 'success.main' : 'warning.main'}>
                    {currentValues.successRate?.toFixed(1) || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Target: ≥95%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceMonitorChart;