import React from 'react';
import {
  Box,
  Paper,
  Typography,
} from '@mui/material';
import {
  Info,
} from '@mui/icons-material';

const FloorPlans = () => {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        Floor Plans & Monitor Management
      </Typography>

      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        <Paper sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
          m: 2,
        }}>
          <Info sx={{ fontSize: 64, color: 'text.secondary' }} />
          <Typography variant="h6" color="text.secondary">
            Floor Plans Feature
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This page is working! Floor plans functionality will be available here.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default FloorPlans;