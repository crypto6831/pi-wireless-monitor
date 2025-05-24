import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

function Metrics() {
  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom>
        Metrics & Analytics
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" color="text.secondary">
          System metrics page - View detailed performance metrics and analytics
        </Typography>
      </Paper>
    </Box>
  );
}

export default Metrics; 