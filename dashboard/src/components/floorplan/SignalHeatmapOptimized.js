import React, { useRef, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSignalThresholds, selectHeatmapSettings } from '../../store/slices/coverageSettingsSlice';

const SignalHeatmapOptimized = ({ monitors, viewSettings, canvasRef, intensity = 0.5 }) => {
  const canvasRef_local = useRef(null);
  const signalThresholds = useSelector(selectSignalThresholds);
  const heatmapSettings = useSelector(selectHeatmapSettings);
  const coverageSettings = useSelector(state => state.coverageSettings);

  // Pre-calculate heatmap data in world coordinates
  const heatmapData = useMemo(() => {
    if (!monitors.length) return null;

    const activeMonitors = monitors.filter(m => m.position && m.status === 'active');
    if (activeMonitors.length === 0) return null;

    // Fixed parameters for consistent rendering
    const worldGridSize = 15; // Grid size in world coordinates
    const worldWidth = 2000; // Assume max world size
    const worldHeight = 1500;
    
    // Path loss parameters
    const pathLossExponent = coverageSettings?.pathLossExponent || 3.0;
    
    // Create heat data array
    const heatData = [];
    
    for (let x = 0; x < worldWidth; x += worldGridSize) {
      for (let y = 0; y < worldHeight; y += worldGridSize) {
        let maxSignal = -100;
        
        // Calculate signal from all monitors
        activeMonitors.forEach(monitor => {
          const distance = Math.sqrt(
            Math.pow(x - monitor.position.x, 2) + 
            Math.pow(y - monitor.position.y, 2)
          );
          
          // Use actual monitor data or defaults
          const txPower = monitor.wifiConnection?.rssi ? 
            monitor.wifiConnection.rssi + 30 : -30;
          const frequency = monitor.wifiConnection?.frequency || 2437;
          
          // ITU-R P.1238 Indoor Path Loss
          const L0 = 20 * Math.log10(frequency) - 28;
          const Ld = 10 * pathLossExponent * Math.log10(Math.max(distance, 1));
          const pathLoss = L0 + Ld;
          
          const signal = txPower - pathLoss;
          maxSignal = Math.max(maxSignal, signal);
        });
        
        if (maxSignal > -100) {
          heatData.push({ x, y, signal: maxSignal });
        }
      }
    }
    
    return { data: heatData, gridSize: worldGridSize };
  }, [monitors, coverageSettings]);

  useEffect(() => {
    if (!canvasRef_local.current || !canvasRef?.current || !heatmapData) return;

    const canvas = canvasRef_local.current;
    const ctx = canvas.getContext('2d');
    const { zoom, panX, panY } = viewSettings;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Use global heatmap intensity if not overridden
    const effectiveIntensity = (heatmapSettings.enabled !== false) ? 
      (intensity || heatmapSettings.intensity) : intensity;

    // Render pre-calculated heatmap data
    const { data, gridSize } = heatmapData;
    
    data.forEach(point => {
      let color = '';
      let alpha = 0;
      
      if (point.signal > signalThresholds.excellent) {
        color = '76, 175, 80'; // Green
        alpha = 0.8;
      } else if (point.signal > signalThresholds.good) {
        color = '139, 195, 74'; // Light green
        alpha = 0.7;
      } else if (point.signal > signalThresholds.fair) {
        color = '255, 235, 59'; // Yellow
        alpha = 0.6;
      } else if (point.signal > signalThresholds.poor) {
        color = '255, 152, 0'; // Orange
        alpha = 0.5;
      } else if (point.signal > -90) {
        color = '244, 67, 54'; // Red
        alpha = 0.4;
      }
      
      if (alpha > 0) {
        // Create gradient for smooth transitions
        const gradient = ctx.createRadialGradient(
          point.x + gridSize/2, 
          point.y + gridSize/2, 
          0,
          point.x + gridSize/2, 
          point.y + gridSize/2, 
          gridSize
        );
        gradient.addColorStop(0, `rgba(${color}, ${alpha * effectiveIntensity})`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(point.x, point.y, gridSize * 2, gridSize * 2);
      }
    });

    ctx.restore();
  }, [heatmapData, viewSettings, intensity, canvasRef, signalThresholds, heatmapSettings]);

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

export default SignalHeatmapOptimized;