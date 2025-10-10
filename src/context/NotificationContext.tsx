import React, { createContext, useEffect, useState } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
  deleteNotification,
  createNotification,
} from '../api/notificationApi';
import useNotificationSignalR from '../SignalR/useNotificationSignalR';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState({ count: 0 }); // Initialize as object
  const { notifications: liveNotifications } = useNotificationSignalR();

  // Fetch from API on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await getNotifications();
        setNotifications(res.data);

        const countRes = await getUnreadCount();
        // Store the entire response object
        setUnreadCount(countRes.data);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();
  }, []);

  // Update other places where you fetch unread count
  const markAllAsRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      const countRes = await getUnreadCount();
      setUnreadCount(countRes.data); // Store the object
      console.log("unreadCount",countRes.data)
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Merge live updates from SignalR
  useEffect(() => {
    if (liveNotifications.length) {
      setNotifications((prev) => [...prev, ...liveNotifications]);
    }
  }, [liveNotifications]);


const markOneAsRead = async (id) => {
  if (!id) {
    console.error('❌ Cannot mark as read: Invalid ID', id);
    return;
  }

  try {
    console.log('📤 Marking notification as read:', id);
    await markOneRead(id);

    setNotifications((prevNotifications) =>
      prevNotifications.map((n) =>
        (n.id === id || n.notificationId === id) ? { ...n, isRead: true } : n
      )
    );
    console.log('✅ Notification marked as read');
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
  }
};

const removeNotification = async (id) => {
  if (!id) {
    console.error('❌ Cannot delete: Invalid ID', id);
    return;
  }

  try {
    console.log('📤 Deleting notification:', id);
    await deleteNotification(id);

    setNotifications((prevNotifications) =>
      prevNotifications.filter((n) => n.id !== id && n.notificationId !== id)
    );
    console.log('✅ Notification deleted');
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
  }
};

  const addNotification = async (data) => {
    try {
      const res = await createNotification(data);
      setNotifications((prev) => [res.data, ...prev]);
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllAsRead,
        setNotifications,
        markOneAsRead,
        removeNotification,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
