import React, { useState } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Tabs, 
  Tab,
  Divider 
} from '@mui/material';
import {
  Tune as CoverageIcon,
  Settings as GeneralIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import CoverageSettings from '../components/settings/CoverageSettings';
import CoverageAreaManager from '../components/settings/CoverageAreaManager';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function Settings() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Paper sx={{ mt: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<CoverageIcon />} 
            label="Coverage" 
            iconPosition="start"
          />
          <Tab 
            icon={<GeneralIcon />} 
            label="General" 
            iconPosition="start"
            disabled
          />
          <Tab 
            icon={<NotificationsIcon />} 
            label="Notifications" 
            iconPosition="start"
            disabled
          />
          <Tab 
            icon={<SecurityIcon />} 
            label="Security" 
            iconPosition="start"
            disabled
          />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Box p={3}>
            <CoverageSettings />
            
            <Divider sx={{ my: 4 }} />
            
            <CoverageAreaManager />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            <Typography variant="body1" color="text.secondary">
              General application settings will be available in a future update.
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Notification Settings
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Notification preferences will be available in a future update.
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Security configuration will be available in a future update.
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}

export default Settings; 