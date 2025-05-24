import React from 'react';
import { useSelector } from 'react-redux';
import {
  Typography,
  Box,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Thermostat as ThermostatIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

function SystemHealth() {
  const health = useSelector((state) => state.metrics.health);
  const monitors = useSelector((state) => state.monitors.list);

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'critical':
        return <ErrorIcon color="error" />;
      default:
        return <CheckIcon color="disabled" />;
    }
  };

  const getHealthColor = (value, type) => {
    switch (type) {
      case 'cpu':
      case 'memory':
        if (value > 80) return 'error';
        if (value > 60) return 'warning';
        return 'success';
      case 'temperature':
        if (value > 75) return 'error';
        if (value > 65) return 'warning';
        return 'success';
      default:
        return 'primary';
    }
  };

  // Calculate overall health
  const overallHealth = health.length > 0
    ? health.every(h => h.status === 'healthy') ? 'healthy'
      : health.some(h => h.status === 'critical') ? 'critical'
      : 'warning'
    : 'unknown';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">System Health</Typography>
        <Chip
          label={overallHealth}
          color={overallHealth === 'healthy' ? 'success' : overallHealth === 'critical' ? 'error' : 'warning'}
          size="small"
        />
      </Box>

      <List>
        {health.map((monitorHealth) => {
          const monitor = monitors.find(m => m.monitorId === monitorHealth.monitorId);
          
          return (
            <ListItem key={monitorHealth.monitorId} divider>
              <ListItemIcon>
                {getHealthIcon(monitorHealth.status)}
              </ListItemIcon>
              <ListItemText
                primary={monitor?.name || monitorHealth.monitorId}
                secondary={
                  <Box mt={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <SpeedIcon fontSize="small" />
                      <Typography variant="caption">CPU</Typography>
                      <Box flexGrow={1}>
                        <LinearProgress
                          variant="determinate"
                          value={monitorHealth.cpu || 0}
                          color={getHealthColor(monitorHealth.cpu, 'cpu')}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                      <Typography variant="caption">{monitorHealth.cpu?.toFixed(0)}%</Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <MemoryIcon fontSize="small" />
                      <Typography variant="caption">RAM</Typography>
                      <Box flexGrow={1}>
                        <LinearProgress
                          variant="determinate"
                          value={monitorHealth.memory || 0}
                          color={getHealthColor(monitorHealth.memory, 'memory')}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                      <Typography variant="caption">{monitorHealth.memory?.toFixed(0)}%</Typography>
                    </Box>

                    {monitorHealth.temperature > 0 && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <ThermostatIcon fontSize="small" />
                        <Typography variant="caption">Temp</Typography>
                        <Box flexGrow={1}>
                          <LinearProgress
                            variant="determinate"
                            value={(monitorHealth.temperature / 100) * 100}
                            color={getHealthColor(monitorHealth.temperature, 'temperature')}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                        <Typography variant="caption">{monitorHealth.temperature?.toFixed(0)}°C</Typography>
                      </Box>
                    )}

                    {monitorHealth.issues.length > 0 && (
                      <Box mt={1}>
                        {monitorHealth.issues.map((issue, index) => (
                          <Chip
                            key={index}
                            label={issue}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>

      {health.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No health data available
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default SystemHealth; 