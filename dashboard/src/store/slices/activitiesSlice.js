import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchRecentActivities = createAsyncThunk(
  'activities/fetchRecent',
  async (limit = 20, { rejectWithValue }) => {
    try {
      const response = await api.get(`/activities/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch activities');
    }
  }
);

export const fetchActivitiesByType = createAsyncThunk(
  'activities/fetchByType',
  async ({ type, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/activities/type/${type}?limit=${limit}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch activities by type');
    }
  }
);

export const fetchActivityStats = createAsyncThunk(
  'activities/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/activities/stats');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch activity stats');
    }
  }
);

const activitiesSlice = createSlice({
  name: 'activities',
  initialState: {
    recent: [],
    byType: {},
    stats: null,
    loading: false,
    error: null,
    lastUpdated: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addActivity: (state, action) => {
      // Add new activity to the beginning of recent activities
      state.recent.unshift(action.payload);
      // Keep only the latest 20 activities
      if (state.recent.length > 20) {
        state.recent = state.recent.slice(0, 20);
      }
      state.lastUpdated = new Date().toISOString();
    },
    setLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch recent activities
      .addCase(fetchRecentActivities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecentActivities.fulfilled, (state, action) => {
        state.loading = false;
        state.recent = action.payload.activities;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchRecentActivities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch activities by type
      .addCase(fetchActivitiesByType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivitiesByType.fulfilled, (state, action) => {
        state.loading = false;
        // Store activities by type
        const type = action.meta.arg.type;
        state.byType[type] = action.payload.activities;
      })
      .addCase(fetchActivitiesByType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch activity stats
      .addCase(fetchActivityStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivityStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload.stats;
      })
      .addCase(fetchActivityStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, addActivity, setLastUpdated } = activitiesSlice.actions;
export default activitiesSlice.reducer;