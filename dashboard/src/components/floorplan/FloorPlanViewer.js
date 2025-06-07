import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Toolbar,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  ZoomOutMap,
  GridOn,
  Visibility,
  VisibilityOff,
  CloudUpload,
  Refresh,
  CenterFocusStrong,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import {
  setZoom,
  setPan,
  resetView,
  toggleGrid,
  toggleCoverage,
  toggleMonitorLabels,
  fetchFloorPlanImage,
  clearError,
} from '../../store/slices/floorPlanSlice';
import { uploadFloorPlan } from '../../store/slices/locationsSlice';

const FloorPlanViewer = ({ 
  selectedLocation, 
  selectedFloor, 
  onMonitorClick,
  onMonitorDrag,
  onCanvasClick,
  children 
}) => {
  const dispatch = useDispatch();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const { 
    floorPlanImage, 
    viewSettings, 
    loading, 
    error 
  } = useSelector(state => state.floorPlan);

  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Load floor plan image when floor changes
  useEffect(() => {
    console.log('FloorPlanViewer - Effect triggered:', {
      selectedLocation: selectedLocation?._id,
      selectedFloor: selectedFloor?._id,
      hasFloorPlan: !!selectedFloor?.floorPlan
    });
    
    if (selectedLocation && selectedFloor && selectedFloor.floorPlan) {
      console.log('FloorPlanViewer - Fetching floor plan image');
      dispatch(fetchFloorPlanImage({ 
        locationId: selectedLocation._id,
        floorId: selectedFloor._id 
      }));
    }
  }, [dispatch, selectedLocation, selectedFloor]);

  // Update canvas size on container resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width - 32, // Account for padding
          height: rect.height - 64, // Account for toolbar
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Draw floor plan and overlays
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { zoom, panX, panY, showGrid } = viewSettings;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply transformations
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Draw floor plan image
    if (floorPlanImage && imageSize.width > 0) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, imageSize.width, imageSize.height);
        
        // Draw grid if enabled
        if (showGrid) {
          drawGrid(ctx);
        }
        
        // Restore context
        ctx.restore();
      };
      img.src = floorPlanImage;
    } else {
      // Draw placeholder
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, canvasSize.width / zoom, canvasSize.height / zoom);
      
      // Draw grid if enabled
      if (showGrid) {
        drawGrid(ctx);
      }
      
      // Restore context
      ctx.restore();
      
      // Draw "No floor plan" message
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        'No floor plan available',
        canvasSize.width / 2,
        canvasSize.height / 2
      );
    }
  }, [floorPlanImage, viewSettings, canvasSize, imageSize]);

  const drawGrid = (ctx) => {
    const gridSize = 50; // 50px grid
    const { width, height } = canvasSize;
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  };

  // Load image dimensions when floor plan changes
  useEffect(() => {
    if (floorPlanImage) {
      const img = new Image();
      img.onload = () => {
        setImageSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = floorPlanImage;
    }
  }, [floorPlanImage]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Canvas event handlers
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setLastMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const deltaX = currentPos.x - lastMousePos.x;
    const deltaY = currentPos.y - lastMousePos.y;

    dispatch(setPan({
      x: viewSettings.panX + deltaX,
      y: viewSettings.panY + deltaY,
    }));

    setLastMousePos(currentPos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, viewSettings.zoom * zoomFactor));
    dispatch(setZoom(newZoom));
  };

  const handleCanvasClick = (e) => {
    if (onCanvasClick) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewSettings.panX) / viewSettings.zoom;
      const y = (e.clientY - rect.top - viewSettings.panY) / viewSettings.zoom;
      onCanvasClick({ x, y });
    }
  };

  // Coordinate conversion utilities
  const screenToWorld = (screenX, screenY) => {
    return {
      x: (screenX - viewSettings.panX) / viewSettings.zoom,
      y: (screenY - viewSettings.panY) / viewSettings.zoom,
    };
  };

  const worldToScreen = (worldX, worldY) => {
    return {
      x: worldX * viewSettings.zoom + viewSettings.panX,
      y: worldY * viewSettings.zoom + viewSettings.panY,
    };
  };

  // File upload handlers
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (selectedFile && selectedLocation && selectedFloor) {
      try {
        await dispatch(uploadFloorPlan({
          locationId: selectedLocation._id,
          floorId: selectedFloor._id,
          file: selectedFile,
          metadata: {
            address: selectedLocation.address,
            building: selectedLocation.buildingName,
            floor: selectedFloor.floorNumber,
          },
        })).unwrap();
        
        setUploadDialogOpen(false);
        setSelectedFile(null);
        
        // Reload the floor plan image
        setTimeout(() => {
          dispatch(fetchFloorPlanImage({
            locationId: selectedLocation._id,
            floorId: selectedFloor._id
          }));
        }, 1000);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
  };

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      {/* Toolbar */}
      <Toolbar variant="dense" sx={{ minHeight: 48, gap: 1 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {selectedFloor ? 
            `${selectedLocation?.buildingName} - Floor ${selectedFloor.floorNumber}` :
            'No floor selected'
          }
        </Typography>

        {/* Zoom Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
          <IconButton size="small" onClick={() => dispatch(setZoom(viewSettings.zoom * 1.2))}>
            <ZoomIn />
          </IconButton>
          <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
            {Math.round(viewSettings.zoom * 100)}%
          </Typography>
          <IconButton size="small" onClick={() => dispatch(setZoom(viewSettings.zoom * 0.8))}>
            <ZoomOut />
          </IconButton>
        </Box>

        {/* View Controls */}
        <ToggleButtonGroup size="small" sx={{ mr: 2 }}>
          <ToggleButton
            value="grid"
            selected={viewSettings.showGrid}
            onChange={() => dispatch(toggleGrid())}
          >
            <GridOn />
          </ToggleButton>
          <ToggleButton
            value="coverage"
            selected={viewSettings.showCoverage}
            onChange={() => dispatch(toggleCoverage())}
          >
            {viewSettings.showCoverage ? <Visibility /> : <VisibilityOff />}
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Action Buttons */}
        <Tooltip title="Reset View">
          <IconButton size="small" onClick={() => dispatch(resetView())}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <Button
          startIcon={<CloudUpload />}
          size="small"
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          disabled={!selectedFloor}
        >
          Upload
        </Button>
      </Toolbar>

      {/* Canvas Container */}
      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 1000,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'block',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleCanvasClick}
        />

        {/* Render children (monitors, coverage areas, etc.) */}
        {children}
      </Box>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)}>
        <DialogTitle>Upload Floor Plan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a floor plan image for {selectedLocation?.buildingName} - Floor {selectedFloor?.floorNumber}
          </Typography>
          {selectedFile && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption">
                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || loading}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FloorPlanViewer;