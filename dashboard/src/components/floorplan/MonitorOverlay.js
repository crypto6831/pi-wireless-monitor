import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
} from '@mui/material';
import {
  RouterOutlined,
  CheckCircle,
  Error,
  Warning,
  MoreVert,
  Info,
  Edit,
  Delete,
  RadioButtonChecked,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import {
  setSelectedMonitors,
  addSelectedMonitor,
  removeSelectedMonitor,
  setDraggedMonitor,
  updateMonitorPositionLocal,
  updateMonitorPosition,
} from '../../store/slices/floorPlanSlice';

const MonitorIcon = ({ monitor, size = 40, isSelected = false, isDragging = false }) => {
  const getStatusColor = () => {
    if (!monitor.isOnline) return '#f44336'; // red
    if (monitor.status === 'error') return '#f44336'; // red
    if (monitor.status === 'warning') return '#ff9800'; // orange
    return '#4caf50'; // green
  };

  const getStatusIcon = () => {
    if (!monitor.isOnline) return <Error />;
    if (monitor.status === 'error') return <Error />;
    if (monitor.status === 'warning') return <Warning />;
    return <CheckCircle />;
  };

  return (
    <Box
      sx={{
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(1.1)' : 'scale(1)',
        transition: 'all 0.2s ease',
      }}
    >
      <Avatar
        sx={{
          width: size,
          height: size,
          bgcolor: getStatusColor(),
          border: isSelected ? 3 : 2,
          borderColor: isSelected ? '#2196f3' : '#fff',
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        <RouterOutlined sx={{ fontSize: size * 0.6 }} />
      </Avatar>
      
      {/* Status indicator */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          backgroundColor: '#fff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size * 0.4,
          height: size * 0.4,
        }}
      >
        {React.cloneElement(getStatusIcon(), { 
          sx: { fontSize: size * 0.3, color: getStatusColor() } 
        })}
      </Box>
    </Box>
  );
};

const MonitorCard = ({ monitor, position, isSelected, onSelect, onContextMenu }) => {
  const { viewSettings } = useSelector(state => state.floorPlan);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dispatch = useDispatch();

  const screenPosition = {
    x: (position.x || 0) * viewSettings.zoom + viewSettings.panX,
    y: (position.y || 0) * viewSettings.zoom + viewSettings.panY,
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    
    setIsDragging(true);
    dispatch(setDraggedMonitor(monitor));
    
    // Select monitor if not already selected
    if (!isSelected) {
      if (e.ctrlKey || e.metaKey) {
        dispatch(addSelectedMonitor(monitor._id));
      } else {
        dispatch(setSelectedMonitors([monitor._id]));
      }
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const newScreenX = e.clientX - dragOffset.x;
    const newScreenY = e.clientY - dragOffset.y;
    
    // Convert back to world coordinates
    const newWorldX = (newScreenX - viewSettings.panX) / viewSettings.zoom;
    const newWorldY = (newScreenY - viewSettings.panY) / viewSettings.zoom;
    
    // Update position locally for immediate feedback
    dispatch(updateMonitorPositionLocal({
      monitorId: monitor._id,
      position: { x: newWorldX, y: newWorldY }
    }));
  }, [isDragging, dragOffset, viewSettings, dispatch, monitor._id]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      dispatch(setDraggedMonitor(null));
      
      // Save position to server
      dispatch(updateMonitorPosition({
        monitorId: monitor._id,
        position: monitor.position
      }));
    }
  }, [isDragging, dispatch, monitor._id, monitor.position]);

  // Add global event listeners for mouse events during drag
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      if (isSelected) {
        dispatch(removeSelectedMonitor(monitor._id));
      } else {
        dispatch(addSelectedMonitor(monitor._id));
      }
    } else {
      dispatch(setSelectedMonitors([monitor._id]));
    }
    
    if (onSelect) {
      onSelect(monitor);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e, monitor);
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        left: screenPosition.x,
        top: screenPosition.y,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 1000 : 100,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <Paper
        elevation={isSelected ? 8 : 2}
        sx={{
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 80,
          backgroundColor: isSelected ? '#e3f2fd' : '#fff',
          border: isSelected ? 2 : 0,
          borderColor: '#2196f3',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <MonitorIcon 
          monitor={monitor} 
          isSelected={isSelected}
          isDragging={isDragging}
        />
        
        {viewSettings.showMonitorLabels && (
          <Typography 
            variant="caption" 
            sx={{ 
              mt: 0.5, 
              textAlign: 'center',
              fontWeight: isSelected ? 'bold' : 'normal',
            }}
          >
            {monitor.name}
          </Typography>
        )}
        
        {/* Status chip */}
        <Chip
          size="small"
          label={monitor.status}
          color={monitor.isOnline ? 'success' : 'error'}
          sx={{ mt: 0.5, fontSize: '0.6rem', height: 16 }}
        />
      </Paper>
    </Box>
  );
};

const MonitorOverlay = ({ monitors = [], onMonitorSelect, onMonitorUpdate }) => {
  const dispatch = useDispatch();
  const { selectedMonitors, viewSettings } = useSelector(state => state.floorPlan);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMonitor, setContextMonitor] = useState(null);

  const handleContextMenu = (event, monitor) => {
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
    setContextMonitor(monitor);
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
    setContextMonitor(null);
  };

  const handleMonitorInfo = () => {
    if (contextMonitor && onMonitorSelect) {
      onMonitorSelect(contextMonitor);
    }
    handleContextMenuClose();
  };

  const handleBulkSelect = () => {
    const monitorIds = monitors.map(m => m._id);
    dispatch(setSelectedMonitors(monitorIds));
    handleContextMenuClose();
  };

  const handleClearSelection = () => {
    dispatch(setSelectedMonitors([]));
    handleContextMenuClose();
  };

  return (
    <>
      {monitors.map((monitor) => (
        <MonitorCard
          key={monitor._id}
          monitor={monitor}
          position={monitor.position || { x: 100, y: 100 }}
          isSelected={selectedMonitors.includes(monitor._id)}
          onSelect={onMonitorSelect}
          onContextMenu={handleContextMenu}
        />
      ))}

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleMonitorInfo}>
          <ListItemIcon>
            <Info />
          </ListItemIcon>
          <ListItemText>Monitor Info</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleBulkSelect}>
          <ListItemIcon>
            <RadioButtonChecked />
          </ListItemIcon>
          <ListItemText>Select All</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleClearSelection}>
          <ListItemIcon>
            <RadioButtonChecked />
          </ListItemIcon>
          <ListItemText>Clear Selection</ListItemText>
        </MenuItem>
      </Menu>

      {/* Selection info */}
      {selectedMonitors.length > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            p: 2,
            backgroundColor: '#e3f2fd',
            zIndex: 2000,
          }}
        >
          <Typography variant="body2">
            {selectedMonitors.length} monitor{selectedMonitors.length > 1 ? 's' : ''} selected
          </Typography>
        </Paper>
      )}
    </>
  );
};

export default MonitorOverlay;