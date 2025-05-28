import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Typography, 
  Box, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  NotificationsActive as AlertIcon
} from '@mui/icons-material';
import { fetchAlerts, acknowledgeAlert, deleteAlert } from '../store/slices/alertsSlice';
import api from '../services/api';

function Alerts() {
  const dispatch = useDispatch();
  const { list: alerts, loading } = useSelector((state) => state.alerts);
  const monitors = useSelector((state) => state.monitors.list);
  
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterMonitor, setFilterMonitor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchAlerts());
  }, [dispatch]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'packet_loss': 'Packet Loss',
      'latency': 'High Latency',
      'temperature': 'Temperature',
      'monitor_offline': 'Monitor Offline',
      'network_change': 'Network Change',
      'device_new': 'New Device',
      'device_offline': 'Device Offline'
    };
    return labels[type] || type;
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/acknowledge`);
      dispatch(acknowledgeAlert(alertId));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleDelete = async (alertId) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      dispatch(deleteAlert(alertId));
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setDetailsOpen(true);
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (filterMonitor !== 'all' && alert.monitorId !== filterMonitor) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && (alert.acknowledged || alert.resolved)) return false;
      if (filterStatus === 'acknowledged' && !alert.acknowledged) return false;
      if (filterStatus === 'resolved' && !alert.resolved) return false;
    }
    return true;
  });

  // Count alerts by severity
  const alertCounts = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
    active: alerts.filter(a => !a.acknowledged && !a.resolved).length
  };

  return (
    <Box className="fade-in">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Alerts
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={() => dispatch(fetchAlerts())} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <AlertIcon color="primary" />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Alerts
                  </Typography>
                  <Typography variant="h5">
                    {alertCounts.total}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <ErrorIcon color="error" />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Critical
                  </Typography>
                  <Typography variant="h5">
                    {alertCounts.critical}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <WarningIcon color="warning" />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Warnings
                  </Typography>
                  <Typography variant="h5">
                    {alertCounts.warning}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckIcon color="success" />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Active
                  </Typography>
                  <Typography variant="h5">
                    {alertCounts.active}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                label="Severity"
              >
                <MenuItem value="all">All Severities</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Monitor</InputLabel>
              <Select
                value={filterMonitor}
                onChange={(e) => setFilterMonitor(e.target.value)}
                label="Monitor"
              >
                <MenuItem value="all">All Monitors</MenuItem>
                {monitors.map((monitor) => (
                  <MenuItem key={monitor.monitorId} value={monitor.monitorId}>
                    {monitor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="acknowledged">Acknowledged</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Alerts Table */}
      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Severity</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Monitor</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAlerts.map((alert) => (
              <TableRow key={alert._id}>
                <TableCell>
                  <Chip
                    icon={getSeverityIcon(alert.severity)}
                    label={alert.severity}
                    color={getSeverityColor(alert.severity)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{getTypeLabel(alert.type)}</TableCell>
                <TableCell>
                  {monitors.find(m => m.monitorId === alert.monitorId)?.name || alert.monitorId}
                </TableCell>
                <TableCell>{alert.message}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(alert.createdAt).toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  {alert.resolved ? (
                    <Chip label="Resolved" color="success" size="small" />
                  ) : alert.acknowledged ? (
                    <Chip label="Acknowledged" color="info" size="small" />
                  ) : (
                    <Chip label="Active" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => handleViewDetails(alert)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  {!alert.acknowledged && !alert.resolved && (
                    <Tooltip title="Acknowledge">
                      <IconButton size="small" onClick={() => handleAcknowledge(alert._id)}>
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDelete(alert._id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!loading && filteredAlerts.length === 0 && (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">
              No alerts found
            </Typography>
          </Box>
        )}
      </TableContainer>

      {/* Alert Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Alert Details</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Type</Typography>
                  <Typography>{getTypeLabel(selectedAlert.type)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Severity</Typography>
                  <Chip
                    icon={getSeverityIcon(selectedAlert.severity)}
                    label={selectedAlert.severity}
                    color={getSeverityColor(selectedAlert.severity)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Message</Typography>
                  <Typography>{selectedAlert.message}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Details</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={JSON.stringify(selectedAlert.details, null, 2)}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Created</Typography>
                  <Typography>{new Date(selectedAlert.createdAt).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Monitor</Typography>
                  <Typography>
                    {monitors.find(m => m.monitorId === selectedAlert.monitorId)?.name || selectedAlert.monitorId}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          {selectedAlert && !selectedAlert.acknowledged && !selectedAlert.resolved && (
            <Button 
              onClick={() => {
                handleAcknowledge(selectedAlert._id);
                setDetailsOpen(false);
              }} 
              color="primary"
            >
              Acknowledge
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Alerts; 