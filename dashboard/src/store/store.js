import { configureStore } from '@reduxjs/toolkit';
import monitorsReducer from './slices/monitorsSlice';
import networksReducer from './slices/networksSlice';
import metricsReducer from './slices/metricsSlice';
import alertsReducer from './slices/alertsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    monitors: monitorsReducer,
    networks: networksReducer,
    metrics: metricsReducer,
    alerts: alertsReducer,
    ui: uiReducer,
  },
}); 