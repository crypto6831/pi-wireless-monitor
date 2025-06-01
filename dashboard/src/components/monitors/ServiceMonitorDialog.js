import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  InputAdornment,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useSnackbar } from 'notistack';
import axios from 'axios';

// Predefined CUSUM profiles for different service types
const CUSUM_PROFILES = {
  'local-network': {
    name: 'Local Network',
    description: 'For routers, switches, local servers',
    targetMean: 5,
    allowableDeviation: 3,
    decisionInterval: 5,
    thresholds: {
      latency: { warning: 10, critical: 20 },
      packetLoss: { warning: 1, critical: 5 },
      jitter: { warning: 5, critical: 10 },
    },
  },
  'lan-service': {
    name: 'LAN Service',
    description: 'For local network services',
    targetMean: 10,
    allowableDeviation: 5,
    decisionInterval: 5,
    thresholds: {
      latency: { warning: 20, critical: 50 },
      packetLoss: { warning: 2, critical: 5 },
      jitter: { warning: 10, critical: 20 },
    },
  },
  'regional-internet': {
    name: 'Regional Internet',
    description: 'For services in same country/region',
    targetMean: 30,
    allowableDeviation: 15,
    decisionInterval: 8,
    thresholds: {
      latency: { warning: 50, critical: 100 },
      packetLoss: { warning: 3, critical: 8 },
      jitter: { warning: 15, critical: 30 },
    },
  },
  'international': {
    name: 'International',
    description: 'For global websites and services',
    targetMean: 150,
    allowableDeviation: 50,
    decisionInterval: 10,
    thresholds: {
      latency: { warning: 200, critical: 300 },
      packetLoss: { warning: 5, critical: 10 },
      jitter: { warning: 30, critical: 60 },
    },
  },
  'satellite': {
    name: 'Satellite/High Latency',
    description: 'For satellite or very distant connections',
    targetMean: 600,
    allowableDeviation: 100,
    decisionInterval: 15,
    thresholds: {
      latency: { warning: 800, critical: 1000 },
      packetLoss: { warning: 8, critical: 15 },
      jitter: { warning: 50, critical: 100 },
    },
  },
  'custom': {
    name: 'Custom',
    description: 'Manually configure all parameters',
  },
};

