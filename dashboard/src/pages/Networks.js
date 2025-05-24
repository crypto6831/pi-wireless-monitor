import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

function Networks() {
  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom>
        Networks
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Network monitoring page - View all detected WiFi networks and their details
        </Typography>
      </Paper>
    </Box>
  );
}

export default Networks; 