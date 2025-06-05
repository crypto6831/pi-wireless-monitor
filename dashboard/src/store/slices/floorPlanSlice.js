import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Async thunks
export const fetchLocationMonitors = createAsyncThunk(
  'floorPlan/fetchLocationMonitors',
  async (locationId, { rejectWithValue }) => {
    try {
      const response = await apiService.getLocationMonitors(locationId);
      return response.data.monitors;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch monitors');
    }
  }
);

export const fetchLocationCoverage = createAsyncThunk(
  'floorPlan/fetchLocationCoverage',
  async (locationId, { rejectWithValue }) => {
    try {
      const response = await apiService.getLocationCoverage(locationId);
      return response.data.coverageAreas;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch coverage areas');
    }
  }
);

export const updateMonitorPosition = createAsyncThunk(
  'floorPlan/updateMonitorPosition',
  async ({ monitorId, position }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateMonitorPosition(monitorId, position);
      return { monitorId, position: response.data.monitor.position };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update monitor position');
    }
  }
);

export const createCoverageArea = createAsyncThunk(
  'floorPlan/createCoverageArea',
  async ({ monitorId, coverage }, { rejectWithValue }) => {
    try {
      const response = await apiService.createMonitorCoverage(monitorId, coverage);
      return response.data.coverage;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create coverage area');
    }
  }
);

export const fetchFloorPlanImage = createAsyncThunk(
  'floorPlan/fetchFloorPlanImage',
  async (locationId, { rejectWithValue }) => {
    try {
      const response = await apiService.getFloorPlanImage(locationId);
      const blob = response.data;
      const imageUrl = URL.createObjectURL(blob);
      return imageUrl;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch floor plan image');
    }
  }
);

const floorPlanSlice = createSlice({
  name: 'floorPlan',
  initialState: {
    monitors: [],
    coverageAreas: [],
    floorPlanImage: null,
    selectedMonitors: [],
    draggedMonitor: null,
    viewSettings: {
      zoom: 1,
      panX: 0,
      panY: 0,
      showGrid: false,
      showCoverage: true,
      showMonitorLabels: true,
    },
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedMonitors: (state, action) => {
      state.selectedMonitors = action.payload;
    },
    addSelectedMonitor: (state, action) => {
      if (!state.selectedMonitors.includes(action.payload)) {
        state.selectedMonitors.push(action.payload);
      }
    },
    removeSelectedMonitor: (state, action) => {
      state.selectedMonitors = state.selectedMonitors.filter(id => id !== action.payload);
    },
    clearSelectedMonitors: (state) => {
      state.selectedMonitors = [];
    },
    setDraggedMonitor: (state, action) => {
      state.draggedMonitor = action.payload;
    },
    updateViewSettings: (state, action) => {
      state.viewSettings = { ...state.viewSettings, ...action.payload };
    },
    setZoom: (state, action) => {
      state.viewSettings.zoom = Math.max(0.1, Math.min(5, action.payload));
    },
    setPan: (state, action) => {
      state.viewSettings.panX = action.payload.x;
      state.viewSettings.panY = action.payload.y;
    },
    resetView: (state) => {
      state.viewSettings.zoom = 1;
      state.viewSettings.panX = 0;
      state.viewSettings.panY = 0;
    },
    toggleGrid: (state) => {
      state.viewSettings.showGrid = !state.viewSettings.showGrid;
    },
    toggleCoverage: (state) => {
      state.viewSettings.showCoverage = !state.viewSettings.showCoverage;
    },
    toggleMonitorLabels: (state) => {
      state.viewSettings.showMonitorLabels = !state.viewSettings.showMonitorLabels;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateMonitorPositionLocal: (state, action) => {
      const { monitorId, position } = action.payload;
      const monitor = state.monitors.find(m => m._id === monitorId);
      if (monitor) {
        monitor.position = position;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch monitors
      .addCase(fetchLocationMonitors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationMonitors.fulfilled, (state, action) => {
        state.loading = false;
        state.monitors = action.payload;
      })
      .addCase(fetchLocationMonitors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch coverage areas
      .addCase(fetchLocationCoverage.fulfilled, (state, action) => {
        state.coverageAreas = action.payload;
      })
      
      // Update monitor position
      .addCase(updateMonitorPosition.fulfilled, (state, action) => {
        const { monitorId, position } = action.payload;
        const monitor = state.monitors.find(m => m._id === monitorId);
        if (monitor) {
          monitor.position = position;
        }
      })
      .addCase(updateMonitorPosition.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Create coverage area
      .addCase(createCoverageArea.fulfilled, (state, action) => {
        state.coverageAreas.push(action.payload);
      })
      .addCase(createCoverageArea.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Fetch floor plan image
      .addCase(fetchFloorPlanImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFloorPlanImage.fulfilled, (state, action) => {
        state.loading = false;
        // Clean up previous image URL
        if (state.floorPlanImage) {
          URL.revokeObjectURL(state.floorPlanImage);
        }
        state.floorPlanImage = action.payload;
      })
      .addCase(fetchFloorPlanImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setSelectedMonitors,
  addSelectedMonitor,
  removeSelectedMonitor,
  clearSelectedMonitors,
  setDraggedMonitor,
  updateViewSettings,
  setZoom,
  setPan,
  resetView,
  toggleGrid,
  toggleCoverage,
  toggleMonitorLabels,
  clearError,
  updateMonitorPositionLocal,
} = floorPlanSlice.actions;

export default floorPlanSlice.reducer;