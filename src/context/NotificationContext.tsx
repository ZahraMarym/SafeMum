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
  const [unreadCount, setUnreadCount] = useState({ count: 0 });
  const { notifications: liveNotifications } = useNotificationSignalR();

  // Helper to safely extract unread count from response
  const extractUnreadCount = (response) => {
    try {
      console.log('🔍 Extracting count from response...');
      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Response.data type:', typeof response?.data);

      // Standard Axios response: response.data should contain { count: number }
      if (response && response.data) {
        const data = response.data;
console.log('✅ response of count:', data);
        // Check if data.count exists
        if (typeof data.count === 'number') {
          console.log('✅ Found count:', data.count);
          return { count: data.count };
        }

        // Check if count is nested in data.data
        if (data.data && typeof data.data.count === 'number') {
          console.log('✅ Found count in data.data:', data.data.count);
          return { count: data.data.count };
        }

        // If response.data looks like it has Axios config (malformed response)
        if (data.config || data.headers || data.request) {
          console.error('❌ Response.data contains Axios config - API response is malformed!');
          console.error('🔍 This usually means the API is returning the request instead of data');
          return { count: 0 };
        }

        console.warn('⚠️ Count not found in expected locations. Full data:', data);
        return { count: 0 };
      }

      console.error('❌ Invalid response structure');
      return { count: 0 };
    } catch (error) {
      console.error('❌ Error extracting unread count:', error);
      return { count: 0 };
    }
  };

  // Fetch notifications and unread count on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch notifications
        const notifResponse = await getNotifications();
        console.log('📩 Notifications received:', notifResponse.data?.length || 0);
        setNotifications(notifResponse.data || []);

        // Fetch unread count
        const countResponse = await getUnreadCount();
                console.log("countResponse",countResponse)
        const extractedCount = extractUnreadCount(countResponse);
        setUnreadCount(extractedCount);
        console.log('📊 Unread count set to:', extractedCount.count);
      } catch (error) {
        console.error('❌ Failed to initialize:', error);
        setUnreadCount({ count: 0 });
      }
    };

    init();
  }, []);

  // Refresh unread count helper
  const refreshUnreadCount = async () => {
    try {
      const countResponse = await getUnreadCount();
      const extractedCount = extractUnreadCount(countResponse);
      setUnreadCount(extractedCount);
      return extractedCount;
    } catch (error) {
      console.error('❌ Failed to refresh unread count:', error);
      return { count: 0 };
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      console.log('📤 Marking all as read...');
      await markAllRead();

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

      const newCount = await refreshUnreadCount();
      console.log('✅ All marked as read. New count:', newCount.count);
    } catch (error) {
      console.error('❌ markAllAsRead failed:', error);
    }
  };

  // Mark one as read
  const markOneAsRead = async (id) => {
    if (!id) {
      console.error('❌ Invalid ID:', id);
      return;
    }

    try {
      console.log('📤 Marking as read:', id);
      await markOneRead(id);

      setNotifications((prev) =>
        prev.map((n) =>
          (n.id === id || n.notificationId === id)
            ? { ...n, isRead: true }
            : n
        )
      );

      const newCount = await refreshUnreadCount();
      console.log('✅ Marked as read. New count:', newCount.count);
    } catch (error) {
      console.error('❌ markOneAsRead failed:', error);
    }
  };

  // Remove notification
  const removeNotification = async (id) => {
    if (!id) {
      console.error('❌ Invalid ID:', id);
      return;
    }

    try {
      console.log('📤 Deleting:', id);

      const notification = notifications.find(
        n => n.id === id || n.notificationId === id
      );
      const wasUnread = notification && !notification.isRead;

      await deleteNotification(id);

      setNotifications((prev) =>
        prev.filter((n) => n.id !== id && n.notificationId !== id)
      );

      if (wasUnread) {
        const newCount = await refreshUnreadCount();
        console.log('✅ Deleted unread notification. New count:', newCount.count);
      } else {
        console.log('✅ Deleted read notification');
      }
    } catch (error) {
      console.error('❌ removeNotification failed:', error);
    }
  };

  // Add notification
  const addNotification = async (data) => {
    try {
      console.log('📤 Adding notification:', data);
      const response = await createNotification(data);

      setNotifications((prev) => [response.data, ...prev]);

      const newCount = await refreshUnreadCount();
      console.log('✅ Notification added. New count:', newCount.count);
    } catch (error) {
      console.error('❌ addNotification failed:', error);
    }
  };

  // Handle live notifications from SignalR
  useEffect(() => {
    if (liveNotifications && liveNotifications.length > 0) {
      console.log('🔴 Live notifications:', liveNotifications.length);
      setNotifications((prev) => [...liveNotifications, ...prev]);
      refreshUnreadCount();
    }
  }, [liveNotifications]);

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
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};