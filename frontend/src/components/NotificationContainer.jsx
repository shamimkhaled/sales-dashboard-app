// Notification Container Component
import React from 'react';
import { useNotification } from '../context/NotificationContext';
import Notification from './Notification';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-4">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => removeNotification(notification.id)}
          autoClose={notification.autoClose}
          duration={notification.duration}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;