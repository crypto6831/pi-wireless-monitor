import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Async thunks
export const fetchLocationHierarchy = createAsyncThunk(
  'locations/fetchHierarchy',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching location hierarchy...');
      const response = await apiService.getLocationHierarchy();
      console.log('Location hierarchy response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch location hierarchy:', error);
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch location hierarchy');
    }
  }
);

export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching locations...');
      const response = await apiService.getLocations();
      console.log('Locations response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch locations');
    }
  }
);

export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (locationData, { rejectWithValue }) => {
    try {
      console.log('Creating location with data:', locationData);
      const response = await apiService.createLocation(locationData);
      console.log('Location creation response:', response);
      return response.data;
    } catch (error) {
      console.error('Location creation error:', error);
      console.error('Error response:', error.response);
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to create location');
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

export const removeFloorFromLocation = createAsyncThunk(
  'locations/removeFloor',
  async ({ locationId, floorId }, { rejectWithValue }) => {
    try {
      await apiService.removeFloorFromLocation(locationId, floorId);
      return { locationId, floorId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove floor');
    }
  }
);

export const uploadFloorPlan = createAsyncThunk(
  'locations/uploadFloorPlan',
  async ({ locationId, formData }, { rejectWithValue }) => {
    try {
      const response = await apiService.uploadFloorPlan(locationId, formData);
      return { locationId, floorPlan: response.data.floorPlan };
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
      
      // Remove floor
      .addCase(removeFloorFromLocation.fulfilled, (state, action) => {
        const { locationId, floorId } = action.payload;
        const location = state.locations.find(loc => loc._id === locationId);
        if (location) {
          location.floors = location.floors.filter(floor => floor._id !== floorId);
        }
        if (state.selectedFloor?._id === floorId) {
          state.selectedFloor = null;
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
        const { locationId, floorPlan } = action.payload;
        const location = state.locations.find(loc => loc._id === locationId);
        if (location) {
          location.floorPlan = floorPlan;
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