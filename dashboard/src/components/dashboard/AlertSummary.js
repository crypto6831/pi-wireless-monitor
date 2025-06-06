import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Badge,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  LowPriority as LowIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

function AlertSummary() {
  const navigate = useNavigate();
  const activeAlerts = useSelector((state) => state.alerts.active);
  const monitors = useSelector((state) => state.monitors.list);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <ErrorIcon color="warning" />;
      case 'medium':
        return <WarningIcon color="warning" />;
      case 'low':
        return <LowIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const totalAlerts = Object.values(activeAlerts).flat().length;

  const recentAlerts = Object.entries(activeAlerts)
    .flatMap(([severity, alerts]) => 
      alerts.map(alert => ({ ...alert, severity }))
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Active Alerts</Typography>
        <Box display="flex" gap={1}>
          {Object.entries(activeAlerts).map(([severity, alerts]) => (
            alerts.length > 0 && (
              <Badge key={severity} badgeContent={alerts.length} color={getSeverityColor(severity)}>
                <Chip
                  label={severity}
                  size="small"
                  color={getSeverityColor(severity)}
                  variant="outlined"
                />
              </Badge>
            )
          ))}
        </Box>
      </Box>

      {totalAlerts === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No active alerts
          </Typography>
        </Box>
      ) : (
        <>
          <List>
            {recentAlerts.map((alert) => {
              const monitor = monitors.find(m => m.monitorId === alert.monitorId);
              
              return (
                <ListItem key={alert._id} divider>
                  <ListItemIcon>
                    {getSeverityIcon(alert.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">{alert.message}</Typography>
                        <Chip
                          label={alert.type.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box display="flex" justifyContent="space-between" mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {monitor?.name || alert.monitorId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(alert.createdAt), 'p')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>

          <Box mt={2} display="flex" justifyContent="center">
            <Button
              variant="outlined"
              size="small"
              endIcon={<ArrowIcon />}
              onClick={() => navigate('/alerts')}
            >
              View All Alerts ({totalAlerts})
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}

export default AlertSummary; 