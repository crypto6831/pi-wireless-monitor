import React from 'react';
import { useSelector } from 'react-redux';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  WifiTethering as WifiIcon,
  Lock as LockIcon,
  LockOpen as OpenIcon,
  SignalCellular4Bar as SignalIcon,
} from '@mui/icons-material';

function NetworkOverview() {
  const stats = useSelector((state) => state.networks.stats);
  const loading = useSelector((state) => state.networks.loading);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body2" color="text.secondary">
          No network data available
        </Typography>
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Total Networks',
      value: stats.totalNetworks || 0,
      icon: <WifiIcon />,
      color: 'primary',
    },
    {
      title: 'Encrypted',
      value: `${Math.round(stats.encryptionPercentage || 0)}%`,
      subtitle: `${stats.encryptedCount || 0} networks`,
      icon: <LockIcon />,
      color: 'success',
    },
    {
      title: '2.4 GHz',
      value: stats.band2_4GHz || 0,
      icon: <SignalIcon />,
      color: 'info',
    },
    {
      title: '5 GHz',
      value: stats.band5GHz || 0,
      icon: <SignalIcon />,
      color: 'secondary',
    },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Network Overview
      </Typography>
      
      <Grid container spacing={2}>
        {statCards.map((stat, index) => (
          <Grid item xs={6} sm={6} md={6} key={index}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="caption">
                      {stat.title}
                    </Typography>
                    <Typography variant="h5">
                      {stat.value}
                    </Typography>
                    {stat.subtitle && (
                      <Typography variant="caption" color="text.secondary">
                        {stat.subtitle}
                      </Typography>
                    )}
                  </Box>
                  <Box color={`${stat.color}.main`}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box mt={3}>
        <Typography variant="body2" color="text.secondary">
          Signal Strength Range: {stats.minSignalStrength} to {stats.maxSignalStrength} dBm
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Average Signal: {stats.avgSignalStrength} dBm
        </Typography>
      </Box>
    </Box>
  );
}

export default NetworkOverview; 