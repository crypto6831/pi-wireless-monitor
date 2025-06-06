import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  WifiTethering as WifiIcon,
  CloudOff as CloudOffIcon,
} from '@mui/icons-material';
import { setSidebarOpen, toggleAutoRefresh } from '../../store/slices/uiSlice';
import { fetchMonitors } from '../../store/slices/monitorsSlice';
import { fetchActiveAlerts } from '../../store/slices/alertsSlice';

function TopBar() {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const socketConnected = useSelector((state) => state.ui.socketConnected);
  const autoRefresh = useSelector((state) => state.ui.autoRefresh);
  const monitors = useSelector((state) => state.monitors.list);
  const activeAlerts = useSelector((state) => state.alerts.active);
  
  const activeMonitors = monitors.filter(m => m.status === 'active').length;
  const totalAlerts = Object.values(activeAlerts).flat().length;
  const criticalAlerts = activeAlerts.critical?.length || 0;

  const handleMenuClick = () => {
    dispatch(setSidebarOpen(!sidebarOpen));
  };

  const handleRefresh = () => {
    dispatch(fetchMonitors());
    dispatch(fetchActiveAlerts());
  };

  const handleAutoRefreshToggle = () => {
    dispatch(toggleAutoRefresh());
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={handleMenuClick}
          edge="start"
          sx={{ mr: 2, ...(sidebarOpen && { display: 'none' }) }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 0, mr: 4 }}>
          WiFi Monitoring Dashboard
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
          <Chip
            icon={socketConnected ? <WifiIcon /> : <CloudOffIcon />}
            label={socketConnected ? 'Connected' : 'Disconnected'}
            color={socketConnected ? 'success' : 'error'}
            size="small"
            variant="outlined"
          />
          
          <Chip
            label={`${activeMonitors}/${monitors.length} Monitors`}
            color={activeMonitors === monitors.length ? 'success' : 'warning'}
            size="small"
          />
          
          {criticalAlerts > 0 && (
            <Chip
              label={`${criticalAlerts} Critical`}
              color="error"
              size="small"
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}>
            <IconButton
              color={autoRefresh ? 'primary' : 'inherit'}
              onClick={handleAutoRefreshToggle}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh data">
            <IconButton color="inherit" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={`${totalAlerts} active alerts`}>
            <IconButton color="inherit">
              <Badge badgeContent={totalAlerts} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default TopBar; 