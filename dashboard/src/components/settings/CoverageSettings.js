import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  RestoreOutlined as ResetIcon,
  Tune as TuneIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import api from '../../services/api';

function CoverageSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState(null);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('API object:', api);
      console.log('getCoverageSettings function:', api.getCoverageSettings);
      console.log('Available API functions:', Object.keys(api));
      
      if (typeof api.getCoverageSettings !== 'function') {
        throw new Error('getCoverageSettings is not a function. Available functions: ' + Object.keys(api).join(', '));
      }
      
      const response = await api.getCoverageSettings();
      setSettings(response.data.settings);
      setTempSettings(response.data.settings);
      setError(null);
    } catch (err) {
      setError('Failed to load coverage settings');
      console.error('Load settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.updateCoverageSettings(tempSettings);
      setSettings(tempSettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setError(null);
    } catch (err) {
      setError('Failed to save coverage settings');
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    try {
      setSaving(true);
      const response = await api.resetCoverageSettings();
      setSettings(response.data.settings);
      setTempSettings(response.data.settings);
      setResetDialogOpen(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setError(null);
    } catch (err) {
      setError('Failed to reset coverage settings');
      console.error('Reset settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateTempSetting = (path, value) => {
    const pathArray = path.split('.');
    const newSettings = { ...tempSettings };
    let current = newSettings;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      current[pathArray[i]] = { ...current[pathArray[i]] };
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    setTempSettings(newSettings);
  };

  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(tempSettings);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!tempSettings) {
    return (
      <Alert severity="error">
        Failed to load coverage settings. Please refresh the page.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" display="flex" alignItems="center" gap={1}>
          <TuneIcon />
          Coverage Settings
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSettings}
            disabled={saving}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={() => setResetDialogOpen(true)}
            disabled={saving}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={!hasChanges() || saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Coverage settings saved successfully!
        </Alert>
      )}

      {hasChanges() && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have unsaved changes. Click "Save Changes" to apply them.
        </Alert>
      )}

      {/* Signal Strength Thresholds */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          Signal Strength Thresholds
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Configure dBm thresholds for signal quality classification
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              Excellent Signal: {tempSettings.signalThresholds.excellent} dBm
            </Typography>
            <Slider
              value={tempSettings.signalThresholds.excellent}
              onChange={(e, value) => updateTempSetting('signalThresholds.excellent', value)}
              min={-100}
              max={-30}
              step={1}
              marks={[
                { value: -100, label: '-100' },
                { value: -50, label: '-50' },
                { value: -30, label: '-30' }
              ]}
              sx={{ color: '#4caf50' }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              Good Signal: {tempSettings.signalThresholds.good} dBm
            </Typography>
            <Slider
              value={tempSettings.signalThresholds.good}
              onChange={(e, value) => updateTempSetting('signalThresholds.good', value)}
              min={-100}
              max={-30}
              step={1}
              marks={[
                { value: -100, label: '-100' },
                { value: -60, label: '-60' },
                { value: -30, label: '-30' }
              ]}
              sx={{ color: '#8bc34a' }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              Fair Signal: {tempSettings.signalThresholds.fair} dBm
            </Typography>
            <Slider
              value={tempSettings.signalThresholds.fair}
              onChange={(e, value) => updateTempSetting('signalThresholds.fair', value)}
              min={-100}
              max={-30}
              step={1}
              marks={[
                { value: -100, label: '-100' },
                { value: -70, label: '-70' },
                { value: -30, label: '-30' }
              ]}
              sx={{ color: '#ff9800' }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              Poor Signal: {tempSettings.signalThresholds.poor} dBm
            </Typography>
            <Slider
              value={tempSettings.signalThresholds.poor}
              onChange={(e, value) => updateTempSetting('signalThresholds.poor', value)}
              min={-100}
              max={-30}
              step={1}
              marks={[
                { value: -100, label: '-100' },
                { value: -80, label: '-80' },
                { value: -30, label: '-30' }
              ]}
              sx={{ color: '#f44336' }}
            />
          </Grid>
        </Grid>

        <Box mt={2} display="flex" gap={1} flexWrap="wrap">
          <Chip label={`Excellent: ≥ ${tempSettings.signalThresholds.excellent} dBm`} color="success" size="small" />
          <Chip label={`Good: ${tempSettings.signalThresholds.good} to ${tempSettings.signalThresholds.excellent - 1} dBm`} color="primary" size="small" />
          <Chip label={`Fair: ${tempSettings.signalThresholds.fair} to ${tempSettings.signalThresholds.good - 1} dBm`} color="warning" size="small" />
          <Chip label={`Poor: < ${tempSettings.signalThresholds.fair} dBm`} color="error" size="small" />
        </Box>
      </Paper>

      {/* Heatmap Visualization Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Heatmap Visualization
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Configure how coverage heatmaps are displayed on floor plans
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Intensity: {Math.round(tempSettings.heatmapSettings.intensity * 100)}%
            </Typography>
            <Slider
              value={tempSettings.heatmapSettings.intensity}
              onChange={(e, value) => updateTempSetting('heatmapSettings.intensity', value)}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: '0%' },
                { value: 0.5, label: '50%' },
                { value: 1, label: '100%' }
              ]}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Radius: {tempSettings.heatmapSettings.radius}px
            </Typography>
            <Slider
              value={tempSettings.heatmapSettings.radius}
              onChange={(e, value) => updateTempSetting('heatmapSettings.radius', value)}
              min={5}
              max={100}
              step={5}
              marks={[
                { value: 5, label: '5' },
                { value: 25, label: '25' },
                { value: 100, label: '100' }
              ]}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Blur: {tempSettings.heatmapSettings.blur}px
            </Typography>
            <Slider
              value={tempSettings.heatmapSettings.blur}
              onChange={(e, value) => updateTempSetting('heatmapSettings.blur', value)}
              min={0}
              max={50}
              step={1}
              marks={[
                { value: 0, label: '0' },
                { value: 15, label: '15' },
                { value: 50, label: '50' }
              ]}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Default Coverage Style */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Default Coverage Area Style
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Default styling for new coverage areas
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Fill Color"
              value={tempSettings.defaultCoverageStyle.fillColor}
              onChange={(e) => updateTempSetting('defaultCoverageStyle.fillColor', e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: (
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      backgroundColor: tempSettings.defaultCoverageStyle.fillColor,
                      border: '1px solid #ccc',
                      borderRadius: '2px'
                    }}
                  />
                )
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Typography gutterBottom>
              Fill Opacity: {Math.round(tempSettings.defaultCoverageStyle.fillOpacity * 100)}%
            </Typography>
            <Slider
              value={tempSettings.defaultCoverageStyle.fillOpacity}
              onChange={(e, value) => updateTempSetting('defaultCoverageStyle.fillOpacity', value)}
              min={0}
              max={1}
              step={0.1}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Stroke Color"
              value={tempSettings.defaultCoverageStyle.strokeColor}
              onChange={(e) => updateTempSetting('defaultCoverageStyle.strokeColor', e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: (
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      backgroundColor: tempSettings.defaultCoverageStyle.strokeColor,
                      border: '1px solid #ccc',
                      borderRadius: '2px'
                    }}
                  />
                )
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Typography gutterBottom>
              Stroke Width: {tempSettings.defaultCoverageStyle.strokeWidth}px
            </Typography>
            <Slider
              value={tempSettings.defaultCoverageStyle.strokeWidth}
              onChange={(e, value) => updateTempSetting('defaultCoverageStyle.strokeWidth', value)}
              min={1}
              max={10}
              step={1}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Calculation Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Coverage Calculation
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Algorithm settings for coverage area calculations
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Interpolation Method</InputLabel>
              <Select
                value={tempSettings.calculationSettings.interpolationMethod}
                onChange={(e) => updateTempSetting('calculationSettings.interpolationMethod', e.target.value)}
                label="Interpolation Method"
              >
                <MenuItem value="linear">Linear</MenuItem>
                <MenuItem value="inverse-distance">Inverse Distance</MenuItem>
                <MenuItem value="kriging">Kriging</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Sampling Resolution: {tempSettings.calculationSettings.samplingResolution}m
            </Typography>
            <Slider
              value={tempSettings.calculationSettings.samplingResolution}
              onChange={(e, value) => updateTempSetting('calculationSettings.samplingResolution', value)}
              min={0.5}
              max={5}
              step={0.1}
              marks={[
                { value: 0.5, label: '0.5m' },
                { value: 1, label: '1m' },
                { value: 5, label: '5m' }
              ]}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Max Interpolation Distance: {tempSettings.calculationSettings.maxInterpolationDistance}m
            </Typography>
            <Slider
              value={tempSettings.calculationSettings.maxInterpolationDistance}
              onChange={(e, value) => updateTempSetting('calculationSettings.maxInterpolationDistance', value)}
              min={10}
              max={200}
              step={10}
              marks={[
                { value: 10, label: '10m' },
                { value: 50, label: '50m' },
                { value: 200, label: '200m' }
              ]}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Auto-Update Settings */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Auto-Update Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Automatic coverage area updates and recalculation
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={tempSettings.autoUpdateSettings.enableAutoUpdate}
                  onChange={(e) => updateTempSetting('autoUpdateSettings.enableAutoUpdate', e.target.checked)}
                />
              }
              label="Enable Automatic Updates"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={tempSettings.autoUpdateSettings.recalculateOnMonitorChange}
                  onChange={(e) => updateTempSetting('autoUpdateSettings.recalculateOnMonitorChange', e.target.checked)}
                />
              }
              label="Recalculate on Monitor Changes"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              Update Interval: {tempSettings.autoUpdateSettings.updateInterval}s
            </Typography>
            <Slider
              value={tempSettings.autoUpdateSettings.updateInterval}
              onChange={(e, value) => updateTempSetting('autoUpdateSettings.updateInterval', value)}
              min={60}
              max={3600}
              step={60}
              marks={[
                { value: 60, label: '1m' },
                { value: 300, label: '5m' },
                { value: 3600, label: '1h' }
              ]}
              disabled={!tempSettings.autoUpdateSettings.enableAutoUpdate}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset Coverage Settings</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reset all coverage settings to their default values? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={resetSettings}
            color="warning"
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Reset'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CoverageSettings;