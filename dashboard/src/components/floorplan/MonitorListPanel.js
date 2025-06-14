import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
  Badge,
  Divider,
} from '@mui/material';
import {
  Router as RouterIcon,
  Search,
  Refresh,
  LocationOff,
  LocationOn,
  SignalWifi4Bar,
  SignalWifiOff,
  DragIndicator,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMonitors } from '../../store/slices/monitorsSlice';

const MonitorListPanel = ({ selectedLocation, selectedFloor, onMonitorDragStart }) => {
  const dispatch = useDispatch();
  const { list: monitors, loading, error } = useSelector(state => state.monitors);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedMonitor, setDraggedMonitor] = useState(null);

  useEffect(() => {
    dispatch(fetchMonitors());
  }, [dispatch]);

  // Filter monitors based on search term and floor selection
  const filteredMonitors = monitors.filter(monitor => {
    const matchesSearch = !searchTerm || 
      monitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      monitor.monitorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      monitor.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });


  // Separate monitors into positioned and unpositioned based on current floor
  const { positionedMonitors, unpositionedMonitors } = filteredMonitors.reduce((acc, monitor) => {
    // A monitor is truly unpositioned if:
    // 1. It has no location/floor assignment at all (removed from floor plan)
    // 2. It's on the current floor but at position (0,0) - invalid position
    const hasNoLocation = !monitor.locationId || !monitor.floorId;
    const isOnCurrentFloor = monitor.locationId === selectedLocation?._id && 
                           monitor.floorId === selectedFloor?._id;
    const hasValidPosition = monitor.position && 
                           (monitor.position.x !== 0 || monitor.position.y !== 0);
    
    console.log(`MonitorListPanel: Filtering monitor ${monitor.name}:`, {
      hasNoLocation,
      isOnCurrentFloor,
      hasValidPosition,
      locationId: monitor.locationId,
      floorId: monitor.floorId,
      selectedLocationId: selectedLocation?._id,
      selectedFloorId: selectedFloor?._id,
      position: monitor.position
    });
    
    if (hasNoLocation) {
      // Monitor has no location assignment - truly unpositioned
      console.log(`MonitorListPanel: ${monitor.name} -> unpositioned (no location)`);
      acc.unpositionedMonitors.push(monitor);
    } else if (isOnCurrentFloor && hasValidPosition) {
      // Monitor is positioned on the current floor
      console.log(`MonitorListPanel: ${monitor.name} -> positioned on current floor`);
      acc.positionedMonitors.push(monitor);
    } else if (isOnCurrentFloor && !hasValidPosition) {
      // Monitor is assigned to current floor but at invalid position (0,0)
      console.log(`MonitorListPanel: ${monitor.name} -> unpositioned (invalid position)`);
      acc.unpositionedMonitors.push(monitor);
    } else {
      console.log(`MonitorListPanel: ${monitor.name} -> skipped (on other floor)`);
    }
    // Skip monitors that are positioned on other floors - don't show them at all
    
    return acc;
  }, { positionedMonitors: [], unpositionedMonitors: [] });

  console.log('MonitorListPanel: Final results:', {
    positionedCount: positionedMonitors.length,
    unpositionedCount: unpositionedMonitors.length,
    positionedNames: positionedMonitors.map(m => m.name),
    unpositionedNames: unpositionedMonitors.map(m => m.name)
  });


  const handleDragStart = useCallback((e, monitor) => {
    setDraggedMonitor(monitor);
    if (onMonitorDragStart) {
      onMonitorDragStart(monitor);
    }
    
    // Set drag data
    const dragData = {
      type: 'monitor',
      monitor: monitor
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  }, [onMonitorDragStart, selectedFloor]);

  const handleDragEnd = useCallback(() => {
    setDraggedMonitor(null);
  }, []);

  const getStatusColor = (monitor) => {
    if (!monitor.isOnline) return 'error';
    if (monitor.status === 'active') return 'success';
    if (monitor.status === 'maintenance') return 'warning';
    return 'default';
  };

  const getStatusIcon = (monitor) => {
    if (!monitor.isOnline) return <SignalWifiOff />;
    return <SignalWifi4Bar />;
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderMonitorItem = (monitor, isDraggable = true) => {
    const isCurrentlyDragged = draggedMonitor && draggedMonitor._id === monitor._id;
    const canDrag = isDraggable && !!selectedFloor;
    
    
    return (
      <ListItem
        key={monitor._id}
        draggable={canDrag}
        onDragStart={(e) => canDrag && handleDragStart(e, monitor)}
        onDragEnd={handleDragEnd}
        sx={{
          borderRadius: 1,
          mb: 1,
          border: 2,
          borderColor: isCurrentlyDragged ? 'primary.main' : 'divider',
          bgcolor: isCurrentlyDragged ? 'primary.50' : 'background.paper',
          opacity: isCurrentlyDragged ? 0.8 : 1,
          cursor: canDrag ? 'grab' : 'default',
          transform: isCurrentlyDragged ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: canDrag ? 'action.hover' : 'background.paper',
            transform: canDrag ? 'scale(1.01)' : 'scale(1)',
          },
          '&:active': {
            cursor: canDrag ? 'grabbing' : 'default',
          },
        }}
      >
        <ListItemAvatar>
          <Badge
            badgeContent={
              monitor.isOnline ? (
                <SignalWifi4Bar sx={{ fontSize: 12, color: 'success.main' }} />
              ) : (
                <SignalWifiOff sx={{ fontSize: 12, color: 'error.main' }} />
              )
            }
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Avatar
              sx={{
                bgcolor: getStatusColor(monitor) + '.main',
                color: 'white',
              }}
            >
              <RouterIcon />
            </Avatar>
          </Badge>
        </ListItemAvatar>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" noWrap>
                {monitor.name}
              </Typography>
              <Chip
                label={monitor.status}
                size="small"
                color={getStatusColor(monitor)}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
          }
          secondary={
            <React.Fragment>
              <Typography variant="caption" color="text.secondary" display="block">
                ID: {monitor.monitorId}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Location: {monitor.location}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Last seen: {formatLastSeen(monitor.lastHeartbeat)}
              </Typography>
            </React.Fragment>
          }
        />
        
        {canDrag ? (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
            <DragIndicator sx={{ color: 'text.secondary' }} />
          </Box>
        ) : (
          <Box sx={{ width: 24, ml: 1 }} />
        )}
      </ListItem>
    );
  };

  if (!selectedFloor) {
    return (
      <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Available Monitors
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            color: 'text.secondary',
          }}
        >
          <LocationOff sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
          <Typography variant="body2" textAlign="center">
            Select a floor to position monitors
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Available Monitors
        </Typography>
        <Tooltip title="Refresh">
          <span>
            <IconButton 
              size="small" 
              onClick={() => dispatch(fetchMonitors())}
              disabled={loading}
            >
              <Refresh />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Search */}
      <TextField
        placeholder="Search monitors..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        size="small"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Typography color="error" variant="body2" sx={{ p: 2, textAlign: 'center' }}>
          Error loading monitors: {error}
        </Typography>
      )}

      {/* Monitor lists */}
      {!loading && !error && (
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {/* Unpositioned monitors - draggable */}
          {unpositionedMonitors.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <LocationOff sx={{ fontSize: 16, mr: 1 }} />
                Unpositioned ({unpositionedMonitors.length})
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Drag these monitors onto the floor plan to position them
              </Typography>
              <List dense sx={{ p: 0 }}>
                {unpositionedMonitors.map(monitor => renderMonitorItem(monitor, true))}
              </List>
            </Box>
          )}

          {/* Positioned monitors - informational */}
          {positionedMonitors.length > 0 && (
            <Box>
              {unpositionedMonitors.length > 0 && <Divider sx={{ my: 2 }} />}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <LocationOn sx={{ fontSize: 16, mr: 1 }} />
                Positioned on This Floor ({positionedMonitors.length})
              </Typography>
              <List dense sx={{ p: 0 }}>
                {positionedMonitors.map(monitor => renderMonitorItem(monitor, false))}
              </List>
            </Box>
          )}

          {/* Empty state */}
          {filteredMonitors.length === 0 && !loading && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                color: 'text.secondary',
              }}
            >
              <RouterIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body2" textAlign="center">
                {searchTerm ? 'No monitors match your search' : 'No monitors found'}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default MonitorListPanel;