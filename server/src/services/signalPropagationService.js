const CoverageSettings = require('../models/CoverageSettings');

/**
 * Signal Propagation Service
 * Implements various signal propagation models for accurate WiFi coverage prediction
 */

// Physical constants
const SPEED_OF_LIGHT = 299792458; // m/s

/**
 * ITU-R P.1238 Indoor Path Loss Model
 * More accurate for indoor WiFi propagation
 * 
 * @param {number} frequency - Frequency in MHz
 * @param {number} distance - Distance in meters
 * @param {number} floors - Number of floors between transmitter and receiver
 * @param {object} environment - Environment parameters
 * @returns {number} Path loss in dB
 */
function ituIndoorPathLoss(frequency, distance, floors = 0, environment = {}) {
  // Environment-specific parameters
  const params = {
    office: { n: 3.0, Lf: 15.0 },      // Office environment
    residential: { n: 2.8, Lf: 10.0 }, // Residential
    commercial: { n: 2.2, Lf: 12.0 }, // Commercial/retail
    industrial: { n: 2.1, Lf: 8.0 },  // Industrial/warehouse
  };

  const env = params[environment.type] || params.office;
  
  // Use custom path loss exponent if provided
  const pathLossExponent = environment.n || env.n;
  
  // Base path loss at 1 meter
  const L0 = 20 * Math.log10(frequency) - 28;
  
  // Distance path loss
  const Ld = 10 * pathLossExponent * Math.log10(Math.max(distance, 1));
  
  // Floor penetration loss
  const floorLoss = environment.floorLoss !== undefined ? environment.floorLoss : env.Lf;
  const Lfloor = floors * floorLoss;
  
  // Additional losses (walls, furniture, etc.)
  const Ladditional = environment.wallLoss || 0;
  
  return L0 + Ld + Lfloor + Ladditional;
}

/**
 * Log-Distance Path Loss Model with shadowing
 * Simpler but still effective model
 * 
 * @param {number} frequency - Frequency in MHz
 * @param {number} distance - Distance in meters
 * @param {object} params - Model parameters
 * @returns {number} Path loss in dB
 */
function logDistancePathLoss(frequency, distance, params = {}) {
  const {
    n = 3.0,          // Path loss exponent (2 for free space, 3-4 for indoor)
    d0 = 1,           // Reference distance (meters)
    PL_d0 = 40,       // Path loss at reference distance
    shadowStdDev = 4, // Shadow fading standard deviation
  } = params;
  
  if (distance <= 0) return 0;
  
  // Basic path loss
  const pathLoss = PL_d0 + 10 * n * Math.log10(distance / d0);
  
  // Add shadow fading (optional)
  const shadowFading = params.includeShadowing ? 
    shadowStdDev * (Math.random() - 0.5) * 2 : 0;
  
  return pathLoss + shadowFading;
}

/**
 * Multi-Wall Model (MWM)
 * Accounts for wall attenuation explicitly
 * 
 * @param {number} frequency - Frequency in MHz
 * @param {number} distance - Distance in meters
 * @param {object} obstacles - Obstacle information
 * @returns {number} Path loss in dB
 */
function multiWallModel(frequency, distance, obstacles = {}) {
  const {
    thinWalls = 0,      // Number of thin walls (drywall)
    thickWalls = 0,     // Number of thick walls (concrete)
    floors = 0,         // Number of floors
    glass = 0,          // Number of glass panels
  } = obstacles;
  
  // Base free space path loss
  const FSPL = 20 * Math.log10(distance) + 20 * Math.log10(frequency) - 27.55;
  
  // Wall attenuation values (dB)
  const attenuation = {
    thinWall: 3,    // Drywall, wood
    thickWall: 15,  // Concrete, brick
    floor: 20,      // Floor/ceiling
    glass: 2,       // Glass window/door
  };
  
  const totalAttenuation = 
    thinWalls * attenuation.thinWall +
    thickWalls * attenuation.thickWall +
    floors * attenuation.floor +
    glass * attenuation.glass;
  
  return FSPL + totalAttenuation;
}

/**
 * Calculate signal strength at a point from a monitor
 * 
 * @param {object} monitor - Monitor object with position and signal info
 * @param {object} point - Point coordinates {x, y}
 * @param {object} settings - Coverage calculation settings
 * @returns {number} Signal strength in dBm
 */
