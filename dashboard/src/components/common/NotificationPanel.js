import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar, Alert, Stack } from '@mui/material';
import { removeNotification } from '../../store/slices/uiSlice';

function NotificationPanel() {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.ui.notifications);

  const handleClose = (id) => {
    dispatch(removeNotification(id));
  };

  // Get the latest 3 notifications
  const visibleNotifications = notifications.slice(0, 3);

  return (
    <Stack spacing={1} sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1400 }}>
      {visibleNotifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.type === 'error' ? 10000 : 6000}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{ width: '100%', minWidth: 300 }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
}

export default NotificationPanel; 