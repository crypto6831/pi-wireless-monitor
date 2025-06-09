import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  RadioButtonUnchecked as CircleIcon,
  CropFree as RectangleIcon,
  Timeline as PolygonIcon,
} from '@mui/icons-material';
import api from '../../services/api';

function CoverageAreaManager() {
  const [coverageAreas, setCoverageAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCoverageAreas();
  }, []);

  const loadCoverageAreas = async () => {
    try {
      setLoading(true);
      const response = await api.getCoverageAreas();
      setCoverageAreas(response.data.coverageAreas);
      setError(null);
    } catch (err) {
      setError('Failed to load coverage areas');
      console.error('Load coverage areas error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (area) => {
    setSelectedArea(area);
    setEditData({
      name: area.name || '',
      description: area.description || '',
      signalThresholds: { ...area.signalThresholds },
      style: { ...area.style },
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (area) => {
    setSelectedArea(area);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setSaving(true);
      await api.deleteCoverageArea(selectedArea._id);
      setCoverageAreas(prev => prev.filter(area => area._id !== selectedArea._id));
      setDeleteDialogOpen(false);
      setSelectedArea(null);
    } catch (err) {
      setError('Failed to delete coverage area');
      console.error('Delete coverage area error:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      const response = await api.updateCoverageArea(selectedArea._id, editData);
      setCoverageAreas(prev => 
        prev.map(area => 
          area._id === selectedArea._id ? response.data.coverageArea : area
        )
      );
      setEditDialogOpen(false);
      setSelectedArea(null);
      setEditData({});
    } catch (err) {
      setError('Failed to update coverage area');
      console.error('Update coverage area error:', err);
    } finally {
      setSaving(false);
    }
  };

  const getCoverageTypeIcon = (type) => {
    switch (type) {
      case 'circle':
        return <CircleIcon fontSize="small" />;
      case 'rectangle':
        return <RectangleIcon fontSize="small" />;
      case 'polygon':
        return <PolygonIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const getCoverageTypeColor = (type) => {
    switch (type) {
      case 'circle':
        return 'primary';
      case 'rectangle':
        return 'secondary';
      case 'polygon':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatArea = (area) => {
    switch (area.coverageType) {
      case 'circle':
        return `R: ${area.radius || 0}m`;
      case 'rectangle':
        return area.bounds ? 
          `${Math.round(area.bounds.width || 0)} × ${Math.round(area.bounds.height || 0)}m` : 
          'N/A';
      case 'polygon':
        return `${(area.points || []).length} points`;
      default:
        return 'N/A';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Coverage Area Management ({coverageAreas.length} areas)
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadCoverageAreas}
            disabled={saving}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Monitor</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Dimensions</TableCell>
              <TableCell>Signal Range</TableCell>
              <TableCell>Style</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coverageAreas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" py={3}>
                    No coverage areas found. Coverage areas are created from the Floor Plans page.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              coverageAreas.map((area) => (
                <TableRow key={area._id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: area.monitorId?.status === 'online' ? '#4caf50' : '#f44336'
                        }}
                      />
                      {area.monitorId?.name || area.monitorId?.monitorId || 'Unknown'}
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      icon={getCoverageTypeIcon(area.coverageType)}
                      label={area.coverageType}
                      color={getCoverageTypeColor(area.coverageType)}
                      size="small"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      Floor {area.floorId}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {formatArea(area)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      <Chip
                        label={`Exc: ${area.signalThresholds?.excellent || -50}`}
                        size="small"
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                        color="success"
                      />
                      <Chip
                        label={`Poor: ${area.signalThresholds?.poor || -80}`}
                        size="small"
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                        color="error"
                      />
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          backgroundColor: area.style?.fillColor || '#1976d2',
                          border: `1px solid ${area.style?.strokeColor || '#1976d2'}`,
                          borderRadius: '2px',
                          opacity: area.style?.fillOpacity || 0.3
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {area.style?.strokeWidth || 2}px
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="Edit Coverage Area">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(area)}
                          disabled={saving}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Coverage Area">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(area)}
                          disabled={saving}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Coverage Area</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                value={editData.name || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={editData.description || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label="Excellent Threshold (dBm)"
                type="number"
                value={editData.signalThresholds?.excellent || -50}
                onChange={(e) => setEditData(prev => ({
                  ...prev,
                  signalThresholds: { ...prev.signalThresholds, excellent: parseInt(e.target.value) }
                }))}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label="Poor Threshold (dBm)"
                type="number"
                value={editData.signalThresholds?.poor || -80}
                onChange={(e) => setEditData(prev => ({
                  ...prev,
                  signalThresholds: { ...prev.signalThresholds, poor: parseInt(e.target.value) }
                }))}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label="Fill Color"
                value={editData.style?.fillColor || '#1976d2'}
                onChange={(e) => setEditData(prev => ({
                  ...prev,
                  style: { ...prev.style, fillColor: e.target.value }
                }))}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label="Stroke Color"
                value={editData.style?.strokeColor || '#1976d2'}
                onChange={(e) => setEditData(prev => ({
                  ...prev,
                  style: { ...prev.style, strokeColor: e.target.value }
                }))}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={saveChanges}
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Coverage Area</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this coverage area? This action cannot be undone.
          </Typography>
          {selectedArea && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="body2">
                <strong>Monitor:</strong> {selectedArea.monitorId?.name || 'Unknown'}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {selectedArea.coverageType}
              </Typography>
              <Typography variant="body2">
                <strong>Floor:</strong> {selectedArea.floorId}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CoverageAreaManager;