async function calculateSignalAtPoint(monitor, point, settings = {}) {
  // Get global coverage settings if not provided
  const coverageSettings = settings.coverageSettings || await CoverageSettings.getSettings();
  
  const {
    txPower = coverageSettings.txPower || -30,
    frequency = monitor.wifiConnection?.frequency || 2437,
    method = coverageSettings.propagationModel || 'itu-indoor',
  } = settings;
  
  // Calculate distance in meters
  const distance = Math.sqrt(
    Math.pow(point.x - monitor.position.x, 2) + 
    Math.pow(point.y - monitor.position.y, 2)
  );
  
  // Use actual monitor signal if available
  const baseTxPower = monitor.wifiConnection?.rssi ? 
    monitor.wifiConnection.rssi + 30 : txPower; // Estimate TX power from received signal
  
  // Set up environment parameters from coverage settings
  const environment = {
    type: coverageSettings.environmentType,
    wallLoss: coverageSettings.wallLoss,
    floorLoss: coverageSettings.floorLoss,
    n: coverageSettings.pathLossExponent,
    obstacles: settings.obstacles || {}
  };
  
  // Calculate path loss based on selected method
  let pathLoss;
  switch (method) {
    case 'itu-indoor':
      pathLoss = ituIndoorPathLoss(frequency, distance, 0, environment);
      break;
    case 'log-distance':
      pathLoss = logDistancePathLoss(frequency, distance, {
        n: coverageSettings.pathLossExponent,
        d0: 1,
        PL_d0: 40,
        shadowStdDev: 4,
        includeShadowing: false
      });
      break;
    case 'multi-wall':
      pathLoss = multiWallModel(frequency, distance, environment.obstacles || {});
      break;
    default:
      pathLoss = ituIndoorPathLoss(frequency, distance, 0, environment);
  }
  
  // Calculate received signal strength
  const rssi = baseTxPower - pathLoss;
  
  return rssi;
}

/**
 * Interpolate signal strength across a grid using selected method
 * 
 * @param {array} monitors - Array of monitor objects
 * @param {object} bounds - Area bounds {minX, minY, maxX, maxY}
 * @param {object} settings - Interpolation settings
 * @returns {array} 2D array of signal strengths
 */
async function interpolateSignalGrid(monitors, bounds, settings = {}) {
  const coverageSettings = await CoverageSettings.getSettings();
  const {
    resolution = coverageSettings.calculationSettings.samplingResolution,
    method = coverageSettings.calculationSettings.interpolationMethod,
    maxDistance = coverageSettings.calculationSettings.maxInterpolationDistance,
  } = settings;
  
  const gridWidth = Math.ceil((bounds.maxX - bounds.minX) / resolution);
  const gridHeight = Math.ceil((bounds.maxY - bounds.minY) / resolution);
  const grid = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(-100));
  
  // Calculate signal for each grid point
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const worldX = bounds.minX + x * resolution;
      const worldY = bounds.minY + y * resolution;
      const point = { x: worldX, y: worldY };
      
      let totalSignal = 0;
      let totalWeight = 0;
      
      // Calculate contribution from each monitor
      for (const monitor of monitors) {
        if (!monitor.position || monitor.status !== 'active') continue;
        
        const distance = Math.sqrt(
          Math.pow(worldX - monitor.position.x, 2) + 
          Math.pow(worldY - monitor.position.y, 2)
        );
        
        // Skip if beyond max interpolation distance
        if (distance > maxDistance) continue;
        
        const signal = calculateSignalAtPoint(monitor, point, settings);
        
        // Apply interpolation method
        switch (method) {
          case 'linear':
            // Simple linear interpolation
            const weight = Math.max(0, 1 - distance / maxDistance);
            totalSignal += signal * weight;
            totalWeight += weight;
            break;
            
          case 'inverse-distance':
            // Inverse distance weighting
            const idwWeight = 1 / Math.pow(Math.max(distance, 0.1), 2);
            totalSignal += signal * idwWeight;
            totalWeight += idwWeight;
            break;
            
          case 'kriging':
            // Simplified kriging (would need full implementation)
            const krigingWeight = Math.exp(-3 * distance / maxDistance);
            totalSignal += signal * krigingWeight;
            totalWeight += krigingWeight;
            break;
        }
      }
      
      // Calculate weighted average
      grid[y][x] = totalWeight > 0 ? totalSignal / totalWeight : -100;
    }
  }
  
  return grid;
}

/**
 * Generate heatmap data for visualization
 * 
 * @param {array} monitors - Array of monitor objects
 * @param {object} canvasSize - Canvas dimensions {width, height}
 * @param {object} viewSettings - View transformation settings
 * @returns {object} Heatmap data ready for rendering
 */
async function generateHeatmapData(monitors, canvasSize, viewSettings) {
  const activeMonitors = monitors.filter(m => m.status === 'active' && m.position);
  
  if (activeMonitors.length === 0) {
    return { grid: [], bounds: {} };
  }
  
  // Calculate bounds in world coordinates
  const bounds = {
    minX: 0,
    minY: 0,
    maxX: canvasSize.width / viewSettings.zoom,
    maxY: canvasSize.height / viewSettings.zoom,
  };
  
  // Get interpolated signal grid
  const grid = await interpolateSignalGrid(activeMonitors, bounds, {
    resolution: 10, // 10 pixel resolution for performance
  });
  
  return {
    grid,
    bounds,
    resolution: 10,
  };
}

module.exports = {
  ituIndoorPathLoss,
  logDistancePathLoss,
  multiWallModel,
  calculateSignalAtPoint,
  interpolateSignalGrid,
  generateHeatmapData,
};