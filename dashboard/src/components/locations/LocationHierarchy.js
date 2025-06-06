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
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Input,
} from '@mui/material';
import { TreeView, TreeItem } from '@mui/lab';
import {
  ExpandMore,
  ChevronRight,
  LocationOn,
  Business,
  Layers,
  Add,
  Search,
  Refresh,
  Delete,
  Edit,
  Upload,
  MoreVert,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchLocationHierarchy,
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  addFloorToLocation,
  removeFloorFromLocation,
  uploadFloorPlan,
  setSelectedLocation,
  setSelectedFloor,
  clearError,
} from '../../store/slices/locationsSlice';

const LocationHierarchy = ({ onLocationSelect, showCreateButton = true }) => {
  const dispatch = useDispatch();
  const { hierarchy, locations, selectedLocation, selectedFloor, loading, error } = useSelector(
    (state) => state.locations || {}
  );

  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addFloorDialogOpen, setAddFloorDialogOpen] = useState(false);
  const [uploadFloorPlanDialogOpen, setUploadFloorPlanDialogOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // New location form state
  const [newLocation, setNewLocation] = useState({
    address: '',
    buildingName: '',
    metadata: {},
  });

  // Edit location form state
  const [editLocation, setEditLocation] = useState({
    id: '',
    address: '',
    buildingName: '',
    metadata: {},
  });

  // New floor form state
  const [newFloor, setNewFloor] = useState({
    floorNumber: '',
    floorName: '',
  });

  useEffect(() => {
    console.log('Loading location data...');
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
    
    const location = (locations || []).find(
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
      const floor = (selectedLocation.floors || []).find(f => f._id === floorId);
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
      console.log('Creating location:', newLocation);
      await dispatch(createLocation(newLocation)).unwrap();
      setCreateDialogOpen(false);
      setNewLocation({ address: '', buildingName: '', metadata: {} });
      // Refresh data
      dispatch(fetchLocationHierarchy());
      dispatch(fetchLocations());
    } catch (err) {
      console.error('Failed to create location:', err);
    }
  };

  const handleEditLocation = async () => {
    try {
      await dispatch(updateLocation({ 
        id: editLocation.id, 
        data: {
          address: editLocation.address,
          buildingName: editLocation.buildingName,
          metadata: editLocation.metadata,
        }
      })).unwrap();
      setEditDialogOpen(false);
      setEditLocation({ id: '', address: '', buildingName: '', metadata: {} });
      dispatch(fetchLocationHierarchy());
      dispatch(fetchLocations());
    } catch (err) {
      console.error('Failed to edit location:', err);
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (window.confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      try {
        await dispatch(deleteLocation(locationId)).unwrap();
        dispatch(fetchLocationHierarchy());
        dispatch(fetchLocations());
        // Clear selection if deleted location was selected
        if (selectedLocation && selectedLocation._id === locationId) {
          dispatch(setSelectedLocation(null));
          dispatch(setSelectedFloor(null));
        }
      } catch (err) {
        console.error('Failed to delete location:', err);
      }
    }
  };

  const handleAddFloor = async () => {
    if (!selectedLocation) return;
    
    try {
      await dispatch(addFloorToLocation({
        locationId: selectedLocation._id,
        floorData: newFloor
      })).unwrap();
      setAddFloorDialogOpen(false);
      setNewFloor({ floorNumber: '', floorName: '' });
      dispatch(fetchLocationHierarchy());
      dispatch(fetchLocations());
    } catch (err) {
      console.error('Failed to add floor:', err);
    }
  };

  const handleDeleteFloor = async (floorId) => {
    if (!selectedLocation) return;
    
    if (window.confirm('Are you sure you want to delete this floor? This action cannot be undone.')) {
      try {
        await dispatch(removeFloorFromLocation({
          locationId: selectedLocation._id,
          floorId: floorId
        })).unwrap();
        dispatch(fetchLocationHierarchy());
        dispatch(fetchLocations());
        // Clear floor selection if deleted floor was selected
        if (selectedFloor && selectedFloor._id === floorId) {
          dispatch(setSelectedFloor(null));
        }
      } catch (err) {
        console.error('Failed to delete floor:', err);
      }
    }
  };

  const handleUploadFloorPlan = async () => {
    if (!selectedLocation || !selectedFile) return;
    
    try {
      const formData = new FormData();
      formData.append('floorplan', selectedFile);
      
      await dispatch(uploadFloorPlan({
        locationId: selectedLocation._id,
        formData: formData
      })).unwrap();
      
      setUploadFloorPlanDialogOpen(false);
      setSelectedFile(null);
      dispatch(fetchLocationHierarchy());
      dispatch(fetchLocations());
    } catch (err) {
      console.error('Failed to upload floor plan:', err);
    }
  };

  const handleContextMenu = (event, type, data) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      type,
      data,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleContextMenuAction = (action, data) => {
    handleCloseContextMenu();
    
    switch (action) {
      case 'edit-location':
        const location = locations.find(loc => 
          loc.address === data.address && loc.buildingName === data.building
        );
        if (location) {
          setEditLocation({
            id: location._id,
            address: location.address,
            buildingName: location.buildingName,
            metadata: location.metadata || {},
          });
          setEditDialogOpen(true);
        }
        break;
      case 'delete-location':
        const locationToDelete = locations.find(loc => 
          loc.address === data.address && loc.buildingName === data.building
        );
        if (locationToDelete) {
          handleDeleteLocation(locationToDelete._id);
        }
        break;
      case 'add-floor':
        const locationForFloor = locations.find(loc => 
          loc.address === data.address && loc.buildingName === data.building
        );
        if (locationForFloor) {
          dispatch(setSelectedLocation(locationForFloor));
          setAddFloorDialogOpen(true);
        }
        break;
      case 'upload-floorplan':
        const locationForUpload = locations.find(loc => 
          loc.address === data.address && loc.buildingName === data.building
        );
        if (locationForUpload) {
          dispatch(setSelectedLocation(locationForUpload));
          setUploadFloorPlanDialogOpen(true);
        }
        break;
      case 'delete-floor':
        handleDeleteFloor(data.floorId);
        break;
      default:
        break;
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
    if (!searchTerm) return hierarchy || {};
    
    const filtered = {};
    Object.keys(hierarchy || {}).forEach(address => {
      const buildings = (hierarchy || {})[address] || {};
      const filteredBuildings = {};
      
      Object.keys(buildings || {}).forEach(building => {
        const floors = (buildings || {})[building] || [];
        
        if (
          address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          building.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (floors || []).some(floor => 
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
                  <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5, justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Business sx={{ mr: 1, fontSize: 16 }} />
                      <Typography variant="body2">{building}</Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleContextMenu(e, 'building', { address, building })}
                      sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Box>
                }
                onClick={() => handleTreeItemClick('building', 'building', { address, building })}
              >
                {filteredHierarchy[address][building].map(floor => (
                  <TreeItem
                    key={floor.floorId}
                    nodeId={`floor-${floor.floorId}`}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5, justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Layers sx={{ mr: 1, fontSize: 14 }} />
                          <Typography variant="caption">
                            {floor.floorName || `Floor ${floor.floorNumber}`}
                          </Typography>
                          {selectedLocation && selectedFloor?._id === floor.floorId && (
                            <Chip size="small" label="Selected" color="primary" sx={{ ml: 1 }} />
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleContextMenu(e, 'floor', { 
                            address, 
                            building, 
                            floorId: floor.floorId 
                          })}
                          sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
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
            onClick={() => {
              console.log('Add Location button clicked');
              setCreateDialogOpen(true);
            }}
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
            {Object.keys(hierarchy || {}).map(address => (
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
              {(selectedLocation?.floors || []).map(floor => (
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

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {contextMenu?.type === 'building' && [
          <MenuItem key="edit" onClick={() => handleContextMenuAction('edit-location', contextMenu.data)}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Location</ListItemText>
          </MenuItem>,
          <MenuItem key="add-floor" onClick={() => handleContextMenuAction('add-floor', contextMenu.data)}>
            <ListItemIcon>
              <Add fontSize="small" />
            </ListItemIcon>
            <ListItemText>Add Floor</ListItemText>
          </MenuItem>,
          <MenuItem key="upload" onClick={() => handleContextMenuAction('upload-floorplan', contextMenu.data)}>
            <ListItemIcon>
              <Upload fontSize="small" />
            </ListItemIcon>
            <ListItemText>Upload Floor Plan</ListItemText>
          </MenuItem>,
          <Divider key="divider" />,
          <MenuItem key="delete" onClick={() => handleContextMenuAction('delete-location', contextMenu.data)}>
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete Location</ListItemText>
          </MenuItem>
        ]}
        {contextMenu?.type === 'floor' && [
          <MenuItem key="delete-floor" onClick={() => handleContextMenuAction('delete-floor', contextMenu.data)}>
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete Floor</ListItemText>
          </MenuItem>
        ]}
      </Menu>

      {/* Create Location Dialog */}
      <Dialog open={createDialogOpen} onClose={() => {
        console.log('Create dialog closing');
        setCreateDialogOpen(false);
      }} maxWidth="sm" fullWidth>
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
            onClick={() => {
              console.log('Create button clicked, newLocation:', newLocation);
              console.log('Button disabled?', !newLocation.address || !newLocation.buildingName);
              handleCreateLocation();
            }}
            variant="contained"
            disabled={!newLocation.address || !newLocation.buildingName}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Location</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Address"
              value={editLocation.address}
              onChange={(e) => setEditLocation({ ...editLocation, address: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Building Name"
              value={editLocation.buildingName}
              onChange={(e) => setEditLocation({ ...editLocation, buildingName: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditLocation}
            variant="contained"
            disabled={!editLocation.address || !editLocation.buildingName}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Floor Dialog */}
      <Dialog open={addFloorDialogOpen} onClose={() => setAddFloorDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Floor</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Floor Number"
              value={newFloor.floorNumber}
              onChange={(e) => setNewFloor({ ...newFloor, floorNumber: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Floor Name (Optional)"
              value={newFloor.floorName}
              onChange={(e) => setNewFloor({ ...newFloor, floorName: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddFloorDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddFloor}
            variant="contained"
            disabled={!newFloor.floorNumber}
          >
            Add Floor
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Floor Plan Dialog */}
      <Dialog open={uploadFloorPlanDialogOpen} onClose={() => setUploadFloorPlanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Floor Plan</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Upload a floor plan image for this location. Supported formats: PNG, JPG, JPEG, SVG
            </Typography>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              fullWidth
            />
            {selectedFile && (
              <Typography variant="body2">
                Selected: {selectedFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadFloorPlanDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUploadFloorPlan}
            variant="contained"
            disabled={!selectedFile}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LocationHierarchy;