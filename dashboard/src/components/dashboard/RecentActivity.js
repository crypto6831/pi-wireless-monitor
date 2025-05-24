import React from 'react';
import { Typography, Box } from '@mui/material';

function RecentActivity() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Recent Activity
      </Typography>
      <Box textAlign="center" py={4}>
        <Typography variant="body2" color="text.secondary">
          Activity feed will be displayed here
        </Typography>
      </Box>
    </Box>
  );
}

export default RecentActivity; 