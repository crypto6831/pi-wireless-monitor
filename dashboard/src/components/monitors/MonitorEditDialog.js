import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon
} from '@mui/icons-material';

function MonitorEditDialog({ open, onClose, monitor, onSave }) {
  const [formData, setFormData] = useState({
    name: monitor?.name || '',
    location: monitor?.location || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update form data when monitor changes
  React.useEffect(() => {
    if (monitor) {
      setFormData({
        name: monitor.name || '',
        location: monitor.location || ''
      });
    }
    setError('');
  }, [monitor]);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Monitor name is required');
      return;
    }

    if (!formData.location.trim()) {
      setError('Monitor location is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(monitor.monitorId, {
        name: formData.name.trim(),
        location: formData.location.trim()
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update monitor');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      onClose();
    }
  };

  const hasChanges = monitor && (
    formData.name !== monitor.name || 
    formData.location !== monitor.location
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <EditIcon />
            Edit Monitor Configuration
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={loading}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Monitor ID (Read-only) */}
          <TextField
            label="Monitor ID"
            value={monitor?.monitorId || ''}
            fullWidth
            disabled
            margin="normal"
            helperText="Monitor ID cannot be changed"
          />

          {/* Monitor Name */}
          <TextField
            label="Monitor Name"
            value={formData.name}
            onChange={handleChange('name')}
            fullWidth
            margin="normal"
            required
            disabled={loading}
            placeholder="e.g., Living Room Pi"
            inputProps={{ maxLength: 100 }}
          />

          {/* Monitor Location */}
          <TextField
            label="Monitor Location"
            value={formData.location}
            onChange={handleChange('location')}
            fullWidth
            margin="normal"
            required
            disabled={loading}
            placeholder="e.g., Living Room, Office, Kitchen"
            inputProps={{ maxLength: 200 }}
          />

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {/* Info about changes */}
          <Alert severity="info" sx={{ mt: 2 }}>
            Changes will be applied to the dashboard immediately. 
            The Pi monitor will sync these changes automatically.
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !hasChanges}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MonitorEditDialog;