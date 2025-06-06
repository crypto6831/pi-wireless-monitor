const express = require('express');
const router = express.Router();
const { param, body, validationResult } = require('express-validator');
const Location = require('../models/Location');
const { authenticateMonitor } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const fileStorage = require('../services/fileStorage');
const path = require('path');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST /api/locations/:id/floorplan - Upload floor plan
router.post('/:id/floorplan', 
  authenticateMonitor,
  upload.single('floorPlan'),
  handleMulterError,
  [
    param('id').isMongoId().withMessage('Invalid location ID'),
    body('floorId').notEmpty().withMessage('Floor ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const location = await Location.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }
      
      const floor = location.floors.find(f => f._id.toString() === req.body.floorId);
      if (!floor) {
        return res.status(404).json({ error: 'Floor not found' });
      }
      
      // Delete old floor plan if exists
      if (floor.floorPlan && floor.floorPlan.fileName) {
        try {
          await fileStorage.deleteFloorPlan(floor.floorPlan.fileName);
        } catch (error) {
          console.error('Error deleting old floor plan:', error);
        }
      }
      
      // Save new floor plan
      const fileInfo = await fileStorage.saveFloorPlan(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        {
          address: location.address,
          building: location.buildingName,
          floor: floor.floorNumber
        }
      );
      
      // Generate thumbnail
      const thumbnail = await fileStorage.generateThumbnail(fileInfo.fileName);
      
      // Update floor plan info in database
      floor.floorPlan = {
        ...fileInfo,
        thumbnail: thumbnail.thumbPath
      };
      
      await location.save();
      
      res.json({
        message: 'Floor plan uploaded successfully',
        floorPlan: floor.floorPlan
      });
    } catch (error) {
      console.error('Error uploading floor plan:', error);
      res.status(500).json({ error: 'Failed to upload floor plan' });
    }
  }
);

// GET /api/locations/:id/floorplan - Get floor plan
router.get('/:id/floorplan', authenticateMonitor, [
  param('id').isMongoId().withMessage('Invalid location ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { floorId } = req.query;
    
    if (!floorId) {
      return res.status(400).json({ error: 'Floor ID is required' });
    }
    
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const floor = location.floors.find(f => f._id.toString() === floorId);
    if (!floor || !floor.floorPlan) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }
    
    res.json({
      floorPlan: floor.floorPlan,
      location: {
        address: location.address,
        buildingName: location.buildingName,
        floor: floor.floorNumber
      }
    });
  } catch (error) {
    console.error('Error fetching floor plan:', error);
    res.status(500).json({ error: 'Failed to fetch floor plan' });
  }
});

// GET /api/locations/:id/floorplan/image - Get floor plan image file
router.get('/:id/floorplan/image', authenticateMonitor, [
  param('id').isMongoId().withMessage('Invalid location ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { floorId } = req.query;
    
    if (!floorId) {
      return res.status(400).json({ error: 'Floor ID is required' });
    }
    
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const floor = location.floors.find(f => f._id.toString() === floorId);
    if (!floor || !floor.floorPlan || !floor.floorPlan.fileName) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }
    
    const file = await fileStorage.getFloorPlan(floor.floorPlan.fileName);
    
    // Set appropriate headers
    res.set({
      'Content-Type': floor.floorPlan.mimeType,
      'Content-Length': file.size,
      'Cache-Control': 'public, max-age=3600'
    });
    
    res.send(file.buffer);
  } catch (error) {
    console.error('Error serving floor plan image:', error);
    res.status(500).json({ error: 'Failed to serve floor plan image' });
  }
});

// PUT /api/locations/:id/floorplan - Update floor plan
router.put('/:id/floorplan',
  authenticateMonitor,
  upload.single('floorPlan'),
  handleMulterError,
  [
    param('id').isMongoId().withMessage('Invalid location ID'),
    body('floorId').notEmpty().withMessage('Floor ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const location = await Location.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }
      
      const floor = location.floors.find(f => f._id.toString() === req.body.floorId);
      if (!floor) {
        return res.status(404).json({ error: 'Floor not found' });
      }
      
      // Create backup of old floor plan
      if (floor.floorPlan && floor.floorPlan.fileName) {
        try {
          await fileStorage.createBackup(floor.floorPlan.fileName);
          await fileStorage.deleteFloorPlan(floor.floorPlan.fileName);
        } catch (error) {
          console.error('Error backing up old floor plan:', error);
        }
      }
      
      // Save new floor plan
      const fileInfo = await fileStorage.saveFloorPlan(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        {
          address: location.address,
          building: location.buildingName,
          floor: floor.floorNumber
        }
      );
      
      // Generate thumbnail
      const thumbnail = await fileStorage.generateThumbnail(fileInfo.fileName);
      
      // Update floor plan info
      floor.floorPlan = {
        ...fileInfo,
        thumbnail: thumbnail.thumbPath
      };
      
      await location.save();
      
      res.json({
        message: 'Floor plan updated successfully',
        floorPlan: floor.floorPlan
      });
    } catch (error) {
      console.error('Error updating floor plan:', error);
      res.status(500).json({ error: 'Failed to update floor plan' });
    }
  }
);

// DELETE /api/locations/:id/floorplan - Delete floor plan
router.delete('/:id/floorplan', authenticateMonitor, [
  param('id').isMongoId().withMessage('Invalid location ID'),
  body('floorId').notEmpty().withMessage('Floor ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const floor = location.floors.find(f => f._id.toString() === req.body.floorId);
    if (!floor || !floor.floorPlan) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }
    
    // Create backup before deletion
    if (floor.floorPlan.fileName) {
      try {
        await fileStorage.createBackup(floor.floorPlan.fileName);
        await fileStorage.deleteFloorPlan(floor.floorPlan.fileName);
      } catch (error) {
        console.error('Error deleting floor plan file:', error);
      }
    }
    
    // Remove floor plan info from database
    floor.floorPlan = undefined;
    await location.save();
    
    res.json({ message: 'Floor plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting floor plan:', error);
    res.status(500).json({ error: 'Failed to delete floor plan' });
  }
});

module.exports = router;