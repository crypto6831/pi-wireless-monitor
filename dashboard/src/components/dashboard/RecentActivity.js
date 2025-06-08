import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Monitor as MonitorIcon,
  Wifi as WifiIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { fetchRecentActivities } from '../../store/slices/activitiesSlice';

function RecentActivity() {
  const dispatch = useDispatch();
  const { recent: activities, loading, error } = useSelector((state) => state.activities);

  useEffect(() => {
    dispatch(fetchRecentActivities(10)); // Get latest 10 activities
  }, [dispatch]);

  const getActivityIcon = (type, severity) => {
    const iconProps = { fontSize: 'small' };
    
    switch (type) {
      case 'monitor_connected':
      case 'monitor_disconnected':
        return <MonitorIcon {...iconProps} />;
      case 'network_discovered':
      case 'network_lost':
        return <WifiIcon {...iconProps} />;
      case 'alert_triggered':
      case 'alert_resolved':
        return severity === 'error' ? <ErrorIcon {...iconProps} /> : <WarningIcon {...iconProps} />;
      case 'system_startup':
      case 'system_shutdown':
        return <InfoIcon {...iconProps} />;
      default:
        return <CheckCircleIcon {...iconProps} />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'success';
      case 'info':
      default: return 'primary';
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={24} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Recent Activity
      </Typography>
      
      {activities.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No recent activity
          </Typography>
        </Box>
      ) : (
        <List dense>
          {activities.map((activity, index) => (
            <ListItem key={activity._id || index} sx={{ px: 0, py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getActivityIcon(activity.type, activity.severity)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" component="span">
                      {activity.title}
                    </Typography>
                    <Chip
                      label={activity.severity}
                      size="small"
                      color={getSeverityColor(activity.severity)}
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.65rem' }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {activity.timeAgo}
                  </Typography>
                }
                sx={{ my: 0 }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default RecentActivity; 