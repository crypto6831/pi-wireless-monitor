import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCoverageSettings, selectSignalThresholds, selectHeatmapSettings, selectDefaultCoverageArea } from '../../store/slices/coverageSettingsSlice';

const CoverageArea = ({ area, viewSettings, canvasRef }) => {
  const canvasOverlayRef = useRef(null);
  const defaultStyling = useSelector(selectDefaultCoverageArea);

  useEffect(() => {
    if (!canvasOverlayRef.current || !canvasRef.current) return;

    const canvas = canvasOverlayRef.current;
    const ctx = canvas.getContext('2d');
    const { zoom, panX, panY } = viewSettings;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Set area style using global defaults
    ctx.fillStyle = area.style?.fillColor || defaultStyling.fillColor;
    ctx.globalAlpha = area.style?.fillOpacity || defaultStyling.fillOpacity;
    ctx.strokeStyle = area.style?.strokeColor || defaultStyling.strokeColor;
    ctx.lineWidth = (area.style?.strokeWidth || defaultStyling.strokeWidth) / zoom; // Adjust for zoom

    // Draw based on coverage type
    switch (area.coverageType) {
      case 'circle':
        if (area.center && area.radius) {
          ctx.beginPath();
          ctx.arc(area.center.x, area.center.y, area.radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.stroke();
        }
        break;

      case 'rectangle':
        if (area.bounds) {
          ctx.fillRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height);
          ctx.globalAlpha = 1;
          ctx.strokeRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height);
        }
        break;

      case 'polygon':
        if (area.points && area.points.length > 2) {
          ctx.beginPath();
          ctx.moveTo(area.points[0].x, area.points[0].y);
          for (let i = 1; i < area.points.length; i++) {
            ctx.lineTo(area.points[i].x, area.points[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.stroke();
        }
        break;
    }

    ctx.restore();
  }, [area, viewSettings, canvasRef, defaultStyling]);

  return (
    <canvas
      ref={canvasOverlayRef}
      width={canvasRef.current?.width || 800}
      height={canvasRef.current?.height || 600}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
};

const SignalHeatmap = ({ monitors, viewSettings, canvasRef, intensity = 0.5 }) => {
  const canvasRef_local = useRef(null);
  const signalThresholds = useSelector(selectSignalThresholds);
  const heatmapSettings = useSelector(selectHeatmapSettings);

  useEffect(() => {
    if (!canvasRef_local.current || !canvasRef?.current || !monitors.length) return;

    const canvas = canvasRef_local.current;
    const ctx = canvas.getContext('2d');
    const { zoom, panX, panY } = viewSettings;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Generate heatmap
    const gridSize = 20; // Heatmap resolution
    const width = canvas.width / zoom;
    const height = canvas.height / zoom;

    // Use global heatmap intensity if not overridden
    const effectiveIntensity = heatmapSettings.enabled ? (intensity || heatmapSettings.intensity) : intensity;

    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        let totalSignal = 0;
        let maxSignal = -100;

        // Calculate signal strength at this point from all monitors
        monitors.forEach(monitor => {
          if (!monitor.position) return;

          const distance = Math.sqrt(
            Math.pow(x - monitor.position.x, 2) + 
            Math.pow(y - monitor.position.y, 2)
          );

          // Simple signal propagation model (inverse square law with obstacles)
          const baseSignal = -30; // dBm at 1 meter
          const pathLoss = 20 * Math.log10(distance || 1) + 20 * Math.log10(2400); // 2.4GHz
          const signal = baseSignal - pathLoss;

          totalSignal += Math.pow(10, signal / 10); // Convert to linear scale
          maxSignal = Math.max(maxSignal, signal);
        });

        // Convert back to dBm
        const averageSignal = totalSignal > 0 ? 10 * Math.log10(totalSignal) : -100;
        
        // Map signal strength to color using global thresholds
        let alpha = 0;
        let color = '';

        if (averageSignal > signalThresholds.excellent) {
          // Excellent signal (green)
          color = '76, 175, 80'; // #4CAF50
          alpha = 0.8 * effectiveIntensity;
        } else if (averageSignal > signalThresholds.good) {
          // Good signal (light green)
          color = '139, 195, 74'; // #8BC34A
          alpha = 0.6 * effectiveIntensity;
        } else if (averageSignal > signalThresholds.fair) {
          // Fair signal (yellow)
          color = '255, 235, 59'; // #FFEB3B
          alpha = 0.4 * effectiveIntensity;
        } else if (averageSignal > signalThresholds.poor) {
          // Poor signal (orange)
          color = '255, 152, 0'; // #FF9800
          alpha = 0.3 * effectiveIntensity;
        } else if (averageSignal > signalThresholds.weak) {
          // Weak signal (red)
          color = '244, 67, 54'; // #F44336
          alpha = 0.2 * effectiveIntensity;
        }

        if (alpha > 0) {
          ctx.fillStyle = `rgba(${color}, ${alpha})`;
          ctx.fillRect(x, y, gridSize, gridSize);
        }
      }
    }

    ctx.restore();
  }, [monitors, viewSettings, intensity, canvasRef, signalThresholds, heatmapSettings]);

  return (
    <canvas
      ref={canvasRef_local}
      width={canvasRef?.current?.width || 800}
      height={canvasRef?.current?.height || 600}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
};

const InterferenceZones = ({ zones = [], viewSettings, canvasRef }) => {
  const canvasRef_local = useRef(null);

  useEffect(() => {
    if (!canvasRef_local.current || !canvasRef?.current) return;

    const canvas = canvasRef_local.current;
    const ctx = canvas.getContext('2d');
    const { zoom, panX, panY } = viewSettings;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Draw interference zones
    zones.forEach(zone => {
      ctx.fillStyle = 'rgba(244, 67, 54, 0.2)'; // Red with low opacity
      ctx.strokeStyle = '#F44336';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5, 5]);

      if (zone.type === 'circle') {
        ctx.beginPath();
        ctx.arc(zone.center.x, zone.center.y, zone.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (zone.type === 'polygon') {
        ctx.beginPath();
        ctx.moveTo(zone.points[0].x, zone.points[0].y);
        for (let i = 1; i < zone.points.length; i++) {
          ctx.lineTo(zone.points[i].x, zone.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });

    ctx.setLineDash([]);
    ctx.restore();
  }, [zones, viewSettings, canvasRef]);

  return (
    <canvas
      ref={canvasRef_local}
      width={canvasRef?.current?.width || 800}
      height={canvasRef?.current?.height || 600}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 8,
      }}
    />
  );
};

export const CoverageControls = ({ 
  showHeatmap, 
  onToggleHeatmap, 
  heatmapIntensity, 
  onHeatmapIntensityChange,
  showInterference,
  onToggleInterference,
  coverageType,
  onCoverageTypeChange 
}) => {
  const signalThresholds = useSelector(selectSignalThresholds);
  
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Coverage Settings
      </Typography>
      
      <FormControlLabel
        control={
          <Switch
            checked={showHeatmap}
            onChange={(e) => onToggleHeatmap(e.target.checked)}
          />
        }
        label="Signal Heatmap"
      />
      
      {showHeatmap && (
        <Box sx={{ ml: 3, mt: 1 }}>
          <Typography variant="caption" gutterBottom>
            Intensity
          </Typography>
          <Slider
            value={heatmapIntensity}
            onChange={(e, value) => onHeatmapIntensityChange(value)}
            min={0.1}
            max={1}
            step={0.1}
            size="small"
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
          />
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <FormControlLabel
        control={
          <Switch
            checked={showInterference}
            onChange={(e) => onToggleInterference(e.target.checked)}
          />
        }
        label="Interference Zones"
      />

      <FormControl fullWidth size="small" sx={{ mt: 2 }}>
        <InputLabel>Coverage Display</InputLabel>
        <Select
          value={coverageType}
          onChange={(e) => onCoverageTypeChange(e.target.value)}
          label="Coverage Display"
        >
          <MenuItem value="areas">Coverage Areas Only</MenuItem>
          <MenuItem value="heatmap">Heatmap Only</MenuItem>
          <MenuItem value="both">Areas + Heatmap</MenuItem>
          <MenuItem value="none">None</MenuItem>
        </Select>
      </FormControl>

      {/* Legend with dynamic thresholds */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" gutterBottom>
          Signal Strength Legend
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[
            { color: '#4CAF50', label: `Excellent (>${signalThresholds.excellent} dBm)` },
            { color: '#8BC34A', label: `Good (${signalThresholds.excellent} to ${signalThresholds.good} dBm)` },
            { color: '#FFEB3B', label: `Fair (${signalThresholds.good} to ${signalThresholds.fair} dBm)` },
            { color: '#FF9800', label: `Poor (${signalThresholds.fair} to ${signalThresholds.poor} dBm)` },
            { color: '#F44336', label: `Weak (<${signalThresholds.poor} dBm)` },
          ].map(item => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: item.color,
                  borderRadius: '2px',
                }}
              />
              <Typography variant="caption">{item.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

const CoverageOverlay = ({ 
  coverageAreas = [], 
  monitors = [], 
  canvasRef,
  showHeatmap = true,
  heatmapIntensity = 0.5,
  showInterference = false,
  coverageType = 'both'
}) => {
  const dispatch = useDispatch();
  const { viewSettings } = useSelector(state => state.floorPlan);
  const heatmapSettings = useSelector(selectHeatmapSettings);

  // Fetch coverage settings on component mount
  useEffect(() => {
    dispatch(fetchCoverageSettings());
  }, [dispatch]);

  // Sample interference zones (would come from props in real implementation)
  const interferenceZones = [
    {
      type: 'circle',
      center: { x: 200, y: 150 },
      radius: 30,
      source: 'Microwave',
    },
    {
      type: 'polygon',
      points: [
        { x: 400, y: 200 },
        { x: 450, y: 200 },
        { x: 450, y: 250 },
        { x: 400, y: 250 },
      ],
      source: 'Metal obstruction',
    },
  ];

  const shouldShowHeatmap = (showHeatmap && heatmapSettings.enabled) && (coverageType === 'heatmap' || coverageType === 'both');
  const shouldShowAreas = coverageType === 'areas' || coverageType === 'both';

  // Use global heatmap intensity if local not specified
  const effectiveIntensity = heatmapIntensity !== 0.5 ? heatmapIntensity : heatmapSettings.intensity;

  return (
    <>
      {/* Signal Heatmap */}
      {shouldShowHeatmap && (
        <SignalHeatmap
          monitors={monitors}
          viewSettings={viewSettings}
          canvasRef={canvasRef}
          intensity={effectiveIntensity}
        />
      )}

      {/* Coverage Areas */}
      {shouldShowAreas && coverageAreas.map((area) => (
        <CoverageArea
          key={area._id}
          area={area}
          viewSettings={viewSettings}
          canvasRef={canvasRef}
        />
      ))}

      {/* Interference Zones */}
      {showInterference && (
        <InterferenceZones
          zones={interferenceZones}
          viewSettings={viewSettings}
          canvasRef={canvasRef}
        />
      )}

    </>
  );
};

export default CoverageOverlay;