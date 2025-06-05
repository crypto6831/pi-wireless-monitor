import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Async thunks
export const fetchLocationHierarchy = createAsyncThunk(
  'locations/fetchHierarchy',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getLocationHierarchy();
      return response.data.hierarchy;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch location hierarchy');
    }
  }
);

export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getLocations();
      return response.data.locations;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch locations');
    }
  }
);

export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (locationData, { rejectWithValue }) => {
    try {
      const response = await apiService.createLocation(locationData);
      return response.data.location;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create location');
    }
  }
);

export const updateLocation = createAsyncThunk(
  'locations/updateLocation',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateLocation(id, data);
      return response.data.location;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update location');
    }
  }
);

export const deleteLocation = createAsyncThunk(
  'locations/deleteLocation',
  async (id, { rejectWithValue }) => {
    try {
      await apiService.deleteLocation(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete location');
    }
  }
);

export const addFloorToLocation = createAsyncThunk(
  'locations/addFloor',
  async ({ locationId, floorData }, { rejectWithValue }) => {
    try {
      const response = await apiService.addFloorToLocation(locationId, floorData);
      return { locationId, floor: response.data.floor };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add floor');
    }
  }
);

export const uploadFloorPlan = createAsyncThunk(
  'locations/uploadFloorPlan',
  async ({ locationId, floorId, file, metadata }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('floorplan', file);
      formData.append('floorId', floorId);
      formData.append('metadata', JSON.stringify(metadata));
      
      const response = await apiService.uploadFloorPlan(locationId, formData);
      return { locationId, floorId, floorPlan: response.data.floorPlan };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to upload floor plan');
    }
  }
);

const locationsSlice = createSlice({
  name: 'locations',
  initialState: {
    hierarchy: {},
    locations: [],
    selectedLocation: null,
    selectedFloor: null,
    loading: false,
    error: null,
    uploadProgress: 0,
  },
  reducers: {
    setSelectedLocation: (state, action) => {
      state.selectedLocation = action.payload;
      state.selectedFloor = null;
    },
    setSelectedFloor: (state, action) => {
      state.selectedFloor = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    clearSelection: (state) => {
      state.selectedLocation = null;
      state.selectedFloor = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch hierarchy
      .addCase(fetchLocationHierarchy.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationHierarchy.fulfilled, (state, action) => {
        state.loading = false;
        state.hierarchy = action.payload;
      })
      .addCase(fetchLocationHierarchy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch locations
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create location
      .addCase(createLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations.push(action.payload);
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update location
      .addCase(updateLocation.fulfilled, (state, action) => {
        const index = state.locations.findIndex(loc => loc._id === action.payload._id);
        if (index !== -1) {
          state.locations[index] = action.payload;
        }
      })
      
      // Delete location
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.locations = state.locations.filter(loc => loc._id !== action.payload);
        if (state.selectedLocation?._id === action.payload) {
          state.selectedLocation = null;
          state.selectedFloor = null;
        }
      })
      
      // Add floor
      .addCase(addFloorToLocation.fulfilled, (state, action) => {
        const { locationId, floor } = action.payload;
        const location = state.locations.find(loc => loc._id === locationId);
        if (location) {
          location.floors.push(floor);
        }
      })
      
      // Upload floor plan
      .addCase(uploadFloorPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadFloorPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadProgress = 100;
        const { locationId, floorId, floorPlan } = action.payload;
        const location = state.locations.find(loc => loc._id === locationId);
        if (location) {
          const floor = location.floors.find(f => f._id === floorId);
          if (floor) {
            floor.floorPlan = floorPlan;
          }
        }
      })
      .addCase(uploadFloorPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.uploadProgress = 0;
      });
  },
});

export const {
  setSelectedLocation,
  setSelectedFloor,
  clearError,
  setUploadProgress,
  clearSelection,
} = locationsSlice.actions;

export default locationsSlice.reducer;