import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box } from '@mui/material';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './pages/Dashboard';
import Monitors from './pages/Monitors';
import Networks from './pages/Networks';
import Metrics from './pages/Metrics';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import FloorPlans from './pages/FloorPlans';
import ChannelAnalyzer from './pages/ChannelAnalyzer';
import SSIDAnalyzer from './pages/SSIDAnalyzer';
import NotificationPanel from './components/common/NotificationPanel';
import socketService from './services/socket';
import alertService from './services/alertService';
import { fetchMonitors } from './store/slices/monitorsSlice';
import { fetchActiveAlerts } from './store/slices/alertsSlice';
import './App.css';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Connect to socket
    socketService.connect();
    
    // Connect to alert service for real-time notifications
    alertService.connect();

    // Load initial data
    dispatch(fetchMonitors());
    dispatch(fetchActiveAlerts());

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
      alertService.disconnect();
    };
  }, [dispatch]);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/monitors" element={<Monitors />} />
            <Route path="/networks" element={<Networks />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/floor-plans" element={<FloorPlans />} />
            <Route path="/channel-analyzer" element={<ChannelAnalyzer />} />
            <Route path="/ssid-analyzer" element={<SSIDAnalyzer />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Box>
      <NotificationPanel />
    </Box>
  );
}

export default App; 