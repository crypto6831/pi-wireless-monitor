import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

function Alerts() {
  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom>
        Alerts & Notifications
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Alerts page - Manage system alerts and notifications
        </Typography>
      </Paper>
    </Box>
  );
}

export default Alerts; 