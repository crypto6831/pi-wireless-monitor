import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Router as RouterIcon,
  NetworkCheck as NetworkIcon,
  Analytics as AnalyticsIcon,
  Warning as AlertIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  LocationOn as FloorPlanIcon,
  TuneOutlined as ChannelIcon,
  Wifi as SSIDIcon,
} from '@mui/icons-material';
import { setSidebarOpen } from '../../store/slices/uiSlice';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Monitors', icon: <RouterIcon />, path: '/monitors' },
  { text: 'Networks', icon: <NetworkIcon />, path: '/networks' },
  { text: 'Metrics', icon: <AnalyticsIcon />, path: '/metrics' },
  { text: 'Alerts', icon: <AlertIcon />, path: '/alerts' },
  { text: 'Floor Plans', icon: <FloorPlanIcon />, path: '/floor-plans' },
  { text: 'Channel Analyzer', icon: <ChannelIcon />, path: '/channel-analyzer' },
  { text: 'SSID Monitor', icon: <SSIDIcon />, path: '/ssid-analyzer' },
];

function Sidebar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  const handleClose = () => {
    dispatch(setSidebarOpen(false));
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper,
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
        },
      }}
      variant="persistent"
      anchor="left"
      open={sidebarOpen}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: theme.spacing(2),
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" noWrap component="div">
          Pi Monitor
        </Typography>
        <IconButton onClick={handleClose}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(33, 150, 243, 0.16)',
                  '&:hover': {
                    backgroundColor: 'rgba(33, 150, 243, 0.24)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      <List sx={{ marginTop: 'auto' }}>
        <ListItem disablePadding>
          <ListItemButton
            selected={location.pathname === '/settings'}
            onClick={() => handleNavigate('/settings')}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
}

export default Sidebar; 