import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  IconButton,
  Chip,
  Grid,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import ServiceMonitorDialog from './ServiceMonitorDialog';
import ServiceMonitorChart from './ServiceMonitorChart';

const ServiceMonitorsList = ({ monitorId }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [serviceMonitors, setServiceMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuService, setMenuService] = useState(null);
  const [chartService, setChartService] = useState(null);

  useEffect(() => {
    fetchServiceMonitors();
  }, [monitorId]);

  const fetchServiceMonitors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/service-monitors/monitor/${monitorId}`);
      setServiceMonitors(response.data);
    } catch (error) {
      console.error('Error fetching service monitors:', error);
      enqueueSnackbar('Failed to fetch service monitors', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, service) => {
    setAnchorEl(event.currentTarget);
    setMenuService(service);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuService(null);
  };

  const handleEdit = () => {
    setSelectedService(menuService);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    const service = menuService;
    handleMenuClose();

    if (window.confirm(`Are you sure you want to delete "${service.serviceName}"?`)) {
      try {
        await axios.delete(`/api/service-monitors/${service._id}`);
        enqueueSnackbar('Service monitor deleted successfully', { variant: 'success' });
        fetchServiceMonitors();
      } catch (error) {
        console.error('Error deleting service monitor:', error);
        enqueueSnackbar('Failed to delete service monitor', { variant: 'error' });
      }
    }
  };

  const handleResetCusum = async (service) => {
    try {
      await axios.post(`/api/service-monitors/${service._id}/reset-cusum`);
      enqueueSnackbar('CUSUM state reset successfully', { variant: 'success' });
      fetchServiceMonitors();
    } catch (error) {
      console.error('Error resetting CUSUM:', error);
      enqueueSnackbar('Failed to reset CUSUM state', { variant: 'error' });
    }
  };

  const handleToggleEnabled = async (service) => {
    try {
      await axios.put(`/api/service-monitors/${service._id}`, {
        enabled: !service.enabled,
      });
      enqueueSnackbar(
        `Service monitor ${!service.enabled ? 'enabled' : 'disabled'} successfully`,
        { variant: 'success' }
      );
      fetchServiceMonitors();
    } catch (error) {
      console.error('Error toggling service monitor:', error);
      enqueueSnackbar('Failed to update service monitor', { variant: 'error' });
    }
  };

  const getStatusIcon = (service) => {
    if (!service.lastCheck?.status) {
      return <HelpIcon color="disabled" />;
    }

    switch (service.lastCheck.status) {
      case 'up':
        return <CheckIcon color="success" />;
      case 'down':
        return <ErrorIcon color="error" />;
      case 'timeout':
        return <WarningIcon color="warning" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const getStatusColor = (service) => {
    if (!service.lastCheck?.status) return 'default';
    
    switch (service.lastCheck.status) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      case 'timeout':
        return 'warning';
      default:
        return 'error';
    }
  };

  const formatLatency = (latency) => {
    if (latency === undefined || latency === null) return '-';
    return `${latency.toFixed(1)}ms`;
  };

  const formatPercentage = (value) => {
    if (value === undefined || value === null) return '-';
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Service Monitors</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedService(null);
            setDialogOpen(true);
          }}
        >
          Add Service
        </Button>
      </Box>

      {serviceMonitors.length === 0 ? (
        <Alert severity="info">
          No service monitors configured. Click "Add Service" to start monitoring external services.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {serviceMonitors.map((service) => (
            <Grid item xs={12} md={6} key={service._id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        {getStatusIcon(service)}
                        <Typography variant="h6">
                          {service.serviceName}
                        </Typography>
                        <Chip
                          label={service.enabled ? 'Enabled' : 'Disabled'}
                          size="small"
                          color={service.enabled ? 'success' : 'default'}
                        />
                        {service.cusumState?.anomalyDetected && (
                          <Chip
                            label="CUSUM Alert"
                            size="small"
                            color="warning"
                            icon={<WarningIcon />}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {service.type.toUpperCase()} • {service.target}
                        {service.port ? `:${service.port}` : ''}
                      </Typography>
                    </Box>
                    <IconButton onClick={(e) => handleMenuOpen(e, service)}>
                      <MoreIcon />
                    </IconButton>
                  </Box>

                  {service.lastCheck && (
                    <Box mt={2}>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            Latency
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {formatLatency(service.lastCheck.latency)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            Packet Loss
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {formatPercentage(service.lastCheck.packetLoss)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            Jitter
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {formatLatency(service.lastCheck.jitter)}
                          </Typography>
                        </Grid>
                      </Grid>

                      <Box mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          Last Check: {new Date(service.lastCheck.timestamp).toLocaleString()}
                        </Typography>
                      </Box>

                      {service.cusumState?.anomalyDetected && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            CUSUM anomaly detected since{' '}
                            {new Date(service.cusumState.anomalyStartTime).toLocaleString()}
                          </Typography>
                          <Typography variant="caption">
                            Upper: {service.cusumState.upperSum.toFixed(2)} | 
                            Lower: {service.cusumState.lowerSum.toFixed(2)}
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  )}

                  {!service.enabled && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      This service monitor is currently disabled
                    </Alert>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<TimelineIcon />}
                    onClick={() => setChartService(service)}
                  >
                    View History
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleToggleEnabled(service)}
                  >
                    {service.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  {service.cusumState?.anomalyDetected && (
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => handleResetCusum(service)}
                    >
                      Reset CUSUM
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <ServiceMonitorDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedService(null);
        }}
        monitorId={monitorId}
        serviceMonitor={selectedService}
        onSave={() => {
          fetchServiceMonitors();
        }}
      />

      {chartService && (
        <ServiceMonitorChart
          service={chartService}
          onClose={() => setChartService(null)}
        />
      )}
    </Box>
  );
};

export default ServiceMonitorsList;