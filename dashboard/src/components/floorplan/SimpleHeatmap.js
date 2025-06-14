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
    
    if (activeMonitors.length === 0) {
      return;
    }
    
    // Apply view transformations
    ctx.save();
    ctx.translate(viewSettings.panX, viewSettings.panY);
    ctx.scale(viewSettings.zoom, viewSettings.zoom);
    
    // Draw signal coverage for each monitor
    activeMonitors.forEach((monitor, index) => {
      const { x, y } = monitor.position;
      
      // Get signal strength from monitor data
      const signalStrength = monitor.wifiConnection?.rssi || -70;
      
      // Calculate coverage radius based on signal strength
      // Strong signal (-30 to -50 dBm): larger radius
      // Weak signal (-80+ dBm): smaller radius
      let baseRadius = 200;
      if (signalStrength > -50) {
        baseRadius = 250;
      } else if (signalStrength > -60) {
        baseRadius = 200;
      } else if (signalStrength > -70) {
        baseRadius = 150;
      } else {
        baseRadius = 100;
      }
      
      // Create radial gradient for signal coverage
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius);
      
      // Signal strength color mapping
      let centerColor, middleColor, edgeColor;
      if (signalStrength > signalThresholds.excellent) {
        // Excellent signal - Green
        centerColor = `rgba(76, 175, 80, ${effectiveIntensity * 0.8})`;
        middleColor = `rgba(139, 195, 74, ${effectiveIntensity * 0.5})`;
        edgeColor = `rgba(139, 195, 74, 0)`;
      } else if (signalStrength > signalThresholds.good) {
        // Good signal - Light Green
        centerColor = `rgba(139, 195, 74, ${effectiveIntensity * 0.7})`;
        middleColor = `rgba(205, 220, 57, ${effectiveIntensity * 0.4})`;
        edgeColor = `rgba(205, 220, 57, 0)`;
      } else if (signalStrength > signalThresholds.fair) {
        // Fair signal - Yellow
        centerColor = `rgba(255, 235, 59, ${effectiveIntensity * 0.6})`;
        middleColor = `rgba(255, 193, 7, ${effectiveIntensity * 0.3})`;
        edgeColor = `rgba(255, 193, 7, 0)`;
      } else if (signalStrength > signalThresholds.poor) {
        // Poor signal - Orange
        centerColor = `rgba(255, 152, 0, ${effectiveIntensity * 0.5})`;
        middleColor = `rgba(255, 183, 77, ${effectiveIntensity * 0.3})`;
        edgeColor = `rgba(255, 183, 77, 0)`;
      } else {
        // Very poor signal - Red
        centerColor = `rgba(244, 67, 54, ${effectiveIntensity * 0.4})`;
        middleColor = `rgba(229, 115, 115, ${effectiveIntensity * 0.2})`;
        edgeColor = `rgba(229, 115, 115, 0)`;
      }
      
      gradient.addColorStop(0, centerColor);
      gradient.addColorStop(0.6, middleColor);
      gradient.addColorStop(1, edgeColor);
      
      // Draw the coverage area
      ctx.fillStyle = gradient;
      ctx.fillRect(x - baseRadius, y - baseRadius, baseRadius * 2, baseRadius * 2);
    });
    
    ctx.restore();
    
  }, [monitors, viewSettings, intensity, heatmapSettings, signalThresholds]);

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