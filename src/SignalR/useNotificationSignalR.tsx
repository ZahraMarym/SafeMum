import { useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import * as SecureStore from 'expo-secure-store';

const useNotificationSignalR = () => {
  const connectionRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connect = async () => {
      try {
        // 1️⃣ Get token from SecureStore
        const token = await SecureStore.getItemAsync('accessToken');
        if (!token) {
          console.warn('⚠️ No access token found in SecureStore');
          return;
        }

        // 2️⃣ Build SignalR connection
        const conn = new HubConnectionBuilder()
          .withUrl(`${process.env.EXPO_PUBLIC_URL_CHAT}/notificationHub`, {
            accessTokenFactory: () => token,
          })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Information)
          .build();

        // 3️⃣ Event listeners
        conn.on('NewNotification', (data) => {
          console.log('🔔 NewNotification:', data);
          setNotifications((prev) => [data, ...prev]);
        });

        conn.on('NotificationRead', (data) => {
          console.log('📖 NotificationRead:', data);
          setNotifications((prev) =>
            prev.map((n) => (n.id === data.id ? { ...n, isRead: true } : n))
          );
        });

        conn.on('NotificationDeleted', (data) => {
          console.log('🗑 NotificationDeleted:', data);
          setNotifications((prev) => prev.filter((n) => n.id !== data.id));
        });

        // 4️⃣ Start connection
        await conn.start();
        setIsConnected(true);
        console.log('✅ SignalR connected to Notifications Hub');

        connectionRef.current = conn;
      } catch (err) {
        console.error('❌ SignalR connection error:', err);
      }
    };

    connect();

    // 5️⃣ Cleanup on unmount
    return () => {
      connectionRef.current?.stop();
      setIsConnected(false);
      console.log('🔌 SignalR disconnected');
    };
  }, []);

  // Manual push if you want to simulate or locally add notifications
  const pushLocalNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  return { notifications, setNotifications, isConnected, pushLocalNotification };
};

export default useNotificationSignalR;
