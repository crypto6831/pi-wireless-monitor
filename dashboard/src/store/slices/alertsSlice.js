import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async (params = {}) => {
    const { monitorId, status = 'active' } = params;
    const queryParams = new URLSearchParams();
    if (monitorId) queryParams.append('monitorId', monitorId);
    if (status) queryParams.append('status', status);
    
    const response = await api.get(`/alerts?${queryParams}`);
    return response.data;
  }
);

export const fetchActiveAlerts = createAsyncThunk(
  'alerts/fetchActive',
  async (monitorId) => {
    const params = monitorId ? `?monitorId=${monitorId}` : '';
    const response = await api.get(`/alerts/active${params}`);
    return response.data.alerts;
  }
);

export const acknowledgeAlert = createAsyncThunk(
  'alerts/acknowledge',
  async (alertId) => {
    const response = await api.put(`/alerts/${alertId}/acknowledge`);
    return response.data.alert;
  }
);

export const resolveAlert = createAsyncThunk(
  'alerts/resolve',
  async (alertId) => {
    const response = await api.put(`/alerts/${alertId}/resolve`);
    return response.data.alert;
  }
);

export const fetchAlertStats = createAsyncThunk(
  'alerts/fetchStats',
  async ({ monitorId, days = 7 }) => {
    const params = new URLSearchParams();
    if (monitorId) params.append('monitorId', monitorId);
    params.append('days', days);
    
    const response = await api.get(`/alerts/stats/summary?${params}`);
    return response.data;
  }
);

const alertsSlice = createSlice({
  name: 'alerts',
  initialState: {
    list: [],
    active: {
      critical: [],
      high: [],
      medium: [],
      low: [],
    },
    stats: null,
    loading: false,
    error: null,
  },
  reducers: {
    addAlert: (state, action) => {
      const alert = action.payload;
      state.list.unshift(alert);
      
      // Add to active alerts if applicable
      if (alert.status === 'active') {
        state.active[alert.severity].unshift(alert);
      }
    },
    updateAlert: (state, action) => {
      const updatedAlert = action.payload;
      
      // Update in list
      const index = state.list.findIndex(a => a._id === updatedAlert._id);
      if (index !== -1) {
        state.list[index] = updatedAlert;
      }
      
      // Update in active alerts
      Object.keys(state.active).forEach(severity => {
        const activeIndex = state.active[severity].findIndex(a => a._id === updatedAlert._id);
        if (activeIndex !== -1) {
          if (updatedAlert.status === 'active') {
            state.active[severity][activeIndex] = updatedAlert;
          } else {
            state.active[severity].splice(activeIndex, 1);
          }
        }
      });
    },
    deleteAlert: (state, action) => {
      const alertId = action.payload;
      
      // Remove from list
      state.list = state.list.filter(a => a._id !== alertId);
      
      // Remove from active alerts
      Object.keys(state.active).forEach(severity => {
        state.active[severity] = state.active[severity].filter(a => a._id !== alertId);
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch alerts
      .addCase(fetchAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.alerts;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch active
      .addCase(fetchActiveAlerts.fulfilled, (state, action) => {
        state.active = action.payload;
      })
      // Acknowledge
      .addCase(acknowledgeAlert.fulfilled, (state, action) => {
        const alert = action.payload;
        alertsSlice.caseReducers.updateAlert(state, { payload: alert });
      })
      // Resolve
      .addCase(resolveAlert.fulfilled, (state, action) => {
        const alert = action.payload;
        alertsSlice.caseReducers.updateAlert(state, { payload: alert });
      })
      // Stats
      .addCase(fetchAlertStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { addAlert, updateAlert, deleteAlert } = alertsSlice.actions;
export default alertsSlice.reducer; 