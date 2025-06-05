const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Location = require('../models/Location');
const Monitor = require('../models/Monitor');
const CoverageArea = require('../models/CoverageArea');
const auth = require('../middleware/auth');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/locations/hierarchy - Get location hierarchy
router.get('/hierarchy', auth, async (req, res) => {
  try {
    const hierarchy = await Location.getHierarchy();
    res.json(hierarchy);
  } catch (error) {
    console.error('Error fetching location hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch location hierarchy' });
  }
});

// GET /api/locations - Get all locations
router.get('/', auth, async (req, res) => {
  try {
    const locations = await Location.find().sort({ address: 1, buildingName: 1 });
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// GET /api/locations/:id - Get specific location
router.get('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid location ID')
], handleValidationErrors, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// POST /api/locations - Create new location
router.post('/', auth, [
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('buildingName').trim().notEmpty().withMessage('Building name is required'),
  body('floors').optional().isArray().withMessage('Floors must be an array'),
  body('floors.*.floorNumber').notEmpty().withMessage('Floor number is required'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], handleValidationErrors, async (req, res) => {
  try {
    const { address, buildingName, floors, metadata } = req.body;
    
    // Check if location already exists
    const existingLocation = await Location.findOne({ address, buildingName });
    if (existingLocation) {
      return res.status(409).json({ error: 'Location already exists' });
    }
    
    const location = new Location({
      address,
      buildingName,
      floors: floors || [],
      metadata: metadata || {}
    });
    
    await location.save();
    res.status(201).json(location);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// PUT /api/locations/:id - Update location
router.put('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid location ID'),
  body('address').optional().trim().notEmpty().withMessage('Address cannot be empty'),
  body('buildingName').optional().trim().notEmpty().withMessage('Building name cannot be empty'),
  body('floors').optional().isArray().withMessage('Floors must be an array'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], handleValidationErrors, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Update fields if provided
    const { address, buildingName, floors, metadata } = req.body;
    if (address) location.address = address;
    if (buildingName) location.buildingName = buildingName;
    if (floors) location.floors = floors;
    if (metadata) location.metadata = { ...location.metadata, ...metadata };
    
    await location.save();
    res.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// DELETE /api/locations/:id - Delete location
router.delete('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid location ID')
], handleValidationErrors, async (req, res) => {
  try {
    const locationId = req.params.id;
    
    // Check if any monitors are assigned to this location
    const assignedMonitors = await Monitor.countDocuments({ locationId });
    if (assignedMonitors > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete location with assigned monitors',
        assignedMonitors 
      });
    }
    
    // Delete associated coverage areas
    await CoverageArea.deleteMany({ locationId });
    
    // Delete the location
    const location = await Location.findByIdAndDelete(locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// GET /api/locations/:id/monitors - Get monitors on a specific floor
router.get('/:id/monitors', auth, [
  param('id').isMongoId().withMessage('Invalid location ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { floorId } = req.query;
    
    const query = { locationId: req.params.id };
    if (floorId) {
      query.floorId = floorId;
    }
    
    const monitors = await Monitor.find(query)
      .select('monitorId name position status lastHeartbeat')
      .sort({ name: 1 });
    
    res.json(monitors);
  } catch (error) {
    console.error('Error fetching monitors for location:', error);
    res.status(500).json({ error: 'Failed to fetch monitors' });
  }
});

// GET /api/locations/:id/coverage - Get coverage areas for a floor
router.get('/:id/coverage', auth, [
  param('id').isMongoId().withMessage('Invalid location ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { floorId } = req.query;
    
    if (!floorId) {
      return res.status(400).json({ error: 'Floor ID is required' });
    }
    
    const coverageAreas = await CoverageArea.findByFloor(req.params.id, floorId);
    res.json(coverageAreas);
  } catch (error) {
    console.error('Error fetching coverage areas:', error);
    res.status(500).json({ error: 'Failed to fetch coverage areas' });
  }
});

// POST /api/locations/:id/floors - Add or update a floor
router.post('/:id/floors', auth, [
  param('id').isMongoId().withMessage('Invalid location ID'),
  body('floorNumber').notEmpty().withMessage('Floor number is required'),
  body('floorName').optional().trim()
], handleValidationErrors, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const { floorNumber, floorName } = req.body;
    location.setFloor({ floorNumber, floorName });
    
    await location.save();
    res.json(location);
  } catch (error) {
    console.error('Error adding floor:', error);
    res.status(500).json({ error: 'Failed to add floor' });
  }
});

// DELETE /api/locations/:id/floors/:floorId - Remove a floor
router.delete('/:id/floors/:floorId', auth, [
  param('id').isMongoId().withMessage('Invalid location ID'),
  param('floorId').isMongoId().withMessage('Invalid floor ID')
], handleValidationErrors, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Check if any monitors are on this floor
    const monitorsOnFloor = await Monitor.countDocuments({ 
      locationId: req.params.id,
      floorId: req.params.floorId 
    });
    
    if (monitorsOnFloor > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete floor with assigned monitors',
        monitorsOnFloor 
      });
    }
    
    // Remove the floor
    location.floors = location.floors.filter(
      floor => floor._id.toString() !== req.params.floorId
    );
    
    await location.save();
    
    // Delete associated coverage areas
    await CoverageArea.deleteMany({ 
      locationId: req.params.id,
      floorId: req.params.floorId 
    });
    
    res.json({ message: 'Floor deleted successfully' });
  } catch (error) {
    console.error('Error deleting floor:', error);
    res.status(500).json({ error: 'Failed to delete floor' });
  }
});

module.exports = router;