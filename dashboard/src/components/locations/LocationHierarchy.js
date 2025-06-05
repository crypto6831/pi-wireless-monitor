import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TreeView,
  TreeItem,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore,
  ChevronRight,
  LocationOn,
  Business,
  Layers,
  Add,
  Search,
  Refresh,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchLocationHierarchy,
  fetchLocations,
  createLocation,
  setSelectedLocation,
  setSelectedFloor,
  clearError,
} from '../../store/slices/locationsSlice';

const LocationHierarchy = ({ onLocationSelect, showCreateButton = true }) => {
  const dispatch = useDispatch();
  const { hierarchy, locations, selectedLocation, selectedFloor, loading, error } = useSelector(
    (state) => state.locations
  );

  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState([]);

  // New location form state
  const [newLocation, setNewLocation] = useState({
    address: '',
    buildingName: '',
    metadata: {},
  });

  useEffect(() => {
    dispatch(fetchLocationHierarchy());
    dispatch(fetchLocations());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      console.error('Location error:', error);
    }
  }, [error]);

  const handleAddressChange = (address) => {
    setSelectedAddress(address);
    setSelectedBuilding('');
    setSelectedFloorId('');
    dispatch(setSelectedLocation(null));
    dispatch(setSelectedFloor(null));
  };

  const handleBuildingChange = (building) => {
    setSelectedBuilding(building);
    setSelectedFloorId('');
    
    const location = locations.find(
      loc => loc.address === selectedAddress && loc.buildingName === building
    );
    
    if (location) {
      dispatch(setSelectedLocation(location));
      dispatch(setSelectedFloor(null));
      if (onLocationSelect) {
        onLocationSelect(location, null);
      }
    }
  };

  const handleFloorChange = (floorId) => {
    setSelectedFloorId(floorId);
    
    if (selectedLocation) {
      const floor = selectedLocation.floors.find(f => f._id === floorId);
      if (floor) {
        dispatch(setSelectedFloor(floor));
        if (onLocationSelect) {
          onLocationSelect(selectedLocation, floor);
        }
      }
    }
  };

  const handleCreateLocation = async () => {
    try {
      await dispatch(createLocation(newLocation)).unwrap();
      setCreateDialogOpen(false);
      setNewLocation({ address: '', buildingName: '', metadata: {} });
      dispatch(fetchLocationHierarchy());
      dispatch(fetchLocations());
    } catch (err) {
      console.error('Failed to create location:', err);
    }
  };

  const handleTreeItemClick = (nodeId, nodeType, data) => {
    if (nodeType === 'address') {
      handleAddressChange(data.address);
    } else if (nodeType === 'building') {
      handleAddressChange(data.address);
      handleBuildingChange(data.building);
    } else if (nodeType === 'floor') {
      handleAddressChange(data.address);
      handleBuildingChange(data.building);
      handleFloorChange(data.floorId);
    }
  };

  const getFilteredHierarchy = () => {
    if (!searchTerm) return hierarchy;
    
    const filtered = {};
    Object.keys(hierarchy).forEach(address => {
      const buildings = hierarchy[address];
      const filteredBuildings = {};
      
      Object.keys(buildings).forEach(building => {
        const floors = buildings[building];
        
        if (
          address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          building.toLowerCase().includes(searchTerm.toLowerCase()) ||
          floors.some(floor => 
            floor.floorNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            floor.floorName?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        ) {
          filteredBuildings[building] = floors;
        }
      });
      
      if (Object.keys(filteredBuildings).length > 0) {
        filtered[address] = filteredBuildings;
      }
    });
    
    return filtered;
  };

  const renderTreeView = () => {
    const filteredHierarchy = getFilteredHierarchy();
    
    return (
      <TreeView
        defaultCollapseIcon={<ExpandMore />}
        defaultExpandIcon={<ChevronRight />}
        expanded={expandedNodes}
        onNodeToggle={(event, nodeIds) => setExpandedNodes(nodeIds)}
        sx={{ flexGrow: 1, overflowY: 'auto' }}
      >
        {Object.keys(filteredHierarchy).map(address => (
          <TreeItem
            key={address}
            nodeId={`address-${address}`}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                <LocationOn sx={{ mr: 1, fontSize: 18 }} />
                <Typography variant="body2">{address}</Typography>
              </Box>
            }
            onClick={() => handleTreeItemClick('address', 'address', { address })}
          >
            {Object.keys(filteredHierarchy[address]).map(building => (
              <TreeItem
                key={`${address}-${building}`}
                nodeId={`building-${address}-${building}`}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                    <Business sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">{building}</Typography>
                  </Box>
                }
                onClick={() => handleTreeItemClick('building', 'building', { address, building })}
              >
                {filteredHierarchy[address][building].map(floor => (
                  <TreeItem
                    key={floor.floorId}
                    nodeId={`floor-${floor.floorId}`}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                        <Layers sx={{ mr: 1, fontSize: 14 }} />
                        <Typography variant="caption">
                          {floor.floorName || `Floor ${floor.floorNumber}`}
                        </Typography>
                        {selectedLocation && selectedFloor?._id === floor.floorId && (
                          <Chip size="small" label="Selected" color="primary" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    }
                    onClick={() => handleTreeItemClick('floor', 'floor', { 
                      address, 
                      building, 
                      floorId: floor.floorId 
                    })}
                  />
                ))}
              </TreeItem>
            ))}
          </TreeItem>
        ))}
      </TreeView>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Location Hierarchy
        </Typography>
        <Tooltip title="Refresh">
          <IconButton 
            onClick={() => {
              dispatch(fetchLocationHierarchy());
              dispatch(fetchLocations());
            }}
            disabled={loading}
          >
            <Refresh />
          </IconButton>
        </Tooltip>
        {showCreateButton && (
          <Button
            startIcon={<Add />}
            variant="outlined"
            size="small"
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Location
          </Button>
        )}
      </Box>

      {/* Search */}
      <TextField
        placeholder="Search locations..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
        }}
        size="small"
        sx={{ mb: 2 }}
      />

      {/* Cascading Dropdowns */}
      <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Address</InputLabel>
          <Select
            value={selectedAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            label="Address"
          >
            {Object.keys(hierarchy).map(address => (
              <MenuItem key={address} value={address}>
                {address}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedAddress && (
          <FormControl size="small" fullWidth>
            <InputLabel>Building</InputLabel>
            <Select
              value={selectedBuilding}
              onChange={(e) => handleBuildingChange(e.target.value)}
              label="Building"
            >
              {Object.keys(hierarchy[selectedAddress] || {}).map(building => (
                <MenuItem key={building} value={building}>
                  {building}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {selectedBuilding && selectedLocation && (
          <FormControl size="small" fullWidth>
            <InputLabel>Floor</InputLabel>
            <Select
              value={selectedFloorId}
              onChange={(e) => handleFloorChange(e.target.value)}
              label="Floor"
            >
              {selectedLocation.floors.map(floor => (
                <MenuItem key={floor._id} value={floor._id}>
                  {floor.floorName || `Floor ${floor.floorNumber}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Tree View */}
      <Box sx={{ flexGrow: 1, border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          renderTreeView()
        )}
      </Box>

      {/* Create Location Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Location</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Address"
              value={newLocation.address}
              onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Building Name"
              value={newLocation.buildingName}
              onChange={(e) => setNewLocation({ ...newLocation, buildingName: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateLocation}
            variant="contained"
            disabled={!newLocation.address || !newLocation.buildingName}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LocationHierarchy;