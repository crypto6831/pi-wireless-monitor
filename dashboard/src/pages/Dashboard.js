import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Grid, Paper, Typography, Box, CircularProgress } from '@mui/material';
import MonitorStatusCard from '../components/dashboard/MonitorStatusCard';
import NetworkOverview from '../components/dashboard/NetworkOverview';
import AlertSummary from '../components/dashboard/AlertSummary';
import MetricsChart from '../components/dashboard/MetricsChart';
import RecentActivity from '../components/dashboard/RecentActivity';
import SystemHealth from '../components/dashboard/SystemHealth';
import { fetchHealthOverview } from '../store/slices/metricsSlice';
import { fetchNetworkStats } from '../store/slices/networksSlice';
import { fetchMonitors } from '../store/slices/monitorsSlice';

function Dashboard() {
  const dispatch = useDispatch();
  const monitors = useSelector((state) => state.monitors.list);
  const loading = useSelector((state) => state.monitors.loading);
  const autoRefresh = useSelector((state) => state.ui.autoRefresh);
  const refreshInterval = useSelector((state) => state.ui.refreshInterval);

  useEffect(() => {
    // Load initial data
    dispatch(fetchMonitors());
    dispatch(fetchHealthOverview());
    dispatch(fetchNetworkStats());
  }, [dispatch]);

  useEffect(() => {
    // Set up auto-refresh
    if (autoRefresh) {
      const interval = setInterval(() => {
        dispatch(fetchMonitors());
        dispatch(fetchHealthOverview());
        dispatch(fetchNetworkStats());
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, dispatch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      
      <Grid container spacing={3}>
        {/* Monitor Status Cards */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {monitors.map((monitor) => (
              <Grid item xs={12} sm={6} md={3} key={monitor.monitorId}>
                <MonitorStatusCard monitor={monitor} />
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* System Metrics Charts - Moved up for better visibility */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <MetricsChart />
          </Paper>
        </Grid>

        {/* System Health - Compact vital signs */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <SystemHealth />
          </Paper>
        </Grid>

        {/* Network Overview - Reduced width */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <NetworkOverview />
          </Paper>
        </Grid>

        {/* Recent Activity - Expanded width */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <RecentActivity />
          </Paper>
        </Grid>

        {/* Alert Summary - Full width for visibility when needed */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <AlertSummary />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard; 