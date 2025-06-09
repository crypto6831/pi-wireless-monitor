import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Async thunks
export const fetchCoverageSettings = createAsyncThunk(
  'coverageSettings/fetchCoverageSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getCoverageSettings();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch coverage settings');
    }
  }
);

export const updateCoverageSettings = createAsyncThunk(
  'coverageSettings/updateCoverageSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const response = await apiService.updateCoverageSettings(settings);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update coverage settings');
    }
  }
);

export const resetCoverageSettings = createAsyncThunk(
  'coverageSettings/resetCoverageSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.resetCoverageSettings();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reset coverage settings');
    }
  }
);

// Initial state with default coverage settings
const initialState = {
  settings: {
    signalThresholds: {
      excellent: -50,
      good: -60,
      fair: -70,
      poor: -80,
      weak: -90
    },
    heatmapSettings: {
      intensity: 0.5,
      radius: 50,
      blur: 15,
      enabled: true
    },
    defaultCoverageArea: {
      fillColor: '#4CAF50',
      fillOpacity: 0.3,
      strokeColor: '#2196F3',
      strokeWidth: 2
    },
    interferenceZones: {
      enabled: true,
      color: '#F44336',
      opacity: 0.2
    }
  },
  loading: false,
  error: null,
  lastUpdated: null
};

const coverageSettingsSlice = createSlice({
  name: 'coverageSettings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Local state updates for immediate UI feedback
    updateSignalThresholds: (state, action) => {
      state.settings.signalThresholds = { ...state.settings.signalThresholds, ...action.payload };
    },
    updateHeatmapSettings: (state, action) => {
      state.settings.heatmapSettings = { ...state.settings.heatmapSettings, ...action.payload };
    },
    updateDefaultCoverageArea: (state, action) => {
      state.settings.defaultCoverageArea = { ...state.settings.defaultCoverageArea, ...action.payload };
    },
    updateInterferenceZones: (state, action) => {
      state.settings.interferenceZones = { ...state.settings.interferenceZones, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch coverage settings
      .addCase(fetchCoverageSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCoverageSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload.settings;
        state.lastUpdated = action.payload.updatedAt;
      })
      .addCase(fetchCoverageSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update coverage settings
      .addCase(updateCoverageSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCoverageSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload.settings;
        state.lastUpdated = action.payload.updatedAt;
      })
      .addCase(updateCoverageSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Reset coverage settings
      .addCase(resetCoverageSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetCoverageSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload.settings;
        state.lastUpdated = action.payload.updatedAt;
      })
      .addCase(resetCoverageSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  updateSignalThresholds,
  updateHeatmapSettings,
  updateDefaultCoverageArea,
  updateInterferenceZones
} = coverageSettingsSlice.actions;

// Selectors
export const selectCoverageSettings = (state) => state.coverageSettings.settings;
export const selectSignalThresholds = (state) => state.coverageSettings.settings.signalThresholds;
export const selectHeatmapSettings = (state) => state.coverageSettings.settings.heatmapSettings;
export const selectDefaultCoverageArea = (state) => state.coverageSettings.settings.defaultCoverageArea;
export const selectInterferenceZones = (state) => state.coverageSettings.settings.interferenceZones;
export const selectCoverageSettingsLoading = (state) => state.coverageSettings.loading;
export const selectCoverageSettingsError = (state) => state.coverageSettings.error;

export default coverageSettingsSlice.reducer;