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
        // Transform the labels with smart formatting and aggregation
        const rawLabels = response.data.chartData.labels;
        const rawDatasets = response.data.chartData.datasets;
        
        // Apply smart aggregation for longer periods
        const { aggregatedLabels, aggregatedDatasets } = aggregateDataForPeriod(
          rawLabels, 
          rawDatasets, 
          period
        );
        
        const transformedData = {
          labels: aggregatedLabels.map(label => formatTimeLabel(new Date(label), period)),
          datasets: aggregatedDatasets
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
    // Generate sample data based on period
    const now = new Date();
    const labels = [];
    const datasets = {
      latency: [],
      packetLoss: [],
      jitter: [],
      successRate: []
    };
    
    // Dynamic data points and intervals based on period
    const periodConfig = {
      '1h': { points: 60, interval: 1 * 60 * 1000 }, // 1 minute intervals
      '6h': { points: 72, interval: 5 * 60 * 1000 }, // 5 minute intervals  
      '24h': { points: 96, interval: 15 * 60 * 1000 }, // 15 minute intervals
      '7d': { points: 168, interval: 60 * 60 * 1000 } // 1 hour intervals
    };
    
    const config = periodConfig[period] || periodConfig['1h'];
    
    for (let i = config.points - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * config.interval);
      const baseLatency = 50;
      const variation = Math.random() * 20 - 10;
      const latency = Math.max(10, baseLatency + variation + (i < 20 ? 30 : 0)); // Spike in recent data
      
      labels.push(formatTimeLabel(timestamp, period));
      datasets.latency.push(latency);
      datasets.packetLoss.push(Math.random() * 5);
      datasets.jitter.push(Math.random() * 10 + 5);
      datasets.successRate.push(95 + Math.random() * 5);
    }
    
    setData({ labels, datasets });
  };

  const aggregateDataForPeriod = (labels, datasets, period) => {
    // For shorter periods, no aggregation needed
    if (period === '1h' || period === '6h') {
      return { aggregatedLabels: labels, aggregatedDatasets: datasets };
    }
    
    // For longer periods, aggregate data points
    const aggregationFactor = period === '24h' ? 4 : period === '7d' ? 12 : 1;
    
    if (aggregationFactor === 1) {
      return { aggregatedLabels: labels, aggregatedDatasets: datasets };
    }
    
    const aggregatedLabels = [];
    const aggregatedDatasets = {};
    
    // Initialize aggregated datasets
    Object.keys(datasets).forEach(key => {
      aggregatedDatasets[key] = [];
    });
    
    // Aggregate data points by averaging groups
    for (let i = 0; i < labels.length; i += aggregationFactor) {
      const endIndex = Math.min(i + aggregationFactor, labels.length);
      
      // Use the middle timestamp for the group
      aggregatedLabels.push(labels[Math.floor((i + endIndex - 1) / 2)]);
      
      // Average the values in each group
      Object.keys(datasets).forEach(key => {
        const group = datasets[key].slice(i, endIndex);
        const average = group.reduce((sum, val) => sum + (val || 0), 0) / group.length;
        aggregatedDatasets[key].push(Number(average.toFixed(2)));
      });
    }
    
    return { aggregatedLabels, aggregatedDatasets };
  };

  const formatTimeLabel = (timestamp, period) => {
    switch (period) {
      case '1h':
      case '6h':
        return timestamp.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      case '24h':
        return timestamp.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      case '7d':
        return timestamp.toLocaleDateString('en-US', { 
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          hour12: false
        }).replace(',', '');
      default:
        return timestamp.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
    }
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

    // Smart label sampling for better readability
    const maxLabels = getMaxLabelsForPeriod(period);
    const labelStep = Math.max(1, Math.ceil(data.labels.length / maxLabels));
    const sampledLabels = data.labels.filter((_, index) => index % labelStep === 0);
    const sampledSeries = series.map(serie => ({
      ...serie,
      data: serie.data.filter((_, index) => index % labelStep === 0)
    }));

    return {
      xAxis: [{ 
        scaleType: 'point', 
        data: sampledLabels,
        label: 'Time',
        labelStyle: {
          fontSize: period === '7d' ? 10 : 12,
          angle: period === '24h' || period === '7d' ? -45 : 0
        }
      }],
      series: sampledSeries,
      height: 450,
      margin: { 
        left: 60, 
        right: 20, 
        top: 20, 
        bottom: period === '24h' || period === '7d' ? 80 : 60 
      }
    };
  };

  const getMaxLabelsForPeriod = (period) => {
    switch (period) {
      case '1h': return 12; // Show every 5 minutes
      case '6h': return 18; // Show every 20 minutes
      case '24h': return 24; // Show every hour
      case '7d': return 14; // Show every 12 hours
      default: return 12;
    }
  };

  const getPeriodDescription = (period) => {
    switch (period) {
      case '1h': return '1 minute';
      case '6h': return '5 minutes';
      case '24h': return '15 minutes';
      case '7d': return '1 hour';
      default: return '1 minute';
    }
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
                  grid={{ vertical: true, horizontal: true }}
                  tooltip={{ trigger: 'axis' }}
                  slotProps={{
                    legend: {
                      direction: 'row',
                      position: { vertical: 'top', horizontal: 'center' },
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Period: <strong>{period.toUpperCase()}</strong> | 
                  Data points: <strong>{data.labels?.length || 0}</strong> | 
                  Showing every {getPeriodDescription(period)}
                </Typography>
              </Box>
            ) : (
              !loading && (
                <Box display="flex" alignItems="center" justifyContent="center" height={450}>
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