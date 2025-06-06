import React from 'react';
import { Typography, Box } from '@mui/material';

function MetricsChart() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        System Metrics
      </Typography>
      <Box textAlign="center" py={8}>
        <Typography variant="body2" color="text.secondary">
          Metrics charts will be implemented here
        </Typography>
      </Box>
    </Box>
  );
}

export default MetricsChart; 