import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { NotificationContext } from '../../context/NotificationContext';
import {
  calcPercentageHeight,
  calcPercentageWidth,
} from "@/lib/utils/dimensions";

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function NotificationScreen() {
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markOneAsRead,
    setNotifications,
    removeNotification,
    fetchUnreadCount,
  } = useContext(NotificationContext);

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  console.log('📋 Notifications state:', notifications);
  console.log('📊 Unread count:', unreadCount);

  // --------------------- 🔔 EXPO PUSH TOKEN REGISTRATION ---------------------
  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission Required', 'Failed to get push notification permissions!');
        return;
      }

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

        if (!projectId) {
          throw new Error('Project ID not found');
        }

        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('📱 Expo Push Token:', token);
      } catch (error) {
        console.error('Error getting push token:', error);
        Alert.alert('Error', 'Could not get push notification token');
      }
    } else {
      Alert.alert('Info', 'Must use physical device for Push Notifications');
    }

    return token;
  }

  // --------------------- 📝 REGISTER TOKEN WITH BACKEND ---------------------
  const registerDeviceToken = async (token: string) => {
    try {
      await SecureStore.setItemAsync('expoPushToken', token);
      console.log('✅ Token saved to SecureStore');

      // TODO: Send token to your backend
      // await yourApiCall.registerToken(token);
    } catch (error) {
      console.error('❌ Error saving token:', error);
    }
  };

  // --------------------- 🚀 INIT HOOK ---------------------
  useEffect(() => {
    (async () => {
      setLoading(true);

      // Register for push notifications
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        await registerDeviceToken(token);
      }

      setLoading(false);
    })();

    // 📬 Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received in foreground:', notification);

      // Add to local state if needed
      const newNotification = {
        title: notification.request.content.title || 'New Notification',
        message: notification.request.content.body || '',
        createdAt: new Date().toISOString(),
        isRead: false,
        justCameFromSignalR: true,
      };

      // You can add this to your notifications context if needed
      // setNotifications(prev => [newNotification, ...prev]);
    });

    // 📥 Listen for user interaction with notification (tap)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📥 Notification tapped:', response);

      // Handle navigation or other actions when user taps notification
      const data = response.notification.request.content.data;
      // Navigate based on data if needed
      // navigation.navigate('SomeScreen', { ...data });
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // --------------------- 🔁 REFRESH HANDLER ---------------------
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { getNotifications } = require('../../api/notificationApi');
      const res = await getNotifications();
      console.log('Notifications refreshed:', res.data);
      setNotifications(res.data);

      if (fetchUnreadCount) {
        await fetchUnreadCount();
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
      Alert.alert('Error', 'Unable to fetch notifications. Please try again later.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  // --------------------- 🎯 SIGNALR LISTENER HOOK ---------------------
  useEffect(() => {
    notifications.forEach(async (n) => {
      if (!n.isRead && n.justCameFromSignalR) {
        // Schedule a local notification for SignalR messages
        await Notifications.scheduleNotificationAsync({
          content: {
            title: n.title || 'New Notification',
            body: n.message || '',
            data: { notificationId: n.notificationId || n.id },
            sound: true,
          },
          trigger: null, // Show immediately
        });
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

    const itemId = item.notificationId || item.id;
    const isRead = item.isRead === true;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: isRead ? '#f4f4f4' : '#d9fdd3' },
        ]}
        onPress={() => {
          if (!isRead && itemId) {
            console.log('🔵 Marking as read, ID:', itemId);
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

        <Text style={styles.message}>
          {item.message || 'No message body'}
        </Text>

        <View style={styles.actions}>
          {!isRead && itemId && (
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
                      onPress: () => removeNotification(itemId),
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
  container: {
    flex: 1,
    backgroundColor: "#F6F6FF",
    padding: calcPercentageWidth(5),
  },

  header: {
    marginTop: calcPercentageHeight(3),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingBottom: calcPercentageHeight(2),
  },

  headerTitle: {
    fontSize: calcPercentageWidth(5.5),
    fontWeight: "700",
    color: "#333",
  },

  markAll: {
    color: "#007BFF",
    fontWeight: "600",
    fontSize: calcPercentageWidth(3.8),
  },

  card: {
    padding: calcPercentageWidth(4),
    borderRadius: calcPercentageWidth(3),
    marginBottom: calcPercentageHeight(1.5),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    backgroundColor: "#fff",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: calcPercentageHeight(0.5),
  },

  title: {
    fontWeight: "700",
    fontSize: calcPercentageWidth(4),
    flex: 1,
    marginRight: calcPercentageWidth(2),
    color: "#000",
  },

  time: {
    fontSize: calcPercentageWidth(3),
    color: "#777",
  },

  message: {
    fontSize: calcPercentageWidth(3.6),
    color: "#444",
    marginTop: calcPercentageHeight(0.6),
    lineHeight: calcPercentageHeight(2.8),
  },

  actions: {
    flexDirection: "row",
    marginTop: calcPercentageHeight(1),
  },

  readBtn: {
    color: "#007BFF",
    marginRight: calcPercentageWidth(4),
    fontWeight: "600",
    fontSize: calcPercentageWidth(3.6),
  },

  deleteBtn: {
    color: "#FF3B30",
    fontWeight: "600",
    fontSize: calcPercentageWidth(3.6),
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: calcPercentageHeight(6),
  },

  loadingText: {
    marginTop: calcPercentageHeight(1),
    color: "#555",
    fontSize: calcPercentageWidth(3.8),
  },

  emptyText: {
    color: "#777",
    fontSize: calcPercentageWidth(4),
  },
});