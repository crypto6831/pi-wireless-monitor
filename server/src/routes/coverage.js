const express = require('express');
const { body, validationResult } = require('express-validator');
const CoverageArea = require('../models/CoverageArea');
const Monitor = require('../models/Monitor');
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

// Get all coverage areas with optional filtering
router.get('/', async (req, res) => {
  try {
    const { locationId, floorId, monitorId, coverageType } = req.query;
    
    const filter = {};
    if (locationId) filter.locationId = locationId;
    if (floorId) filter.floorId = floorId;
    if (monitorId) filter.monitorId = monitorId;
    if (coverageType) filter.coverageType = coverageType;

    const coverageAreas = await CoverageArea.find(filter)
      .populate('monitorId', 'monitorId name status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: coverageAreas.length,
      coverageAreas,
    });
  } catch (error) {
    logger.error('Get coverage areas error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coverage areas',
    });
  }
});

// Get specific coverage area by ID
router.get('/:id', async (req, res) => {
  try {
    const coverageArea = await CoverageArea.findById(req.params.id)
      .populate('monitorId', 'monitorId name status');

    if (!coverageArea) {
      return res.status(404).json({
        success: false,
        error: 'Coverage area not found',
      });
    }

    res.json({
      success: true,
      coverageArea,
    });
  } catch (error) {
    logger.error('Get coverage area error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coverage area',
    });
  }
});

// Update coverage area
router.put('/:id', [
  body('coverageType').optional().isIn(['circle', 'polygon', 'rectangle']).withMessage('Invalid coverage type'),
  body('center').optional().isObject().withMessage('Center must be an object'),
  body('radius').optional().isNumeric().withMessage('Radius must be a number'),
  body('points').optional().isArray().withMessage('Points must be an array'),
  body('bounds').optional().isObject().withMessage('Bounds must be an object'),
  body('signalThresholds').optional().isObject().withMessage('Signal thresholds must be an object'),
  body('signalThresholds.excellent').optional().isNumeric().withMessage('Excellent threshold must be a number'),
  body('signalThresholds.good').optional().isNumeric().withMessage('Good threshold must be a number'),
  body('signalThresholds.fair').optional().isNumeric().withMessage('Fair threshold must be a number'),
  body('signalThresholds.poor').optional().isNumeric().withMessage('Poor threshold must be a number'),
  body('style').optional().isObject().withMessage('Style must be an object'),
], validate, async (req, res) => {
  try {
    const coverageArea = await CoverageArea.findById(req.params.id);
    
    if (!coverageArea) {
      return res.status(404).json({
        success: false,
        error: 'Coverage area not found',
      });
    }

    // Update fields
    const allowedUpdates = [
      'coverageType', 'center', 'radius', 'points', 'bounds', 
      'signalThresholds', 'style', 'name', 'description'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        coverageArea[field] = req.body[field];
      }
    });

    await coverageArea.save();
    
    logger.info(`Coverage area updated: ${coverageArea._id}`);

    res.json({
      success: true,
      message: 'Coverage area updated successfully',
      coverageArea,
    });
  } catch (error) {
    logger.error('Update coverage area error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update coverage area',
    });
  }
});

// Delete coverage area
router.delete('/:id', async (req, res) => {
  try {
    const coverageArea = await CoverageArea.findById(req.params.id);
    
    if (!coverageArea) {
      return res.status(404).json({
        success: false,
        error: 'Coverage area not found',
      });
    }

    await CoverageArea.findByIdAndDelete(req.params.id);
    
    logger.info(`Coverage area deleted: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Coverage area deleted successfully',
    });
  } catch (error) {
    logger.error('Delete coverage area error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete coverage area',
    });
  }
});

module.exports = router;