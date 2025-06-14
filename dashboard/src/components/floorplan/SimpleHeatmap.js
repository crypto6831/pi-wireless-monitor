import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectSignalThresholds, selectHeatmapSettings } from '../../store/slices/coverageSettingsSlice';

const SimpleHeatmap = ({ monitors, viewSettings, canvasRef, intensity = 0.5 }) => {
  const canvasRef_local = useRef(null);
  const signalThresholds = useSelector(selectSignalThresholds);
  const heatmapSettings = useSelector(selectHeatmapSettings);

  useEffect(() => {
    if (!canvasRef_local.current || !monitors.length) {
      console.log('SimpleHeatmap: No canvas or monitors -', {
        hasCanvas: !!canvasRef_local.current,
        monitorsLength: monitors.length
      });
      return;
    }

    const canvas = canvasRef_local.current;
    const ctx = canvas.getContext('2d');
    
    console.log('SimpleHeatmap: Canvas size:', canvas.width, 'x', canvas.height);
    console.log('SimpleHeatmap: View settings:', viewSettings);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get effective intensity
    const effectiveIntensity = intensity || heatmapSettings.intensity || 0.5;
    
    // Filter active monitors with positions
    const activeMonitors = monitors.filter(m => {
      return m.position && m.position.x !== undefined && m.position.y !== undefined;
    });
    
    console.log('SimpleHeatmap: Rendering', activeMonitors.length, 'monitors');
    console.log('SimpleHeatmap: Monitor positions:', activeMonitors.map(m => ({ 
      name: m.name, 
      x: m.position.x, 
      y: m.position.y 
    })));
    console.log('SimpleHeatmap: Effective intensity:', effectiveIntensity);
    
    if (activeMonitors.length === 0) {
      return;
    }
    
    // Apply view transformations
    ctx.save();
    ctx.translate(viewSettings.panX, viewSettings.panY);
    ctx.scale(viewSettings.zoom, viewSettings.zoom);
    
    // Draw a simple gradient for each monitor
    activeMonitors.forEach((monitor, index) => {
      const { x, y } = monitor.position;
      
      console.log(`SimpleHeatmap: Drawing monitor ${index + 1} at (${x}, ${y})`);
      
      // Create radial gradient
      const radius = 150; // Reduced radius for better visibility
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      
      // More visible colors for testing
      gradient.addColorStop(0, `rgba(255, 0, 0, 0.8)`); // Strong red center
      gradient.addColorStop(0.5, `rgba(255, 165, 0, 0.5)`); // Orange middle
      gradient.addColorStop(1, 'rgba(255, 255, 0, 0)'); // Transparent yellow edge
      
      // Draw the gradient
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      
      console.log(`SimpleHeatmap: Drew gradient at (${x - radius}, ${y - radius}) size ${radius * 2}x${radius * 2}`);
      
      // Debug: Draw a larger, more visible circle at monitor position
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Add text label
      ctx.fillStyle = 'black';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(monitor.name || `Monitor ${index + 1}`, x, y - 15);
    });
    
    ctx.restore();
    
    console.log('SimpleHeatmap: Render completed');
    
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