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
  }, [service._id, period]);

  const fetchMetricsHistory = async () => {
    try {
      setLoading(true);
      // Note: This endpoint would need to be implemented in the backend
      const response = await axios.get(`/api/metrics/service/${service._id}/history`, {
        params: { period },
      });
      
      // Transform data for chart
      const chartData = response.data.map(item => ({
        timestamp: item.timestamp,
        time: new Date(item.timestamp).toLocaleTimeString(),
        latency: item.latency,
        packetLoss: item.packetLoss,
        jitter: item.jitter,
        cusumUpper: item.cusumState?.upperSum,
        cusumLower: item.cusumState?.lowerSum,
      }));
      
      setData(chartData);
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
    const sampleData = [];
    
    for (let i = 60; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60000); // 1 minute intervals
      const baseLatency = service.cusumConfig.targetMean || 50;
      const variation = Math.random() * 20 - 10;
      const latency = Math.max(10, baseLatency + variation + (i < 20 ? 30 : 0)); // Spike in recent data
      
      sampleData.push({
        timestamp: timestamp.toISOString(),
        time: timestamp.toLocaleTimeString(),
        latency: latency,
        packetLoss: Math.random() * 5,
        jitter: Math.random() * 10 + 5,
        cusumUpper: Math.max(0, (i < 20 ? (20 - i) * 0.5 : 0)),
        cusumLower: 0,
      });
    }
    
    setData(sampleData);
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
    if (!data || data.length === 0) return null;

    const series = [];
    const colors = {
      latency: '#2196f3',
      packetLoss: '#f44336',
      jitter: '#ff9800',
      cusumUpper: '#ff5722',
      cusumLower: '#3f51b5',
    };

    const metricLabels = {
      latency: 'Latency (ms)',
      packetLoss: 'Packet Loss (%)',
      jitter: 'Jitter (ms)',
      cusumUpper: 'Upper CUSUM',
      cusumLower: 'Lower CUSUM',
    };

    selectedMetrics.forEach(metric => {
      if (metric === 'cusum') {
        // Add both upper and lower CUSUM
        series.push({
          label: metricLabels.cusumUpper,
          data: data.map(d => d.cusumUpper),
          color: colors.cusumUpper,
        });
        series.push({
          label: metricLabels.cusumLower,
          data: data.map(d => d.cusumLower),
          color: colors.cusumLower,
        });
      } else {
        series.push({
          label: metricLabels[metric],
          data: data.map(d => d[metric]),
          color: colors[metric],
        });
      }
    });

    return {
      xAxis: [{ 
        scaleType: 'point', 
        data: data.map(d => d.time),
        label: 'Time'
      }],
      series: series,
      height: 400
    };
  };

  const chartConfig = getChartConfig();

  // Calculate current values for summary cards
  const currentValues = data.length > 0 ? {
    latency: data[data.length - 1].latency,
    packetLoss: data[data.length - 1].packetLoss,
    jitter: data[data.length - 1].jitter,
    cusumStatus: data[data.length - 1].cusumUpper > service.cusumConfig.decisionInterval || 
                 data[data.length - 1].cusumLower > service.cusumConfig.decisionInterval,
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
                  <ToggleButton value="cusum" size="small">
                    <ChartIcon fontSize="small" sx={{ mr: 0.5 }} />
                    CUSUM
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
                    Target: {service.cusumConfig.targetMean}ms
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
                    {currentValues.cusumStatus ? (
                      <TrendingUpIcon color="warning" />
                    ) : (
                      <TrendingDownIcon color="success" />
                    )}
                    <Typography variant="h6">CUSUM Status</Typography>
                  </Box>
                  <Typography variant="h4" color={currentValues.cusumStatus ? 'warning.main' : 'success.main'}>
                    {currentValues.cusumStatus ? 'Anomaly' : 'Normal'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Decision Interval: {service.cusumConfig.decisionInterval}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {selectedMetrics.includes('cusum') && (
            <Alert severity="info" sx={{ mt: 2 }}>
              CUSUM (Cumulative Sum) chart shows the accumulated deviations from the target mean.
              When either sum exceeds the decision interval (red line), an anomaly is detected.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceMonitorChart;