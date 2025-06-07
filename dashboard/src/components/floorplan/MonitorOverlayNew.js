import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Tooltip,
  IconButton,
  Typography,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Router as RouterIcon,
  Delete,
  SignalWifi4Bar,
  SignalWifiOff,
  Close,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMonitors } from '../../store/slices/monitorsSlice';
import { apiService } from '../../services/api';

const MonitorOverlayNew = ({ 
  selectedLocation, 
  selectedFloor, 
  onMonitorPositionChange,
  onMonitorClick
}) => {
  const dispatch = useDispatch();
  const { list: monitors } = useSelector(state => state.monitors);
  const { viewSettings = { panX: 0, panY: 0, zoom: 1 } } = useSelector(state => state.floorPlan);
  
  const [draggedMonitor, setDraggedMonitor] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  // Get monitors positioned on current floor
  const floorMonitors = monitors.filter(monitor => 
    monitor.locationId === selectedLocation?._id &&
    monitor.floorId === selectedFloor?._id &&
    monitor.position &&
    (monitor.position.x !== 0 || monitor.position.y !== 0)
  );

  // Drag and drop handling is now in FloorPlanViewer component

  // Handle monitor repositioning
  const handleMonitorMouseDown = (e, monitor) => {
    e.stopPropagation();
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    setDraggedMonitor(monitor);
    setDragOffset({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggedMonitor || !viewSettings) return;
    
    const container = document.querySelector('[data-floor-plan-container]');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left - dragOffset.x - viewSettings.panX) / viewSettings.zoom;
    const y = (e.clientY - rect.top - dragOffset.y - viewSettings.panY) / viewSettings.zoom;
    
    // Update visual position immediately
    const monitorElement = document.querySelector(`[data-monitor-id="${draggedMonitor._id}"]`);
    if (monitorElement) {
      monitorElement.style.left = `${(e.clientX - rect.left - dragOffset.x)}px`;
      monitorElement.style.top = `${(e.clientY - rect.top - dragOffset.y)}px`;
    }
  }, [draggedMonitor, dragOffset, viewSettings]);

  const handleMouseUp = useCallback(async (e) => {
    if (!draggedMonitor || !viewSettings) return;
    
    try {
      const container = document.querySelector('[data-floor-plan-container]');
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left - dragOffset.x - viewSettings.panX) / viewSettings.zoom;
      const y = (e.clientY - rect.top - dragOffset.y - viewSettings.panY) / viewSettings.zoom;
      
      // Update position via API
      await apiService.updateMonitorPosition(draggedMonitor._id, {
        x: Math.round(x),
        y: Math.round(y),
        locationId: selectedLocation._id,
        floorId: selectedFloor._id,
      });
      
      // Refresh monitors list
      dispatch(fetchMonitors());
      
      if (onMonitorPositionChange) {
        onMonitorPositionChange(draggedMonitor, { x: Math.round(x), y: Math.round(y) });
      }
    } catch (err) {
      console.error('Error updating monitor position:', err);
    } finally {
      setDraggedMonitor(null);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [draggedMonitor, dragOffset, viewSettings, selectedLocation, selectedFloor, dispatch, onMonitorPositionChange]);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (draggedMonitor) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedMonitor, handleMouseMove, handleMouseUp]);

  const handleMonitorClick = (monitor) => {
    setSelectedMonitor(monitor);
    setInfoDialogOpen(true);
    if (onMonitorClick) {
      onMonitorClick(monitor);
    }
  };

  const handleRemoveFromFloor = async (monitor) => {
    try {
      await apiService.updateMonitorPosition(monitor._id, {
        x: 0,
        y: 0,
        locationId: null,
        floorId: null,
      });
      
      dispatch(fetchMonitors());
      setInfoDialogOpen(false);
      setSelectedMonitor(null);
    } catch (err) {
      console.error('Error removing monitor from floor:', err);
    }
  };

  const getStatusColor = (monitor) => {
    if (!monitor.isOnline) return '#f44336'; // error red
    if (monitor.status === 'active') return '#4caf50'; // success green
    if (monitor.status === 'maintenance') return '#ff9800'; // warning orange
    return '#9e9e9e'; // default grey
  };

  const worldToScreen = (worldX, worldY) => {
    if (!viewSettings) return { x: worldX, y: worldY };
    return {
      x: worldX * viewSettings.zoom + viewSettings.panX,
      y: worldY * viewSettings.zoom + viewSettings.panY,
    };
  };

  if (!selectedFloor || floorMonitors.length === 0) {
    return null;
  }

  return (
    <>
      {floorMonitors.map((monitor) => {
        const screenPos = worldToScreen(monitor.position.x, monitor.position.y);
        const isBeingDragged = draggedMonitor && draggedMonitor._id === monitor._id;
        
        return (
          <Box
            key={monitor._id}
            data-monitor-id={monitor._id}
            sx={{
              position: 'absolute',
              left: isBeingDragged ? 0 : screenPos.x,
              top: isBeingDragged ? 0 : screenPos.y,
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              cursor: 'grab',
              '&:active': {
                cursor: 'grabbing',
              },
            }}
            onMouseDown={(e) => handleMonitorMouseDown(e, monitor)}
            onClick={() => handleMonitorClick(monitor)}
          >
            <Tooltip
              title={
                <Box>
                  <Typography variant="subtitle2">{monitor.name}</Typography>
                  <Typography variant="caption">ID: {monitor.monitorId}</Typography>
                  <br />
                  <Typography variant="caption">Status: {monitor.status}</Typography>
                  <br />
                  <Typography variant="caption">
                    Position: ({monitor.position.x}, {monitor.position.y})
                  </Typography>
                </Box>
              }
              placement="top"
            >
              <Paper
                elevation={3}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'white',
                  border: 3,
                  borderColor: getStatusColor(monitor),
                  opacity: isBeingDragged ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  '&:hover': {
                    elevation: 6,
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <RouterIcon 
                  sx={{ 
                    fontSize: 20, 
                    color: getStatusColor(monitor),
                  }} 
                />
              </Paper>
            </Tooltip>
            
            {/* Status indicator */}
            <Box
              sx={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: monitor.isOnline ? 'success.main' : 'error.main',
                border: 2,
                borderColor: 'white',
              }}
            />
          </Box>
        );
      })}

      {/* Monitor Info Dialog */}
      <Dialog 
        open={infoDialogOpen} 
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Monitor Details
          <IconButton onClick={() => setInfoDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        {selectedMonitor && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <RouterIcon sx={{ color: getStatusColor(selectedMonitor) }} />
                <Box>
                  <Typography variant="h6">{selectedMonitor.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedMonitor.monitorId}
                  </Typography>
                </Box>
                <Chip
                  label={selectedMonitor.status}
                  size="small"
                  color={selectedMonitor.isOnline ? 'success' : 'error'}
                />
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Position</Typography>
                <Typography variant="body2">
                  X: {selectedMonitor.position?.x || 0}, Y: {selectedMonitor.position?.y || 0}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Location</Typography>
                <Typography variant="body2">{selectedMonitor.location}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Last Heartbeat</Typography>
                <Typography variant="body2">
                  {selectedMonitor.lastHeartbeat 
                    ? new Date(selectedMonitor.lastHeartbeat).toLocaleString()
                    : 'Never'
                  }
                </Typography>
              </Box>
              
              {selectedMonitor.systemInfo && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>System Info</Typography>
                  <Typography variant="body2">
                    Platform: {selectedMonitor.systemInfo.platform} {selectedMonitor.systemInfo.platformRelease}
                  </Typography>
                  <Typography variant="body2">
                    Hostname: {selectedMonitor.systemInfo.hostname}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
        )}
        
        <DialogActions>
          <Button
            onClick={() => selectedMonitor && handleRemoveFromFloor(selectedMonitor)}
            color="error"
            startIcon={<Delete />}
          >
            Remove from Floor
          </Button>
          <Button onClick={() => setInfoDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MonitorOverlayNew;