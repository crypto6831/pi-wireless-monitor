import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  RouterOutlined,
  Settings,
  Info,
  Close,
  Layers,
  Upload,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';

// Import our new components
import LocationHierarchy from '../components/locations/LocationHierarchy';
import FloorPlanViewer from '../components/floorplan/FloorPlanViewer';
import MonitorOverlay from '../components/floorplan/MonitorOverlay';
import CoverageOverlay from '../components/floorplan/CoverageOverlay';

// Import actions
import {
  fetchLocationMonitors,
  fetchLocationCoverage,
  clearSelectedMonitors,
  updateMonitorPosition,
} from '../store/slices/floorPlanSlice';
import { setSelectedLocation, setSelectedFloor } from '../store/slices/locationsSlice';

const MonitorInfoPanel = ({ monitor, open, onClose }) => {
  if (!monitor) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 400, p: 2 }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Monitor Details</Typography>
        <Button onClick={onClose} size="small">
          <Close />
        </Button>
      </Box>

      <List>
        <ListItem>
          <ListItemIcon>
            <RouterOutlined />
          </ListItemIcon>
          <ListItemText
            primary="Monitor Name"
            secondary={monitor.name}
          />
        </ListItem>

        <ListItem>
          <ListItemText
            primary="Monitor ID"
            secondary={monitor.monitorId}
          />
        </ListItem>

        <ListItem>
          <ListItemText
            primary="Location"
            secondary={monitor.location}
          />
        </ListItem>

        <ListItem>
          <ListItemText
            primary="Status"
            secondary={
              <Chip
                label={monitor.status}
                color={monitor.isOnline ? 'success' : 'error'}
                size="small"
              />
            }
          />
        </ListItem>

        <Divider sx={{ my: 2 }} />

        <ListItem>
          <ListItemText
            primary="Position"
            secondary={
              monitor.position 
                ? `X: ${Math.round(monitor.position.x)}, Y: ${Math.round(monitor.position.y)}`
                : 'Not positioned'
            }
          />
        </ListItem>

        <ListItem>
          <ListItemText
            primary="Last Heartbeat"
            secondary={
              monitor.lastHeartbeat 
                ? new Date(monitor.lastHeartbeat).toLocaleString()
                : 'Never'
            }
          />
        </ListItem>

        <ListItem>
          <ListItemText
            primary="Last Scan"
            secondary={
              monitor.lastScan 
                ? new Date(monitor.lastScan).toLocaleString()
                : 'Never'
            }
          />
        </ListItem>

        <Divider sx={{ my: 2 }} />

        <ListItem>
          <ListItemText
            primary="Capabilities"
            secondary={
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {Object.entries(monitor.capabilities || {}).map(([key, value]) => (
                  value && (
                    <Chip
                      key={key}
                      label={key.replace(/([A-Z])/g, ' $1').trim()}
                      size="small"
                      variant="outlined"
                    />
                  )
                ))}
              </Box>
            }
          />
        </ListItem>
      </List>
    </Drawer>
  );
};

