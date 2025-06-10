import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Typography, 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  SignalCellular4Bar as SignalIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { fetchNetworks, fetchNetworkStats } from '../store/slices/networksSlice';

function Networks() {
  const dispatch = useDispatch();
  const networks = useSelector((state) => state.networks.list);
  const stats = useSelector((state) => state.networks.stats);
  const loading = useSelector((state) => state.networks.loading);
  const [searchTerm, setSearchTerm] = useState('');

  const handleRefresh = () => {
    dispatch(fetchNetworks({}));
    dispatch(fetchNetworkStats());
  };

  useEffect(() => {
    // Only fetch if we don't have data or it's stale
    console.log('Networks useEffect - networks.length:', networks.length, 'networks:', networks);
    if (networks.length === 0) {
      console.log('Calling handleRefresh...');
      handleRefresh();
    }
  }, []);

  useEffect(() => {
    console.log('Networks updated:', networks.length, 'items');
  }, [networks]);

  const getSignalStrengthColor = (strength) => {
    if (strength >= -50) return 'success';
    if (strength >= -70) return 'warning';
    return 'error';
  };

  const getSignalStrengthLabel = (strength) => {
    if (strength >= -50) return 'Excellent';
    if (strength >= -60) return 'Good';
    if (strength >= -70) return 'Fair';
    return 'Poor';
  };

  const filteredNetworks = networks.filter(network =>
    network.ssid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    network.bssid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box className="fade-in">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          WiFi Networks
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Networks
                </Typography>
                <Typography variant="h4">
                  {stats.totalNetworks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Encrypted
                </Typography>
                <Typography variant="h4">
                  {stats.encryptedCount}
                  <Typography variant="body2" component="span" color="text.secondary">
                    {' '}({Math.round(stats.encryptionPercentage)}%)
                  </Typography>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  2.4 GHz
                </Typography>
                <Typography variant="h4">
                  {stats.band2_4GHz}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  5 GHz
                </Typography>
                <Typography variant="h4">
                  {stats.band5GHz}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by SSID or BSSID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Networks Table */}
      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SSID</TableCell>
              <TableCell>BSSID</TableCell>
              <TableCell>Channel</TableCell>
              <TableCell>Band</TableCell>
              <TableCell>Signal</TableCell>
              <TableCell>Quality</TableCell>
              <TableCell>Security</TableCell>
              <TableCell>Last Seen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredNetworks.map((network) => (
              <TableRow key={network._id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {network.encryption ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                    <Typography>{network.ssid || '(Hidden)'}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {network.bssid}
                  </Typography>
                </TableCell>
                <TableCell>{network.channel}</TableCell>
                <TableCell>
                  <Chip 
                    label={network.band} 
                    size="small" 
                    color={network.band === '5GHz' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <SignalIcon color={getSignalStrengthColor(network.signalStrength)} />
                    <Typography>{network.signalStrength} dBm</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={network.qualityPercentage || 0} 
                      color={getSignalStrengthColor(network.signalStrength)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption">
                      {network.qualityPercentage || 0}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={network.encryptionType || 'Open'} 
                    size="small"
                    color={network.encryption ? 'success' : 'warning'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(network.lastSeen).toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!loading && filteredNetworks.length === 0 && (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">
              {searchTerm ? 'No networks found matching your search' : 'No networks detected'}
            </Typography>
          </Box>
        )}
      </TableContainer>
    </Box>
  );
}

export default Networks; 