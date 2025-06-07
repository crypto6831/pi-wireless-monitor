const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pi-monitor';

// Location model (simplified)
const LocationSchema = new mongoose.Schema({
  address: String,
  buildingName: String,
  floors: [{
    floorNumber: String,
    floorName: String,
    floorPlan: {
      fileName: String,
      filePath: String,
      fileSize: Number,
      mimeType: String,
      dimensions: {
        width: Number,
        height: Number
      },
      thumbnail: String,
      uploadedAt: Date
    }
  }]
}, { timestamps: true });

const Location = mongoose.model('Location', LocationSchema);

async function fixFloorPlanDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all locations with floors that have floorPlan.uploadedAt but missing fileName
    const locations = await Location.find({
      'floors.floorPlan.uploadedAt': { $exists: true },
      'floors.floorPlan.fileName': { $exists: false }
    });

    console.log(`Found ${locations.length} locations with broken floor plans`);

    // Check what files exist in the uploads directory
    const uploadsDir = path.join(__dirname, 'uploads/floor-plans');
    let files = [];
    try {
      files = fs.readdirSync(uploadsDir);
      console.log('Available floor plan files:', files);
    } catch (error) {
      console.log('Could not read uploads directory:', error.message);
    }

    for (const location of locations) {
      console.log(`\nProcessing location: ${location.address} - ${location.buildingName}`);
      
      for (const floor of location.floors) {
        if (floor.floorPlan && floor.floorPlan.uploadedAt && !floor.floorPlan.fileName) {
          console.log(`  Floor ${floor.floorNumber} has broken floor plan from ${floor.floorPlan.uploadedAt}`);
          
          // Try to find matching file based on location/floor info
          const expectedPattern = location.address.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + 
                                '_' + location.buildingName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + 
                                '_floor-' + floor.floorNumber.toString().replace(/[^a-zA-Z0-9]/g, '-');
          
          const matchingFile = files.find(file => file.includes(expectedPattern));
          
          if (matchingFile) {
            console.log(`    Found matching file: ${matchingFile}`);
            
            // Get file stats
            const filePath = path.join(uploadsDir, matchingFile);
            const stats = fs.statSync(filePath);
            const ext = path.extname(matchingFile).toLowerCase();
            
            let mimeType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
            else if (ext === '.gif') mimeType = 'image/gif';
            else if (ext === '.webp') mimeType = 'image/webp';
            
            // Try to get image dimensions using sharp if available
            let dimensions = { width: 800, height: 600 }; // Default fallback
            try {
              const sharp = require('sharp');
              const metadata = await sharp(filePath).metadata();
              dimensions = { width: metadata.width, height: metadata.height };
            } catch (error) {
              console.log('    Could not get image dimensions, using defaults');
            }

            // Update the floor plan record
            floor.floorPlan = {
              ...floor.floorPlan,
              fileName: matchingFile,
              filePath: `/uploads/floor-plans/${matchingFile}`,
              fileSize: stats.size,
              mimeType: mimeType,
              dimensions: dimensions,
              thumbnail: `/uploads/thumbnails/thumb_300x300_${matchingFile}` // Assuming thumbnail exists
            };
            
            console.log(`    Updated floor plan record with fileName: ${matchingFile}`);
          } else {
            console.log(`    No matching file found for pattern: ${expectedPattern}`);
          }
        }
      }
      
      // Save the updated location
      await location.save();
      console.log(`  Saved location: ${location._id}`);
    }

    console.log('\nDatabase fix completed!');
    
  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixFloorPlanDatabase();