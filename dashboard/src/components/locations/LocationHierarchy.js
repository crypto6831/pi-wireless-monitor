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
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
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

  // Auto-expand to selected location/floor when data loads
  useEffect(() => {
    if (selectedLocation && selectedFloor && hierarchy) {
      const addressNodeId = `address-${selectedLocation.address}`;
      const buildingNodeId = `building-${selectedLocation.address}-${selectedLocation.buildingName}`;
      
      const newExpandedNodes = [addressNodeId, buildingNodeId];
      setExpandedNodes(newExpandedNodes);
    } else if (selectedLocation && hierarchy) {
      const addressNodeId = `address-${selectedLocation.address}`;
      const buildingNodeId = `building-${selectedLocation.address}-${selectedLocation.buildingName}`;
      
      const newExpandedNodes = [addressNodeId, buildingNodeId];
      setExpandedNodes(newExpandedNodes);
    }
  }, [selectedLocation, selectedFloor, hierarchy]);

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
    try {
      console.log('LocationHierarchy - Floor change:', { floorId, selectedLocation });
      setSelectedFloorId(floorId);
      
      if (selectedLocation && selectedLocation.floors) {
        const floor = selectedLocation.floors.find(f => f._id === floorId);
        console.log('Found floor:', floor);
        if (floor) {
          dispatch(setSelectedFloor(floor));
          if (onLocationSelect) {
            onLocationSelect(selectedLocation, floor);
          }
        } else {
          console.warn('Floor not found in selectedLocation.floors:', floorId);
        }
      } else {
        console.warn('No selectedLocation or floors array');
      }
    } catch (err) {
      console.error('Error in handleFloorChange:', err);
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
    if (!selectedLocation || !selectedFile || !selectedFloor) return;
    
    try {
      const formData = new FormData();
      formData.append('floorPlan', selectedFile); // Changed from 'floorplan' to 'floorPlan'
      formData.append('floorId', selectedFloor._id); // Added required floorId
      
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
    try {
      console.log('TreeItem click:', { nodeId, nodeType, data });
      
      // Auto-expand nodes as user navigates
      let newExpandedNodes = [...expandedNodes];
      
      if (nodeType === 'address') {
        const addressNodeId = `address-${data.address}`;
        if (!newExpandedNodes.includes(addressNodeId)) {
          newExpandedNodes.push(addressNodeId);
        }
        setExpandedNodes(newExpandedNodes);
        handleAddressChange(data.address);
        
      } else if (nodeType === 'building') {
        const addressNodeId = `address-${data.address}`;
        const buildingNodeId = `building-${data.address}-${data.building}`;
        
        if (!newExpandedNodes.includes(addressNodeId)) {
          newExpandedNodes.push(addressNodeId);
        }
        if (!newExpandedNodes.includes(buildingNodeId)) {
          newExpandedNodes.push(buildingNodeId);
        }
        setExpandedNodes(newExpandedNodes);
        
        handleAddressChange(data.address);
        handleBuildingChange(data.building);
        
      } else if (nodeType === 'floor') {
        const addressNodeId = `address-${data.address}`;
        const buildingNodeId = `building-${data.address}-${data.building}`;
        
        if (!newExpandedNodes.includes(addressNodeId)) {
          newExpandedNodes.push(addressNodeId);
        }
        if (!newExpandedNodes.includes(buildingNodeId)) {
          newExpandedNodes.push(buildingNodeId);
        }
        setExpandedNodes(newExpandedNodes);
        
        handleAddressChange(data.address);
        handleBuildingChange(data.building);
        handleFloorChange(data.floorId);
      }
    } catch (err) {
      console.error('Error in handleTreeItemClick:', err);
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
    
    if (Object.keys(filteredHierarchy).length === 0) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, color: 'text.secondary' }}>
          <LocationOn sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 'No locations match your search' : 'No locations found'}
          </Typography>
          {!searchTerm && showCreateButton && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Click "Add Location" to create your first location
            </Typography>
          )}
        </Box>
      );
    }
    
    return (
      <SimpleTreeView
        defaultCollapseIcon={<ExpandMore />}
        defaultExpandIcon={<ChevronRight />}
        expandedItems={expandedNodes}
        onExpandedItemsChange={(event, nodeIds) => setExpandedNodes(nodeIds)}
        sx={{ flexGrow: 1, overflowY: 'auto' }}
      >
        {Object.keys(filteredHierarchy).map(address => {
          const isAddressSelected = selectedLocation?.address === address;
          return (
            <TreeItem
              key={`address-${address}`}
              itemId={`address-${address}`}
              label={
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  py: 1, 
                  px: 1,
                  borderRadius: 1,
                  bgcolor: isAddressSelected ? 'primary.50' : 'transparent',
                  '&:hover': { bgcolor: isAddressSelected ? 'primary.100' : 'action.hover' }
                }}>
                  <LocationOn sx={{ 
                    mr: 1.5, 
                    fontSize: 20, 
                    color: isAddressSelected ? 'primary.main' : 'text.secondary'
                  }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: isAddressSelected ? 600 : 400,
                      color: isAddressSelected ? 'primary.main' : 'text.primary'
                    }}
                  >
                    {address}
                  </Typography>
                </Box>
              }
              onClick={(e) => {
                e.stopPropagation();
                handleTreeItemClick('address', 'address', { address });
              }}
            >
              {Object.keys(filteredHierarchy[address]).map(building => {
                const isBuildingSelected = selectedLocation?.address === address && selectedLocation?.buildingName === building;
                return (
                  <TreeItem
                    key={`${address}-${building}`}
                    itemId={`building-${address}-${building}`}
                    label={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        py: 1, 
                        px: 1,
                        borderRadius: 1,
                        bgcolor: isBuildingSelected ? 'primary.50' : 'transparent',
                        '&:hover': { bgcolor: isBuildingSelected ? 'primary.100' : 'action.hover' },
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Business sx={{ 
                            mr: 1.5, 
                            fontSize: 18, 
                            color: isBuildingSelected ? 'primary.main' : 'text.secondary'
                          }} />
                          <Typography 
                            variant="body2"
                            sx={{ 
                              fontWeight: isBuildingSelected ? 600 : 400,
                              color: isBuildingSelected ? 'primary.main' : 'text.primary'
                            }}
                          >
                            {building}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e, 'building', { address, building });
                          }}
                          sx={{ 
                            opacity: 0.6, 
                            '&:hover': { opacity: 1, bgcolor: 'action.hover' }
                          }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTreeItemClick('building', 'building', { address, building });
                    }}
                  >
                    {filteredHierarchy[address][building].map((floor, floorIndex) => {
                      console.log('Floor object in tree:', floor);
                      // Find the actual floor ID from selectedLocation.floors by matching floorNumber
                      const actualFloor = selectedLocation?.floors?.find(f => 
                        f.floorNumber === floor.floorNumber && 
                        selectedLocation._id === floor.locationId
                      );
                      const floorId = actualFloor?._id || `${floor.locationId}-${floor.floorNumber}`;
                      console.log('Floor ID computed:', { floor, actualFloor, floorId });
                      const isFloorSelected = selectedFloor?._id === floorId;
                      return (
                        <TreeItem
                          key={`floor-${floorId}`}
                          itemId={`floor-${floorId}`}
                          label={
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              py: 1, 
                              px: 1,
                              borderRadius: 1,
                              bgcolor: isFloorSelected ? 'primary.50' : 'transparent',
                              '&:hover': { bgcolor: isFloorSelected ? 'primary.100' : 'action.hover' },
                              justifyContent: 'space-between'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Layers sx={{ 
                                  mr: 1.5, 
                                  fontSize: 16, 
                                  color: isFloorSelected ? 'primary.main' : 'text.secondary'
                                }} />
                                <Typography 
                                  variant="body2"
                                  sx={{ 
                                    fontWeight: isFloorSelected ? 600 : 400,
                                    color: isFloorSelected ? 'primary.main' : 'text.primary'
                                  }}
                                >
                                  {floor.floorName || `Floor ${floor.floorNumber}`}
                                </Typography>
                                {isFloorSelected && (
                                  <Chip 
                                    size="small" 
                                    label="Active" 
                                    color="primary" 
                                    variant="filled"
                                    sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                                  />
                                )}
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContextMenu(e, 'floor', { 
                                    address, 
                                    building, 
                                    floorId: floorId
                                  });
                                }}
                                sx={{ 
                                  opacity: 0.6, 
                                  '&:hover': { opacity: 1, bgcolor: 'action.hover' }
                                }}
                              >
                                <MoreVert fontSize="small" />
                              </IconButton>
                            </Box>
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTreeItemClick('floor', 'floor', { 
                              address, 
                              building, 
                              floorId: floorId
                            });
                          }}
                        />
                      );
                    })}
                  </TreeItem>
                );
              })}
            </TreeItem>
          );
        })}
      </SimpleTreeView>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
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
        </Box>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {showCreateButton && (
            <Button
              startIcon={<Add />}
              variant="contained"
              fullWidth
              onClick={() => {
                console.log('Add Location button clicked');
                setCreateDialogOpen(true);
              }}
            >
              Add Location
            </Button>
          )}
          
          {selectedLocation && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<Layers />}
                variant="outlined"
                fullWidth
                onClick={() => setAddFloorDialogOpen(true)}
              >
                Add Floor
              </Button>
              <Button
                startIcon={<Upload />}
                variant="outlined"
                fullWidth
                onClick={() => setUploadFloorPlanDialogOpen(true)}
                disabled={!selectedFloor}
              >
                Upload Floor Plan
              </Button>
            </Box>
          )}
        </Box>
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

      {/* Selection Summary */}
      {(selectedLocation || selectedFloor) && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: 1, borderColor: 'primary.200' }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Current Selection
          </Typography>
          {selectedLocation && (
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <LocationOn sx={{ fontSize: 16, mr: 1 }} />
              {selectedLocation.address}
            </Typography>
          )}
          {selectedLocation && (
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Business sx={{ fontSize: 16, mr: 1 }} />
              {selectedLocation.buildingName}
            </Typography>
          )}
          {selectedFloor && (
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
              <Layers sx={{ fontSize: 16, mr: 1 }} />
              {selectedFloor.floorName || `Floor ${selectedFloor.floorNumber}`}
            </Typography>
          )}
        </Box>
      )}

      {/* Tree View */}
      <Box sx={{ flexGrow: 1, border: 1, borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: 'background.paper' }}>
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
        {contextMenu?.type === 'building' && (
          <>
            <MenuItem onClick={() => handleContextMenuAction('edit-location', contextMenu.data)}>
              <ListItemIcon>
                <Edit fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit Location</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleContextMenuAction('add-floor', contextMenu.data)}>
              <ListItemIcon>
                <Add fontSize="small" />
              </ListItemIcon>
              <ListItemText>Add Floor</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleContextMenuAction('upload-floorplan', contextMenu.data)}>
              <ListItemIcon>
                <Upload fontSize="small" />
              </ListItemIcon>
              <ListItemText>Upload Floor Plan</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => handleContextMenuAction('delete-location', contextMenu.data)}>
              <ListItemIcon>
                <Delete fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete Location</ListItemText>
            </MenuItem>
          </>
        )}
        {contextMenu?.type === 'floor' && (
          <MenuItem onClick={() => handleContextMenuAction('delete-floor', contextMenu.data)}>
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete Floor</ListItemText>
          </MenuItem>
        )}
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