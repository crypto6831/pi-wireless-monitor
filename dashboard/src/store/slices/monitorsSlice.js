import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Async thunks
export const fetchMonitors = createAsyncThunk(
  'monitors/fetchMonitors',
  async () => {
    const response = await apiService.getMonitors();
    return response.data;
  }
);

export const fetchMonitorStats = createAsyncThunk(
  'monitors/fetchStats',
  async (monitorId) => {
    const response = await apiService.getMonitor(monitorId);
    return { monitorId, stats: response.data.stats };
  }
);

export const updateMonitorPosition = createAsyncThunk(
  'monitors/updatePosition',
  async ({ monitorId, position }) => {
    const response = await apiService.updateMonitorPosition(monitorId, position);
    console.log('Redux updateMonitorPosition: API response:', response.data);
    return { 
      monitorId, 
      position: {
        x: position.x,
        y: position.y
      },
      locationId: position.locationId,
      floorId: position.floorId
    };
  }
);

const monitorsSlice = createSlice({
  name: 'monitors',
  initialState: {
    list: [],
    selectedMonitorId: null,
    stats: {},
    loading: false,
    error: null,
  },
  reducers: {
    selectMonitor: (state, action) => {
      state.selectedMonitorId = action.payload;
    },
    setMonitors: (state, action) => {
      state.list = action.payload;
      state.loading = false;
      state.error = null;
    },
    updateMonitorStatus: (state, action) => {
      const { monitorId, status } = action.payload;
      const monitor = state.list.find(m => m.monitorId === monitorId);
      if (monitor) {
        monitor.status = status;
        monitor.lastHeartbeat = new Date().toISOString();
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch monitors
      .addCase(fetchMonitors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonitors.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.monitors;
      })
      .addCase(fetchMonitors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch monitor stats
      .addCase(fetchMonitorStats.fulfilled, (state, action) => {
        const { monitorId, stats } = action.payload;
        state.stats[monitorId] = stats;
      })
      // Update monitor position
      .addCase(updateMonitorPosition.fulfilled, (state, action) => {
        const { monitorId, position, locationId, floorId } = action.payload;
        const monitor = state.list.find(m => m._id === monitorId);
        if (monitor) {
          monitor.position = position;
          monitor.locationId = locationId;
          monitor.floorId = floorId;
          console.log('Redux: Updated monitor in state:', {
            name: monitor.name,
            position: monitor.position,
            locationId: monitor.locationId,
            floorId: monitor.floorId
          });
        } else {
          console.log('Redux: Monitor not found in state:', monitorId);
        }
      });
  },
});

export const { selectMonitor, setMonitors, updateMonitorStatus, clearError } = monitorsSlice.actions;
export default monitorsSlice.reducer; 