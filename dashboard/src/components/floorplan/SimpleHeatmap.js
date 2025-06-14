import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectSignalThresholds, selectHeatmapSettings } from '../../store/slices/coverageSettingsSlice';

const SimpleHeatmap = ({ monitors, viewSettings, canvasRef, intensity = 0.5 }) => {
  const canvasRef_local = useRef(null);
  const signalThresholds = useSelector(selectSignalThresholds);
  const heatmapSettings = useSelector(selectHeatmapSettings);

  useEffect(() => {
    if (!canvasRef_local.current || !monitors.length) {
      return;
    }

    const canvas = canvasRef_local.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get effective intensity
    const effectiveIntensity = intensity || heatmapSettings.intensity || 0.5;
    
    // Filter active monitors with positions
    const activeMonitors = monitors.filter(m => {
      return m.position && m.position.x !== undefined && m.position.y !== undefined;
    });
    
    console.log('SimpleHeatmap: Rendering', activeMonitors.length, 'monitors');
    
    if (activeMonitors.length === 0) {
      return;
    }
    
    // Apply view transformations
    ctx.save();
    ctx.translate(viewSettings.panX, viewSettings.panY);
    ctx.scale(viewSettings.zoom, viewSettings.zoom);
    
    // Draw a simple gradient for each monitor
    activeMonitors.forEach(monitor => {
      const { x, y } = monitor.position;
      
      // Create radial gradient
      const radius = 300; // Fixed radius for testing
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      
      // Simple green to transparent gradient
      gradient.addColorStop(0, `rgba(76, 175, 80, ${effectiveIntensity})`);
      gradient.addColorStop(0.5, `rgba(76, 175, 80, ${effectiveIntensity * 0.5})`);
      gradient.addColorStop(1, 'rgba(76, 175, 80, 0)');
      
      // Draw the gradient
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      
      // Debug: Draw a small circle at monitor position
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
    
  }, [monitors, viewSettings, intensity, heatmapSettings]);

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

export default SimpleHeatmap;