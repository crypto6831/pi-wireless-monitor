const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

class FileStorageService {
  constructor() {
    this.baseDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    this.floorPlansDir = path.join(this.baseDir, 'floor-plans');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.imageMaxWidth = 2000;
    this.imageMaxHeight = 2000;
    
    // Ensure directories exist
    this.ensureDirectories();
  }
  
  async ensureDirectories() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(this.floorPlansDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }
  
  generateFileName(originalName, address, building, floor) {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const hash = crypto.createHash('md5')
      .update(`${address}-${building}-${floor}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    
    // Clean and format the filename
    const cleanAddress = address.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const cleanBuilding = building.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const cleanFloor = floor.toString().replace(/[^a-zA-Z0-9]/g, '-');
    
    return `${cleanAddress}_${cleanBuilding}_floor-${cleanFloor}_${hash}${ext}`;
  }
  
  async saveFloorPlan(fileBuffer, mimetype, originalName, metadata) {
    try {
      // Validate file
      if (!this.allowedMimeTypes.includes(mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      }
      
      if (fileBuffer.length > this.maxFileSize) {
        throw new Error('File size exceeds maximum allowed size of 10MB.');
      }
      
      const { address, building, floor } = metadata;
      const fileName = this.generateFileName(originalName, address, building, floor);
      const filePath = path.join(this.floorPlansDir, fileName);
      
      // Process image with sharp
      const image = sharp(fileBuffer);
      const imageMetadata = await image.metadata();
      
      // Resize if necessary
      if (imageMetadata.width > this.imageMaxWidth || imageMetadata.height > this.imageMaxHeight) {
        await image
          .resize(this.imageMaxWidth, this.imageMaxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toFile(filePath);
      } else {
        await fs.writeFile(filePath, fileBuffer);
      }
      
      // Get final image dimensions
      const finalMetadata = await sharp(filePath).metadata();
      
      return {
        fileName,
        filePath: `/uploads/floor-plans/${fileName}`,
        fileSize: (await fs.stat(filePath)).size,
        mimeType: mimetype,
        dimensions: {
          width: finalMetadata.width,
          height: finalMetadata.height
        }
      };
    } catch (error) {
      console.error('Error saving floor plan:', error);
      throw error;
    }
  }
  
  async deleteFloorPlan(fileName) {
    try {
      const filePath = path.join(this.floorPlansDir, fileName);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting floor plan:', error);
      throw error;
    }
  }
  
  async getFloorPlan(fileName) {
    try {
      console.log('FileStorage.getFloorPlan called with fileName:', fileName);
      console.log('Base directory:', this.baseDir);
      console.log('Floor plans directory:', this.floorPlansDir);
      
      const filePath = path.join(this.floorPlansDir, fileName);
      console.log('Full file path:', filePath);
      
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      console.log('File exists:', exists);
      
      if (!exists) {
        // List all files in the directory to help debug
        try {
          const files = await fs.readdir(this.floorPlansDir);
          console.log('Files in floor plans directory:', files);
        } catch (listError) {
          console.log('Could not list directory contents:', listError.message);
        }
        throw new Error('Floor plan not found');
      }
      
      const fileBuffer = await fs.readFile(filePath);
      const stats = await fs.stat(filePath);
      
      console.log('Successfully read file, size:', stats.size);
      
      return {
        buffer: fileBuffer,
        size: stats.size,
        path: filePath
      };
    } catch (error) {
      console.error('Error getting floor plan:', error);
      throw error;
    }
  }
  
  async createBackup(fileName) {
    try {
      const sourcePath = path.join(this.floorPlansDir, fileName);
      const backupDir = path.join(this.baseDir, 'backups', 'floor-plans');
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${timestamp}_${fileName}`;
      const backupPath = path.join(backupDir, backupName);
      
      await fs.copyFile(sourcePath, backupPath);
      
      return {
        backupName,
        backupPath
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }
  
  async restoreFromBackup(backupName, originalFileName) {
    try {
      const backupPath = path.join(this.baseDir, 'backups', 'floor-plans', backupName);
      const restorePath = path.join(this.floorPlansDir, originalFileName);
      
      await fs.copyFile(backupPath, restorePath);
      
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }
  
  // Generate a thumbnail for the floor plan
  async generateThumbnail(fileName, width = 300, height = 300) {
    try {
      const sourcePath = path.join(this.floorPlansDir, fileName);
      const thumbDir = path.join(this.baseDir, 'thumbnails');
      await fs.mkdir(thumbDir, { recursive: true });
      
      const thumbName = `thumb_${width}x${height}_${fileName}`;
      const thumbPath = path.join(thumbDir, thumbName);
      
      await sharp(sourcePath)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(thumbPath);
      
      return {
        thumbName,
        thumbPath: `/uploads/thumbnails/${thumbName}`
      };
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw error;
    }
  }
}

module.exports = new FileStorageService();