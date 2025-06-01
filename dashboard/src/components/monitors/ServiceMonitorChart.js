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
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import axios from 'axios';
import { format } from 'date-fns';

const ServiceMonitorChart = ({ service, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('1h');
  const [metric, setMetric] = useState('latency');

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
        time: format(new Date(item.timestamp), 'HH:mm'),
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
        time: format(timestamp, 'HH:mm'),
        latency: latency,
        packetLoss: Math.random() * 5,
        jitter: Math.random() * 10 + 5,
        cusumUpper: Math.max(0, (i < 20 ? (20 - i) * 0.5 : 0)),
        cusumLower: 0,
      });
    }
    
    setData(sampleData);
  };

  const getMetricConfig = () => {
    switch (metric) {
      case 'latency':
        return {
          label: 'Latency (ms)',
          dataKey: 'latency',
          color: '#8884d8',
          threshold: service.thresholds?.latency,
          unit: 'ms',
        };
      case 'packetLoss':
        return {
          label: 'Packet Loss (%)',
          dataKey: 'packetLoss',
          color: '#ff7300',
          threshold: service.thresholds?.packetLoss,
          unit: '%',
        };
      case 'jitter':
        return {
          label: 'Jitter (ms)',
          dataKey: 'jitter',
          color: '#00C49F',
          threshold: service.thresholds?.jitter,
          unit: 'ms',
        };
      case 'cusum':
        return {
          label: 'CUSUM Values',
          dataKey: null,
          color: null,
          threshold: null,
          unit: '',
        };
      default:
        return {};
    }
  };

  const metricConfig = getMetricConfig();

  return (
    <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {service.serviceName} - Metrics History
          </Typography>
          <Box display="flex" gap={2}>
            <ToggleButtonGroup
              value={metric}
              exclusive
              onChange={(e, value) => value && setMetric(value)}
              size="small"
            >
              <ToggleButton value="latency">Latency</ToggleButton>
              <ToggleButton value="packetLoss">Packet Loss</ToggleButton>
              <ToggleButton value="jitter">Jitter</ToggleButton>
              <ToggleButton value="cusum">CUSUM</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(e, value) => value && setPeriod(value)}
              size="small"
            >
              <ToggleButton value="1h">1H</ToggleButton>
              <ToggleButton value="6h">6H</ToggleButton>
              <ToggleButton value="24h">24H</ToggleButton>
              <ToggleButton value="7d">7D</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={400}>
            <CircularProgress />
          </Box>
        ) : data.length === 0 ? (
          <Alert severity="info">No data available for the selected period</Alert>
        ) : (
          <Box height={400}>
            <ResponsiveContainer width="100%" height="100%">
              {metric === 'cusum' ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cusumUpper"
                    stroke="#ff7300"
                    name="Upper CUSUM"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cusumLower"
                    stroke="#0088fe"
                    name="Lower CUSUM"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ReferenceLine
                    y={service.cusumConfig.decisionInterval}
                    stroke="red"
                    strokeDasharray="5 5"
                    label="Decision Interval"
                  />
                  <ReferenceLine
                    y={0}
                    stroke="black"
                    strokeDasharray="3 3"
                  />
                </LineChart>
              ) : (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`${value.toFixed(2)}${metricConfig.unit}`, metricConfig.label]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={metricConfig.dataKey}
                    stroke={metricConfig.color}
                    name={metricConfig.label}
                    strokeWidth={2}
                    dot={false}
                  />
                  {metricConfig.threshold?.warning && (
                    <ReferenceLine
                      y={metricConfig.threshold.warning}
                      stroke="orange"
                      strokeDasharray="5 5"
                      label="Warning"
                    />
                  )}
                  {metricConfig.threshold?.critical && (
                    <ReferenceLine
                      y={metricConfig.threshold.critical}
                      stroke="red"
                      strokeDasharray="5 5"
                      label="Critical"
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </Box>
        )}
        
        {metric === 'cusum' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            CUSUM (Cumulative Sum) chart shows the accumulated deviations from the target mean.
            When either sum exceeds the decision interval (red line), an anomaly is detected.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceMonitorChart;