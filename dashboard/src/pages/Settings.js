import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

function Settings() {
  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Settings page - Configure application settings and preferences
        </Typography>
      </Paper>
    </Box>
  );
}

export default Settings; 