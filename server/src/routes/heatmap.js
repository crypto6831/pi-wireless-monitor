const router = require('express').Router();
const Monitor = require('../models/Monitor');
const CoverageSettings = require('../models/CoverageSettings');
const { 
  generateHeatmapData,
  calculateSignalAtPoint 
} = require('../services/signalPropagationService');

/**
 * @route   GET /api/heatmap/calculate
 * @desc    Calculate heatmap data for a floor
 * @access  Public
 */
router.get('/calculate', async (req, res) => {
  try {
    const { 
      locationId, 
      floorId, 
      width = 800, 
      height = 600,
      resolution = 10,
      method = 'itu-indoor'
    } = req.query;

    if (!locationId || !floorId) {
      return res.status(400).json({
        success: false,
        error: 'locationId and floorId are required'
      });
    }

    // Get monitors for this floor
    const monitors = await Monitor.find({
      locationId,
      floorId,
      status: 'active'
    }).lean();

    if (monitors.length === 0) {
      return res.json({
        success: true,
        data: {
          grid: [],
          bounds: { minX: 0, minY: 0, maxX: width, maxY: height },
          monitors: []
        }
      });
    }

    // Get coverage settings
    const settings = await CoverageSettings.getSettings();

    // Generate heatmap data
    const heatmapData = await generateHeatmapData(
      monitors,
      { width: Number(width), height: Number(height) },
      { zoom: 1, panX: 0, panY: 0 }
    );

    res.json({
      success: true,
      data: {
        ...heatmapData,
        monitors: monitors.map(m => ({
          id: m._id,
          name: m.name,
          position: m.position,
          wifiConnection: m.wifiConnection
        })),
        settings: {
          method,
          resolution: Number(resolution),
          thresholds: settings.signalThresholds
        }
      }
    });
  } catch (error) {
    console.error('Heatmap calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/heatmap/point
 * @desc    Calculate signal strength at a specific point
 * @access  Public
 */
router.post('/point', async (req, res) => {
  try {
    const { point, locationId, floorId, method = 'itu-indoor' } = req.body;

    if (!point || !locationId || !floorId) {
      return res.status(400).json({
        success: false,
        error: 'point, locationId, and floorId are required'
      });
    }

    // Get monitors for this floor
    const monitors = await Monitor.find({
      locationId,
      floorId,
      status: 'active'
    }).lean();

    // Calculate signal from each monitor
    const signals = await Promise.all(monitors.map(async (monitor) => {
      const signal = await calculateSignalAtPoint(monitor, point, { method });
      return {
        monitorId: monitor._id,
        monitorName: monitor.name,
        signal,
        distance: Math.sqrt(
          Math.pow(point.x - monitor.position.x, 2) + 
          Math.pow(point.y - monitor.position.y, 2)
        )
      };
    }));

    // Find strongest signal
    const strongest = signals.reduce((prev, curr) => 
      curr.signal > prev.signal ? curr : prev
    , { signal: -100 });

    res.json({
      success: true,
      data: {
        point,
        signals,
        strongest,
        totalSignal: signals.reduce((sum, s) => sum + Math.pow(10, s.signal / 10), 0)
      }
    });
  } catch (error) {
    console.error('Point calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/heatmap/export
 * @desc    Export heatmap as image
 * @access  Public
 */
router.get('/export/:locationId/:floorId', async (req, res) => {
  try {
    const { locationId, floorId } = req.params;
    const { format = 'png', width = 1920, height = 1080 } = req.query;

    // This would require canvas or sharp to generate image server-side
    // For now, return instructions for client-side export
    
    res.json({
      success: true,
      message: 'Heatmap export should be done client-side using canvas.toBlob()',
      instructions: {
        1: 'Generate heatmap on client canvas',
        2: 'Use canvas.toBlob() to get image data',
        3: 'Download using URL.createObjectURL()'
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;