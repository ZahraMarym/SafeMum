import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import * as SecureStore from 'expo-secure-store';
import { NotificationContext } from '../../context/NotificationContext';

export default function NotificationScreen() {
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markOneAsRead,
    setNotifications,
    removeNotification,
    fetchUnreadCount, // Get the refresh function
  } = useContext(NotificationContext);

  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  console.log('📋 Notifications state:', notifications);
  console.log('📊 Unread count:', unreadCount);

  // --------------------- 🔔 NOTIFEE CONFIG ---------------------
  const displayLocalNotification = async (title: string, body: string) => {
    try {
      await notifee.requestPermission();

      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
        },
      });
    } catch (err) {
      console.error('❌ Notifee error:', err);
    }
  };

  // --------------------- 🔥 FCM TOKEN ---------------------
  const generateDeviceFCMToken = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      if (
        authStatus !== messaging.AuthorizationStatus.AUTHORIZED &&
        authStatus !== messaging.AuthorizationStatus.PROVISIONAL
      ) {
        console.log('❌ Push notification permission not granted');
        return null;
      }

      const token = await messaging().getToken();
      console.log('🔥 FCM Token generated:', token);
      return token;
    } catch (error) {
      console.error('❌ Error generating FCM token:', error);
      return null;
    }
  };

 const registerDeviceToken = async (token: string) => {
     try {
       const storedToken = await SecureStore.getItemAsync('fcmToken');
       if (storedToken === token) return; // Skip if already stored

       const accessToken = await SecureStore.getItemAsync('accessToken');
       const storedUser = await SecureStore.getItemAsync('user');
       const currentUser = storedUser ? JSON.parse(storedUser) : null;
       const senderId = currentUser?.userId;

       if (!accessToken || !senderId) throw new Error('Missing auth details');

       // Use the correct base URL from your notification API
       const apiUrl = `${process.env.EXPO_PUBLIC_URL_CHAT}/api/notification/register-device-token`;

       const axios = require('axios');
       const res = await axios.post(
         apiUrl,
         { userId: senderId, deviceToken: token },
         {
           headers: {
             Accept: 'application/json',
             'Content-Type': 'application/json',
             Authorization: `Bearer ${accessToken}`,
           },
         }
       );

       console.log('✅ Device token registered:', res.status);
       await SecureStore.setItemAsync('fcmToken', token);
     } catch (error) {
       console.error('❌ Error registering token:', error);
     }
   };

  // --------------------- 🚀 INIT HOOK ---------------------
  useEffect(() => {
    (async () => {
      setLoading(true);
      const token = await generateDeviceFCMToken();
      if (token) {
        setFcmToken(token);
        await registerDeviceToken(token);
      }
      setLoading(false);
    })();

    // 🔁 Token refresh
    const unsubscribeRefresh = messaging().onTokenRefresh(async (newToken) => {
      console.log('🔁 FCM token refreshed:', newToken);
      setFcmToken(newToken);
      await registerDeviceToken(newToken);
    });

    // 📬 Foreground message handler
    const unsubscribeMessage = messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title || 'New Notification';
      const body = remoteMessage.notification?.body || '';
      console.log('📬 Foreground FCM message:', remoteMessage);
      await displayLocalNotification(title, body);
    });

    // 📥 Background / quit state handling
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      const title = remoteMessage.notification?.title || 'Background Notification';
      const body = remoteMessage.notification?.body || '';
      await displayLocalNotification(title, body);
    });

    return () => {
      unsubscribeRefresh();
      unsubscribeMessage();
    };
  }, []);

  // --------------------- 🔁 REFRESH HANDLER ---------------------
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Import the API function
      const { getNotifications } = require('../../api/notificationApi');
      const res = await getNotifications();
      console.log('📩 Notifications refreshed:', res.data);
      setNotifications(res.data);

      // Also refresh unread count
      if (fetchUnreadCount) {
        await fetchUnreadCount();
      }
    } catch (err) {
      console.error('❌ Fetch notifications error:', err);
      Alert.alert('Error', 'Unable to fetch notifications. Please try again later.');
    } finally {
      setRefreshing(false);
    }
  };

  // --------------------- 🎯 SIGNALR LISTENER HOOK ---------------------
  useEffect(() => {
    notifications.forEach((n) => {
      if (!n.isRead && n.justCameFromSignalR) {
        displayLocalNotification(n.title, n.message);
      }
    });
  }, [notifications]);

  // --------------------- 🧭 UI ---------------------
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#09A6A3" />
        <Text style={styles.loadingText}>Loading notifications…</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    console.log('📋 Rendering notification item:', JSON.stringify(item, null, 2));

    // Use notificationId or id, whichever is available
    const itemId = item.notificationId || item.id;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: item.isRead ? '#f4f4f4' : '#d9fdd3' },
        ]}
        onPress={() => {
          // Mark as read when tapped if unread
          if (!item.isRead && itemId) {
            markOneAsRead(itemId);
          }
        }}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{item.title || 'Untitled'}</Text>
          <Text style={styles.time}>
            {new Date(item.createdAt || Date.now()).toLocaleString()}
          </Text>
        </View>
        <Text style={styles.message}>{item.message || 'No message body'}</Text>

        <View style={styles.actions}>
          {!item.isRead && itemId && (
            <TouchableOpacity
              onPress={() => {
                console.log('🔵 Marking as read, ID:', itemId);
                markOneAsRead(itemId);
              }}
            >
              <Text style={styles.readBtn}>Mark Read</Text>
            </TouchableOpacity>
          )}
          {itemId && (
            <TouchableOpacity
              onPress={() => {
                console.log('🔴 Deleting, ID:', itemId);
                Alert.alert(
                  'Delete Notification',
                  'Are you sure you want to delete this notification?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => removeNotification(itemId)
                    },
                  ]
                );
              }}
            >
              <Text style={styles.deleteBtn}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAll}>
            Mark All Read ({unreadCount?.count ?? 0})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item, index) =>
          item.notificationId?.toString() ||
          item.id?.toString() ||
          index.toString()
        }
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No notifications yet 🚀</Text>
          </View>
        }
      />
    </View>
  );
}

// --------------------- 💅 STYLES ---------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6FF', padding: 20 },
  header: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  markAll: {
    color: '#007BFF',
    fontWeight: '600',
  },
  card: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { fontWeight: '700', fontSize: 16, flex: 1, marginRight: 10 },
  time: { fontSize: 12, color: '#777' },
  message: { fontSize: 14, color: '#444', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 10 },
  readBtn: { color: '#007BFF', marginRight: 20, fontWeight: '600' },
  deleteBtn: { color: '#FF3B30', fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 10, color: '#555' },
  emptyText: { color: '#777', fontSize: 16 },
});