const ServiceMonitorDialog = ({ open, onClose, monitorId, serviceMonitor, onSave }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedProfile, setSelectedProfile] = useState('custom');
  
  const [formData, setFormData] = useState({
    serviceName: '',
    target: '',
    type: 'ping',
    port: '',
    enabled: true,
    interval: 60,
    timeout: 5,
    packetCount: 4,
    cusumConfig: {
      targetMean: 50,
      allowableDeviation: 10,
      decisionInterval: 5,
      resetThreshold: 0,
    },
    thresholds: {
      latency: {
        warning: 100,
        critical: 200,
      },
      packetLoss: {
        warning: 5,
        critical: 10,
      },
      jitter: {
        warning: 20,
        critical: 50,
      },
    },
  });

  useEffect(() => {
    if (serviceMonitor) {
      setFormData({
        serviceName: serviceMonitor.serviceName || '',
        target: serviceMonitor.target || '',
        type: serviceMonitor.type || 'ping',
        port: serviceMonitor.port || '',
        enabled: serviceMonitor.enabled !== false,
        interval: serviceMonitor.interval || 60,
        timeout: serviceMonitor.timeout || 5,
        packetCount: serviceMonitor.packetCount || 4,
        cusumConfig: {
          targetMean: serviceMonitor.cusumConfig?.targetMean || 50,
          allowableDeviation: serviceMonitor.cusumConfig?.allowableDeviation || 10,
          decisionInterval: serviceMonitor.cusumConfig?.decisionInterval || 5,
          resetThreshold: serviceMonitor.cusumConfig?.resetThreshold || 0,
        },
        thresholds: {
          latency: {
            warning: serviceMonitor.thresholds?.latency?.warning || 100,
            critical: serviceMonitor.thresholds?.latency?.critical || 200,
          },
          packetLoss: {
            warning: serviceMonitor.thresholds?.packetLoss?.warning || 5,
            critical: serviceMonitor.thresholds?.packetLoss?.critical || 10,
          },
          jitter: {
            warning: serviceMonitor.thresholds?.jitter?.warning || 20,
            critical: serviceMonitor.thresholds?.jitter?.critical || 50,
          },
        },
      });
    }
  }, [serviceMonitor]);

  const suggestProfile = (target) => {
    // Check if it's a local IP
    if (/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(target)) {
      return 'local-network';
    }
    // Check if it's localhost
    if (target === 'localhost' || target === '127.0.0.1') {
      return 'local-network';
    }
    // Check for common DNS servers (usually regional)
    if (['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1'].includes(target)) {
      return 'regional-internet';
    }
    // For domain names, suggest international as default
    if (target.includes('.com') || target.includes('.org') || target.includes('.net')) {
      return 'international';
    }
    // Default to regional for other domains
    if (target.includes('.')) {
      return 'regional-internet';
    }
    return null;
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child, subChild] = field.split('.');
      if (subChild) {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent][child],
              [subChild]: value,
            },
          },
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
      
      // Auto-suggest profile when target changes
      if (field === 'target' && value && selectedProfile === 'custom') {
        const suggestedProfile = suggestProfile(value);
        if (suggestedProfile) {
          handleProfileChange(suggestedProfile);
        }
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.serviceName.trim()) {
      newErrors.serviceName = 'Service name is required';
    }

    if (!formData.target.trim()) {
      newErrors.target = 'Target is required';
    } else {
      // Validate IP or domain
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      // Updated domain regex to properly handle subdomains like www.google.com
      const domainRegex = /^([a-zA-Z0-9][a-zA-Z0-9-]*\.)*[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
      // Also allow simple hostnames without dots (for local network)
      const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/;
      
      if (!ipRegex.test(formData.target) && !domainRegex.test(formData.target) && !hostnameRegex.test(formData.target)) {
        newErrors.target = 'Invalid IP address or domain name';
      }
    }

    if (['tcp', 'udp', 'http', 'https'].includes(formData.type) && !formData.port) {
      newErrors.port = 'Port is required for this service type';
    }

    if (formData.interval < 10 || formData.interval > 3600) {
      newErrors.interval = 'Interval must be between 10 and 3600 seconds';
    }

    if (formData.timeout < 1 || formData.timeout > 30) {
      newErrors.timeout = 'Timeout must be between 1 and 30 seconds';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        monitorId,
        port: formData.port || undefined,
      };

      if (serviceMonitor) {
        // Update existing
        await axios.put(`/api/service-monitors/${serviceMonitor._id}`, payload);
        enqueueSnackbar('Service monitor updated successfully', { variant: 'success' });
      } else {
        // Create new
        await axios.post('/api/service-monitors', payload);
        enqueueSnackbar('Service monitor created successfully', { variant: 'success' });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving service monitor:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to save service monitor',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (profile) => {
    setSelectedProfile(profile);
    
    if (profile !== 'custom' && CUSUM_PROFILES[profile]) {
      const profileData = CUSUM_PROFILES[profile];
      setFormData(prev => ({
        ...prev,
        cusumConfig: {
          targetMean: profileData.targetMean,
          allowableDeviation: profileData.allowableDeviation,
          decisionInterval: profileData.decisionInterval,
          resetThreshold: 0,
        },
        thresholds: profileData.thresholds,
      }));
      
      enqueueSnackbar(`Applied ${profileData.name} profile settings`, { variant: 'info' });
    }
  };

  const showPortField = ['tcp', 'udp', 'http', 'https'].includes(formData.type);
  const showPacketCountField = formData.type === 'ping';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {serviceMonitor ? 'Edit Service Monitor' : 'Add Service Monitor'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Service Name"
                value={formData.serviceName}
                onChange={(e) => handleChange('serviceName', e.target.value)}
                error={!!errors.serviceName}
                helperText={errors.serviceName}
                placeholder="e.g., Google DNS"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Target (IP or Domain)"
                value={formData.target}
                onChange={(e) => handleChange('target', e.target.value)}
                error={!!errors.target}
                helperText={errors.target}
                placeholder="e.g., 8.8.8.8 or www.google.com"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Service Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="Service Type"
                >
                  <MenuItem value="ping">Ping (ICMP)</MenuItem>
                  <MenuItem value="http">HTTP</MenuItem>
                  <MenuItem value="https">HTTPS</MenuItem>
                  <MenuItem value="tcp">TCP Port</MenuItem>
                  <MenuItem value="udp">UDP Port</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {showPortField && (
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Port"
                  value={formData.port}
                  onChange={(e) => handleChange('port', e.target.value)}
                  error={!!errors.port}
                  helperText={errors.port}
                  placeholder={formData.type === 'https' ? '443' : '80'}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enabled}
                    onChange={(e) => handleChange('enabled', e.target.checked)}
                  />
                }
                label="Enabled"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Check Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Check Interval"
                  value={formData.interval}
                  onChange={(e) => handleChange('interval', parseInt(e.target.value) || 60)}
                  error={!!errors.interval}
                  helperText={errors.interval}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">seconds</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Timeout"
                  value={formData.timeout}
                  onChange={(e) => handleChange('timeout', parseInt(e.target.value) || 5)}
                  error={!!errors.timeout}
                  helperText={errors.timeout}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">seconds</InputAdornment>,
                  }}
                />
              </Grid>
              {showPacketCountField && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Packet Count"
                    value={formData.packetCount}
                    onChange={(e) => handleChange('packetCount', parseInt(e.target.value) || 4)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">packets</InputAdornment>,
                    }}
                  />
                </Grid>
              )}
            </Grid>
          </Box>

          <Accordion sx={{ mt: 3 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Alert Thresholds</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Latency (ms)
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Warning"
                    value={formData.thresholds.latency.warning}
                    onChange={(e) => handleChange('thresholds.latency.warning', parseInt(e.target.value) || 100)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Critical"
                    value={formData.thresholds.latency.critical}
                    onChange={(e) => handleChange('thresholds.latency.critical', parseInt(e.target.value) || 200)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Packet Loss (%)
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Warning"
                    value={formData.thresholds.packetLoss.warning}
                    onChange={(e) => handleChange('thresholds.packetLoss.warning', parseInt(e.target.value) || 5)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Critical"
                    value={formData.thresholds.packetLoss.critical}
                    onChange={(e) => handleChange('thresholds.packetLoss.critical', parseInt(e.target.value) || 10)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Jitter (ms)
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Warning"
                    value={formData.thresholds.jitter.warning}
                    onChange={(e) => handleChange('thresholds.jitter.warning', parseInt(e.target.value) || 20)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Critical"
                    value={formData.thresholds.jitter.critical}
                    onChange={(e) => handleChange('thresholds.jitter.critical', parseInt(e.target.value) || 50)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>CUSUM Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Quick Profile Selection
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  {Object.entries(CUSUM_PROFILES).map(([key, profile]) => (
                    <Grid item key={key}>
                      <Chip
                        label={profile.name}
                        onClick={() => handleProfileChange(key)}
                        color={selectedProfile === key ? 'primary' : 'default'}
                        variant={selectedProfile === key ? 'filled' : 'outlined'}
                        icon={key !== 'custom' ? <AutoFixHighIcon /> : null}
                      />
                    </Grid>
                  ))}
                </Grid>
                {selectedProfile !== 'custom' && CUSUM_PROFILES[selectedProfile] && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>{CUSUM_PROFILES[selectedProfile].name}:</strong> {CUSUM_PROFILES[selectedProfile].description}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Target: {CUSUM_PROFILES[selectedProfile].targetMean}ms, 
                      Deviation: ±{CUSUM_PROFILES[selectedProfile].allowableDeviation}ms, 
                      Decision Interval: {CUSUM_PROFILES[selectedProfile].decisionInterval}
                    </Typography>
                  </Alert>
                )}
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                CUSUM (Cumulative Sum) control chart is used to detect small shifts in the process mean over time.
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Target Mean Latency"
                    value={formData.cusumConfig.targetMean}
                    onChange={(e) => handleChange('cusumConfig.targetMean', parseInt(e.target.value) || 50)}
                    helperText="Expected average latency in normal conditions"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Allowable Deviation"
                    value={formData.cusumConfig.allowableDeviation}
                    onChange={(e) => handleChange('cusumConfig.allowableDeviation', parseInt(e.target.value) || 10)}
                    helperText="Acceptable variation from target mean"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Decision Interval (h)"
                    value={formData.cusumConfig.decisionInterval}
                    onChange={(e) => handleChange('cusumConfig.decisionInterval', parseInt(e.target.value) || 5)}
                    helperText="Threshold for anomaly detection"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Reset Threshold"
                    value={formData.cusumConfig.resetThreshold}
                    onChange={(e) => handleChange('cusumConfig.resetThreshold', parseInt(e.target.value) || 0)}
                    helperText="CUSUM value to trigger reset"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {serviceMonitor ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceMonitorDialog;