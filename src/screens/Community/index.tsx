import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function CommunityScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const router = useRouter();

  // Fetch all users (for Add User modal)
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_URL}/communication/get-all-user?PageSize=100&PageNumber=1`,
        {
          headers: {
            accept: '/',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = response.data?.data || [];
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (modalVisible) fetchUsers();
  }, [modalVisible]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    const filtered = users.filter((user) =>
      user.name?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const handleUserSelect = (user) => {
    setModalVisible(false);
    router.push({
      pathname: '/(tabs)/(community)/chat',
      params: { user: JSON.stringify(user) },
    });
  };

  // Fetch conversations
  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const storedUser = await SecureStore.getItemAsync('user');
      const currentUser = JSON.parse(storedUser);
      const senderId = currentUser.userId;

      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_URL}/communication/get-conversation-by-userid?Id=${senderId}`,
        {
          headers: {
            accept: '/',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("response of conversations", response.data);
      setConversations(response.data);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  };

// Inside your component:
useFocusEffect(
  useCallback(() => {
    fetchConversations();
  }, [])
);

  return (
    <View style={styles.container}>
      {/* Add User Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={26} color="#fff" />
        <Text style={styles.addButtonText}>Add User</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            placeholder="Search user"
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchBar}
          />

          {loading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => handleUserSelect(item)}
                >
                  <Text style={styles.userText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Conversation List */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.conversationItem}
            onPress={async () => {
              try {
                const token = await SecureStore.getItemAsync("accessToken");

                // Optional: Fetch full receiver details
                const receiverRes = await axios.get(
                  `${process.env.EXPO_PUBLIC_URL}/communication/get-user-by-id?Id=${item.userId}`,
                  {
                    headers: {
                      accept: '/',
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                const receiverUser = receiverRes.data;

              const chatPayload = {
                id: item.userId,
                name: receiverUser.name,
                email: receiverUser.email,
                phone: receiverUser.phoneNumber,
              };

            console.log("chat paylaod", chatPayload)

                router.push({
                  pathname: '/(tabs)/(community)/chat',
                  params: { user: JSON.stringify(chatPayload) },
                });
              } catch (err) {
                console.error("Error preparing chat:", err);
              }
            }}

          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.userName?.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </Text>
            </View>
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>{item.userName}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage || 'No messages yet'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#825DEF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  addButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  userItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  userText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  closeBtn: {
    marginTop: 24,
    alignSelf: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#1E40AF',
    fontWeight: '600',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
});