const FloorPlans = () => {
  const dispatch = useDispatch();
  
  // Debug: Check if Redux state is accessible
  const locationsState = useSelector(state => state.locations);
  const floorPlanState = useSelector(state => state.floorPlan);
  
  console.log('FloorPlans - locations state:', locationsState);
  console.log('FloorPlans - floorPlan state:', floorPlanState);
  
  const { selectedLocation, selectedFloor } = useSelector(state => state.locations || {});
  const { monitors, coverageAreas, selectedMonitors, viewSettings, loading, error } = useSelector(
    state => state.floorPlan || {}
  );

  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [monitorInfoOpen, setMonitorInfoOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Load monitors and coverage when location/floor changes
  useEffect(() => {
    if (selectedLocation?._id && selectedFloor?._id) {
      try {
        dispatch(fetchLocationMonitors(selectedLocation._id));
        dispatch(fetchLocationCoverage({ 
          locationId: selectedLocation._id,
          floorId: selectedFloor._id 
        }));
      } catch (err) {
        console.error('Error loading location data:', err);
      }
    }
  }, [dispatch, selectedLocation, selectedFloor]);

  // Clear selection when location changes
  useEffect(() => {
    dispatch(clearSelectedMonitors());
    setSelectedMonitor(null);
    setMonitorInfoOpen(false);
  }, [dispatch, selectedLocation, selectedFloor]);

  // Show error messages
  useEffect(() => {
    if (error) {
      setSnackbar({
        open: true,
        message: error,
        severity: 'error'
      });
    }
  }, [error]);

  const handleLocationSelect = (location, floor) => {
    try {
      console.log('FloorPlans - Location select:', { location, floor });
      dispatch(setSelectedLocation(location));
      dispatch(setSelectedFloor(floor));
    } catch (err) {
      console.error('Error in handleLocationSelect:', err);
      setSnackbar({
        open: true,
        message: 'Error selecting location',
        severity: 'error'
      });
    }
  };

  const handleMonitorSelect = (monitor) => {
    setSelectedMonitor(monitor);
    setMonitorInfoOpen(true);
  };

  const handleMonitorDrag = (monitorId, newPosition) => {
    console.log('Monitor dragged:', monitorId, newPosition);
    // Dispatch action to update monitor position
    dispatch(updateMonitorPosition({ monitorId, position: newPosition }));
  };

  const handleCanvasClick = (coordinates) => {
    console.log('Canvas clicked at:', coordinates);
    // Could be used for placing new monitors or coverage areas
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const filteredMonitors = (monitors || []).filter(monitor => {
    if (!selectedFloor) return true;
    return monitor.floorId === selectedFloor._id;
  });

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        Floor Plans & Monitor Management
      </Typography>

      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Location Hierarchy */}
        <Paper sx={{ width: 350, display: 'flex', flexDirection: 'column', m: 1 }}>
          <LocationHierarchy
            onLocationSelect={handleLocationSelect}
            showCreateButton={true}
          />
        </Paper>

        {/* Main Content - Floor Plan Viewer */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', m: 1 }}>
          {!selectedLocation ? (
            <Paper sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
              p: 3,
            }}>
              <Info sx={{ fontSize: 64, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary">
                Select a location to get started
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use the location hierarchy on the left to select an address and building
              </Typography>
            </Paper>
          ) : !selectedFloor ? (
            <Paper sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
              p: 3,
            }}>
              <Layers sx={{ fontSize: 64, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary">
                Add a floor to {selectedLocation.buildingName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Add Floor" in the left panel to create a floor for this building
              </Typography>
            </Paper>
          ) : (
            <FloorPlanViewer
              selectedLocation={selectedLocation}
              selectedFloor={selectedFloor}
              onMonitorClick={handleMonitorSelect}
              onMonitorDrag={handleMonitorDrag}
              onCanvasClick={handleCanvasClick}
            >
              <MonitorOverlay
                monitors={filteredMonitors}
                selectedMonitors={selectedMonitors}
                onMonitorSelect={handleMonitorSelect}
                onMonitorDrag={handleMonitorDrag}
              />
              {viewSettings.showCoverage && (
                <CoverageOverlay
                  monitors={filteredMonitors}
                  coverageAreas={coverageAreas}
                />
              )}
            </FloorPlanViewer>
          )}
        </Box>
      </Box>

      {/* Monitor Info Panel */}
      <MonitorInfoPanel
        monitor={selectedMonitor}
        open={monitorInfoOpen}
        onClose={() => setMonitorInfoOpen(false)}
      />

      {/* Status Bar */}
      <Paper sx={{ 
        p: 1, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderTop: 1,
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography variant="caption">
            {selectedLocation ? 
              `${selectedLocation.buildingName} - ${selectedLocation.address}` : 
              'No location selected'
            }
          </Typography>
          {selectedFloor && (
            <Typography variant="caption">
              Floor: {selectedFloor.floorName || selectedFloor.floorNumber}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography variant="caption">
            Monitors: {filteredMonitors.length}
          </Typography>
          <Typography variant="caption">
            Selected: {(selectedMonitors || []).length}
          </Typography>
          <Typography variant="caption">
            Coverage Areas: {(coverageAreas || []).length}
          </Typography>
        </Box>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FloorPlans;