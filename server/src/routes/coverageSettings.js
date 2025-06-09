const express = require('express');
const { body, validationResult } = require('express-validator');
const CoverageSettings = require('../models/CoverageSettings');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Get global coverage settings
router.get('/', async (req, res) => {
  try {
    const settings = await CoverageSettings.getSettings();
    
    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    logger.error('Get coverage settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coverage settings',
    });
  }
});

// Update global coverage settings
router.put('/', [
  // Signal thresholds validation
  body('signalThresholds.excellent').optional().isFloat({ min: -100, max: 0 }).withMessage('Excellent threshold must be between -100 and 0 dBm'),
  body('signalThresholds.good').optional().isFloat({ min: -100, max: 0 }).withMessage('Good threshold must be between -100 and 0 dBm'),
  body('signalThresholds.fair').optional().isFloat({ min: -100, max: 0 }).withMessage('Fair threshold must be between -100 and 0 dBm'),
  body('signalThresholds.poor').optional().isFloat({ min: -100, max: 0 }).withMessage('Poor threshold must be between -100 and 0 dBm'),
  
  // Heatmap settings validation
  body('heatmapSettings.intensity').optional().isFloat({ min: 0, max: 1 }).withMessage('Intensity must be between 0 and 1'),
  body('heatmapSettings.radius').optional().isInt({ min: 5, max: 100 }).withMessage('Radius must be between 5 and 100'),
  body('heatmapSettings.blur').optional().isInt({ min: 0, max: 50 }).withMessage('Blur must be between 0 and 50'),
  
  // Default style validation
  body('defaultCoverageStyle.fillOpacity').optional().isFloat({ min: 0, max: 1 }).withMessage('Fill opacity must be between 0 and 1'),
  body('defaultCoverageStyle.strokeWidth').optional().isInt({ min: 1, max: 10 }).withMessage('Stroke width must be between 1 and 10'),
  
  // Calculation settings validation
  body('calculationSettings.interpolationMethod').optional().isIn(['linear', 'inverse-distance', 'kriging']).withMessage('Invalid interpolation method'),
  body('calculationSettings.samplingResolution').optional().isFloat({ min: 0.5, max: 5 }).withMessage('Sampling resolution must be between 0.5 and 5'),
  body('calculationSettings.maxInterpolationDistance').optional().isInt({ min: 10, max: 200 }).withMessage('Max interpolation distance must be between 10 and 200'),
], validate, async (req, res) => {
  try {
    // Custom validation for signal thresholds hierarchy
    if (req.body.signalThresholds) {
      const currentSettings = await CoverageSettings.getSettings();
      const newThresholds = { 
        ...currentSettings.signalThresholds.toObject(), 
        ...req.body.signalThresholds 
      };
      
      if (newThresholds.excellent < newThresholds.good ||
          newThresholds.good < newThresholds.fair ||
          newThresholds.fair < newThresholds.poor) {
        return res.status(400).json({
          success: false,
          error: 'Signal thresholds must be in descending order: excellent ≥ good ≥ fair ≥ poor',
        });
      }
    }
    
    const settings = await CoverageSettings.updateSettings(req.body);
    
    logger.info('Coverage settings updated', { 
      updates: Object.keys(req.body),
      modifiedBy: req.body.modifiedBy || 'api'
    });

    res.json({
      success: true,
      message: 'Coverage settings updated successfully',
      settings,
    });
  } catch (error) {
    logger.error('Update coverage settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update coverage settings',
    });
  }
});

// Reset coverage settings to defaults
router.post('/reset', async (req, res) => {
  try {
    // Delete existing settings to trigger default creation
    await CoverageSettings.deleteMany({});
    const settings = await CoverageSettings.getSettings();
    
    logger.info('Coverage settings reset to defaults');

    res.json({
      success: true,
      message: 'Coverage settings reset to defaults',
      settings,
    });
  } catch (error) {
    logger.error('Reset coverage settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset coverage settings',
    });
  }
});

// Get coverage settings version/history
router.get('/version', async (req, res) => {
  try {
    const settings = await CoverageSettings.findOne({}, 'version lastModified modifiedBy');
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Coverage settings not found',
      });
    }

    res.json({
      success: true,
      version: settings.version,
      lastModified: settings.lastModified,
      modifiedBy: settings.modifiedBy,
    });
  } catch (error) {
    logger.error('Get coverage settings version error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coverage settings version',
    });
  }
});

module.exports = router;