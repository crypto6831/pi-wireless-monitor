import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../../services/api';

// Async thunks
export const fetchMetricsHistory = createAsyncThunk(
  'metrics/fetchHistory',
  async ({ monitorId, period = '1h', metric = 'all' }) => {
    const response = await apiService.getMetricsHistory(monitorId, { period, metric });
    return response.data;
  }
);

export const fetchLatestMetrics = createAsyncThunk(
  'metrics/fetchLatest',
  async (monitorId) => {
    const response = await apiService.getLatestMetrics(monitorId);
    return { monitorId, metrics: response.data.metrics };
  }
);

export const fetchHealthOverview = createAsyncThunk(
  'metrics/fetchHealth',
  async (monitorId) => {
    const response = await apiService.fetchHealthOverview();
    return response.data.overview;
  }
);

const metricsSlice = createSlice({
  name: 'metrics',
  initialState: {
    latest: {},
    history: {},
    health: [],
    selectedPeriod: '1h',
    selectedMetric: 'all',
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedPeriod: (state, action) => {
      state.selectedPeriod = action.payload;
    },
    setSelectedMetric: (state, action) => {
      state.selectedMetric = action.payload;
    },
    updateLatestMetrics: (state, action) => {
      const { monitorId, metrics } = action.payload;
      state.latest[monitorId] = metrics;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch history
      .addCase(fetchMetricsHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMetricsHistory.fulfilled, (state, action) => {
        state.loading = false;
        const { monitorId } = action.meta.arg;
        state.history[monitorId] = action.payload;
      })
      .addCase(fetchMetricsHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch latest
      .addCase(fetchLatestMetrics.fulfilled, (state, action) => {
        const { monitorId, metrics } = action.payload;
        state.latest[monitorId] = metrics;
      })
      // Fetch health
      .addCase(fetchHealthOverview.fulfilled, (state, action) => {
        state.health = action.payload;
      });
  },
});

export const { setSelectedPeriod, setSelectedMetric, updateLatestMetrics } = metricsSlice.actions;
export default metricsSlice.reducer; 