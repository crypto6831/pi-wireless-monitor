import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchNetworks = createAsyncThunk(
  'networks/fetchNetworks',
  async ({ monitorId, active } = {}) => {
    const params = new URLSearchParams();
    if (monitorId) params.append('monitorId', monitorId);
    if (active) params.append('active', 'true');
    
    const response = await api.get(`/networks?${params}`);
    return response.data;
  }
);

export const fetchNetworkHistory = createAsyncThunk(
  'networks/fetchHistory',
  async (networkId) => {
    const response = await api.get(`/networks/${networkId}/history`);
    return { networkId, history: response.data.history };
  }
);

export const fetchNetworkStats = createAsyncThunk(
  'networks/fetchStats',
  async (monitorId) => {
    const response = await api.fetchNetworkStats();
    return response.data.stats;
  }
);

const networksSlice = createSlice({
  name: 'networks',
  initialState: {
    list: [],
    history: {},
    stats: null,
    loading: false,
    error: null,
    lastUpdate: null,
  },
  reducers: {
    updateNetwork: (state, action) => {
      const { network } = action.payload;
      const index = state.list.findIndex(n => n._id === network._id);
      if (index !== -1) {
        state.list[index] = network;
      } else {
        state.list.push(network);
      }
      state.lastUpdate = new Date().toISOString();
    },
    clearNetworks: (state) => {
      state.list = [];
      state.history = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch networks
      .addCase(fetchNetworks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNetworks.fulfilled, (state, action) => {
        console.log('fetchNetworks.fulfilled - action.payload:', action.payload);
        console.log('Networks array:', action.payload.networks?.length, 'items');
        state.loading = false;
        state.list = action.payload.networks || [];
        state.lastUpdate = new Date().toISOString();
      })
      .addCase(fetchNetworks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch history
      .addCase(fetchNetworkHistory.fulfilled, (state, action) => {
        const { networkId, history } = action.payload;
        state.history[networkId] = history;
      })
      // Fetch stats
      .addCase(fetchNetworkStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { updateNetwork, clearNetworks } = networksSlice.actions;
export default networksSlice.reducer; 