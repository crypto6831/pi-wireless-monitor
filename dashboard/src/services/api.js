import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);
      
      // Handle common errors
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token but don't redirect
          // (This app doesn't have authentication implemented yet)
          localStorage.removeItem('authToken');
          console.warn('401 Unauthorized - auth token cleared');
          break;
        case 403:
          console.error('Forbidden:', error.response.data);
          break;
        case 404:
          console.error('Not found:', error.response.data);
          break;
        case 500:
          console.error('Server error:', error.response.data);
          break;
        default:
          console.error('API error:', error.response.status, error.response.data);
      }
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server:', error.request);
    } else {
      // Something else happened
      console.error('API Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Monitors
  getMonitors: () => api.get('/monitors'),
  getMonitor: (id) => api.get(`/monitors/${id}`),
  updateMonitor: (id, data) => api.put(`/monitors/${id}`, data),
  deleteMonitor: (id) => api.delete(`/monitors/${id}`),
  updateMonitorPosition: (id, position) => api.put(`/monitors/${id}/position`, position),
  createMonitorCoverage: (id, coverage) => api.post(`/monitors/${id}/coverage`, coverage),

  // Networks
  getNetworks: () => api.get('/networks'),
  getNetwork: (id) => api.get(`/networks/${id}`),

  // Devices
  getDevices: () => api.get('/devices'),
  getDevice: (id) => api.get(`/devices/${id}`),

  // Metrics
  getMetrics: (params = {}) => api.get('/metrics', { params }),
  getMetricsByMonitor: (monitorId, params = {}) => api.get(`/metrics/monitor/${monitorId}`, { params }),

  // Alerts
  getAlerts: (params = {}) => api.get('/alerts', { params }),
  getAlert: (id) => api.get(`/alerts/${id}`),
  markAlertAsRead: (id) => api.put(`/alerts/${id}/read`),

  // Service Monitors
  getServiceMonitors: () => api.get('/service-monitors'),
  createServiceMonitor: (data) => api.post('/service-monitors', data),
  updateServiceMonitor: (id, data) => api.put(`/service-monitors/${id}`, data),
  deleteServiceMonitor: (id) => api.delete(`/service-monitors/${id}`),
  resetServiceMonitorCUSUM: (id) => api.post(`/service-monitors/${id}/reset-cusum`),

  // Locations
  getLocationHierarchy: () => api.get('/locations/hierarchy'),
  getLocations: () => api.get('/locations'),
  getLocation: (id) => api.get(`/locations/${id}`),
  createLocation: (data) => api.post('/locations', data),
  updateLocation: (id, data) => api.put(`/locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/locations/${id}`),
  getLocationMonitors: (id) => api.get(`/locations/${id}/monitors`),
  getLocationCoverage: (id, floorId) => api.get(`/locations/${id}/coverage`, {
    params: { floorId }
  }),
  addFloorToLocation: (id, floorData) => api.post(`/locations/${id}/floors`, floorData),
  removeFloorFromLocation: (id, floorId) => api.delete(`/locations/${id}/floors/${floorId}`),

  // Floor Plans
  uploadFloorPlan: (id, formData) => api.post(`/locations/${id}/floorplan`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getFloorPlan: (id) => api.get(`/locations/${id}/floorplan`),
  getFloorPlanImage: (id, floorId) => api.get(`/locations/${id}/floorplan/image`, {
    params: { floorId },
    responseType: 'blob'
  }),
  updateFloorPlan: (id, formData) => api.put(`/locations/${id}/floorplan`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteFloorPlan: (id) => api.delete(`/locations/${id}/floorplan`),
};

export default api; 