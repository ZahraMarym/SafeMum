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
import {
  calcPercentageHeight,
  calcPercentageWidth,
} from "@/lib/utils/dimensions";
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



  // --------------------- 🚀 INIT HOOK ---------------------
  useEffect(() => {
    (async () => {
      setLoading(true);
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
      console.log('Notifications refreshed:', res.data);
      setNotifications(res.data);

      // Also refresh unread count
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

  const itemId = item.notificationId || item.id;
  const isRead = item.isRead === true; // <- normalize

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