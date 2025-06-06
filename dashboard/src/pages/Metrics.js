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
  LinearProgress
} from '@mui/material';
import {
  ShowChart as ChartIcon,
  Memory as CpuIcon,
  Storage as MemoryIcon,
  Thermostat as TempIcon,
  NetworkCheck as NetworkIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { fetchMetricsHistory, setSelectedPeriod } from '../store/slices/metricsSlice';
import { fetchMonitors } from '../store/slices/monitorsSlice';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Metrics() {
  const dispatch = useDispatch();
  const monitors = useSelector((state) => state.monitors.list);
  const { history, selectedPeriod, loading } = useSelector((state) => state.metrics);
  const [selectedMonitor, setSelectedMonitor] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState(['latency', 'packetLoss']);

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
      dispatch(fetchMetricsHistory({ 
        monitorId: selectedMonitor, 
        period: selectedPeriod 
      }));
    }
  }, [selectedMonitor, selectedPeriod, dispatch]);

  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod) {
      dispatch(setSelectedPeriod(newPeriod));
    }
  };

  const handleMetricsChange = (event, newMetrics) => {
    if (newMetrics.length > 0) {
      setSelectedMetrics(newMetrics);
    }
  };

  const getChartData = () => {
    const data = history[selectedMonitor];
    if (!data || !data.chartData) return null;

    const datasets = [];
    const colors = {
      cpu: { border: '#3f51b5', background: 'rgba(63, 81, 181, 0.1)' },
      memory: { border: '#f50057', background: 'rgba(245, 0, 87, 0.1)' },
      temperature: { border: '#ff9800', background: 'rgba(255, 152, 0, 0.1)' },
      latency: { border: '#4caf50', background: 'rgba(76, 175, 80, 0.1)' },
      packetLoss: { border: '#f44336', background: 'rgba(244, 67, 54, 0.1)' }
    };

    selectedMetrics.forEach(metric => {
      if (data.chartData.datasets[metric]) {
        datasets.push({
          label: metric.charAt(0).toUpperCase() + metric.slice(1),
          data: data.chartData.datasets[metric],
          borderColor: colors[metric]?.border || '#000',
          backgroundColor: colors[metric]?.background || 'rgba(0,0,0,0.1)',
          tension: 0.4,
          fill: true
        });
      }
    });

    return {
      labels: data.chartData.labels.map(label => 
        new Date(label).toLocaleTimeString()
      ),
      datasets
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Value'
        },
        beginAtZero: true
      }
    }
  };

  const chartData = getChartData();

  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom>
        System Metrics
      </Typography>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
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

          <Grid item xs={12} md={4}>
            <ToggleButtonGroup
              value={selectedPeriod}
              exclusive
              onChange={handlePeriodChange}
              fullWidth
            >
              <ToggleButton value="1h">1H</ToggleButton>
              <ToggleButton value="6h">6H</ToggleButton>
              <ToggleButton value="24h">24H</ToggleButton>
              <ToggleButton value="7d">7D</ToggleButton>
              <ToggleButton value="30d">30D</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} md={4}>
            <ToggleButtonGroup
              value={selectedMetrics}
              onChange={handleMetricsChange}
              fullWidth
            >
              <ToggleButton value="cpu" size="small">
                <CpuIcon fontSize="small" sx={{ mr: 0.5 }} />
                CPU
              </ToggleButton>
              <ToggleButton value="memory" size="small">
                <MemoryIcon fontSize="small" sx={{ mr: 0.5 }} />
                RAM
              </ToggleButton>
              <ToggleButton value="temperature" size="small">
                <TempIcon fontSize="small" sx={{ mr: 0.5 }} />
                Temp
              </ToggleButton>
              <ToggleButton value="latency" size="small">
                <NetworkIcon fontSize="small" sx={{ mr: 0.5 }} />
                Ping
              </ToggleButton>
              <ToggleButton value="packetLoss" size="small">
                <SpeedIcon fontSize="small" sx={{ mr: 0.5 }} />
                Loss
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Chart */}
      <Paper sx={{ p: 2, mb: 3, height: 400 }}>
        {loading && <LinearProgress />}
        {chartData && !loading ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          !loading && (
            <Box display="flex" alignItems="center" justifyContent="center" height="100%">
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
                <CpuIcon color="primary" />
                <Typography variant="h6">CPU Usage</Typography>
              </Box>
              <Typography variant="h4">
                {history[selectedMonitor]?.chartData?.datasets?.cpu?.slice(-1)[0]?.toFixed(0) || 0}%
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
                {history[selectedMonitor]?.chartData?.datasets?.memory?.slice(-1)[0]?.toFixed(0) || 0}%
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
                {history[selectedMonitor]?.chartData?.datasets?.temperature?.slice(-1)[0]?.toFixed(0) || 0}°C
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
                {history[selectedMonitor]?.chartData?.datasets?.latency?.slice(-1)[0]?.toFixed(0) || 0}ms
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
                {history[selectedMonitor]?.chartData?.datasets?.packetLoss?.slice(-1)[0]?.toFixed(1) || 0}%
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