import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Router as RouterIcon,
  LocationOn as LocationIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

function MonitorStatusCard({ monitor }) {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'maintenance':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleClick = () => {
    navigate(`/monitors?id=${monitor.monitorId}`);
  };

  const timeSinceHeartbeat = monitor.lastHeartbeat
    ? format(new Date(monitor.lastHeartbeat), 'PP p')
    : 'Never';

  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        transition: 'all 0.3s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
      onClick={handleClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" alignItems="center" gap={1}>
            <RouterIcon color="primary" />
            <Typography variant="h6" component="div">
              {monitor.name}
            </Typography>
          </Box>
          <IconButton size="small" onClick={(e) => e.stopPropagation()}>
            <MoreIcon />
          </IconButton>
        </Box>

        <Box display="flex" alignItems="center" gap={0.5} mt={1} mb={2}>
          <LocationIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {monitor.location}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Chip
            label={monitor.status}
            color={getStatusColor(monitor.status)}
            size="small"
          />
          <Tooltip title="Last heartbeat">
            <Typography variant="caption" color="text.secondary">
              {timeSinceHeartbeat}
            </Typography>
          </Tooltip>
        </Box>

        {monitor.isOnline && (
          <Box mt={2} display="flex" gap={1}>
            <Typography variant="caption" color="text.secondary">
              ID: {monitor.monitorId}
            </Typography>
            {monitor.uptime && (
              <Typography variant="caption" color="text.secondary">
                • Uptime: {Math.floor(monitor.uptime / 3600)}h
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default MonitorStatusCard; 