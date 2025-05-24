import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

function Monitors() {
  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom>
        Monitors
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Monitor management page - List and manage all Raspberry Pi monitors
        </Typography>
      </Paper>
    </Box>
  );
}

export default Monitors; 