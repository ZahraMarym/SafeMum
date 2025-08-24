import { Text } from "@/components/Text";
import { TextBold } from "@/components/TextBold";
import { TextInput } from "@/components/TextInput";
import i18n from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { useSelector } from "react-redux";

export default function CommunityScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const router = useRouter();
  const { language, textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';

  useEffect(() => {
    i18n.changeLanguage(language); // Update i18n language dynamically
  }, [language]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_URL}/communication/get-all-user?PageSize=100&PageNumber=1`,
        {
          headers: { accept: "/", Authorization: `Bearer ${token}` },
        }
      );
      const data = response.data?.data || [];
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
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
      pathname: "/(tabs)/(community)/chat",
      params: { user: JSON.stringify(user) },
    });
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const storedUser = await SecureStore.getItemAsync("user");
      const currentUser = JSON.parse(storedUser);
      const senderId = currentUser.userId;

      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_URL}/communication/get-conversation-by-userid?Id=${senderId}`,
        {
          headers: { accept: "/", Authorization: `Bearer ${token}` },
        }
      );
      console.log("get-conversation-by-userid", response.data);
      setConversations(response.data);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const storedUser = await SecureStore.getItemAsync("user");
      const currentUser = JSON.parse(storedUser);
      const senderId = currentUser.userId;

      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_URL}/communication/get-all-user-groups?Id=${senderId}`,
        {
          headers: { accept: "/", Authorization: `Bearer ${token}` },
        }
      );
      setGroups(response.data);
    } catch (err) {
      console.error("Error fetching groups:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      fetchGroups();
    }, [])
  );

  return (
    <View style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      {/* Add User Button */}
      <TouchableOpacity
        style={[styles.addButton, {
          flexDirection: isRTL ? "row-reverse" : "row"
        }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle-outline" size={26} color="#fff" />
        <Text style={styles.addButtonText}>{i18n.t('addUser')}</Text>
      </TouchableOpacity>

      {/* Add User Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={[styles.modalContainer, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          <TextInput
            placeholder={i18n.t('searchUser')}
            value={searchQuery}
            onChangeText={handleSearch}
            style={[styles.searchBar, { textAlign: isRTL ? 'right' : 'left' }]}
          />
          {loading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.userItem, {
                    alignItems: isRTL ? 'flex-end' : 'flex-start'
                  }]}
                  onPress={() => handleUserSelect(item)}
                >
                  <Text style={[styles.userText, {
                    textAlign: isRTL ? 'right' : 'left'
                  }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>{i18n.t('close')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Scrollable Split Screen */}
      <View style={styles.splitContainer}>
        {/* Conversations Section */}
        <View style={styles.halfContainer}>
          <TextBold style={[styles.sectionTitle, {
            textAlign: isRTL ? 'right' : 'left'
          }]}>
            {i18n.t('conversations')}
          </TextBold>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.conversationItem, {
                  flexDirection: isRTL ? "row-reverse" : "row"
                }]}
                onPress={async () => {
                  try {
                    const token = await SecureStore.getItemAsync("accessToken");
                    const receiverRes = await axios.get(
                      `${process.env.EXPO_PUBLIC_URL}/communication/get-user-by-id?Id=${item.userId}`,
                      {
                        headers: { accept: "/", Authorization: `Bearer ${token}` },
                      }
                    );
                    const receiverUser = receiverRes.data;
                    const chatPayload = {
                      id: item.userId,
                      name: receiverUser.name,
                      email: receiverUser.email,
                      phone: receiverUser.phoneNumber,
                    };
                    router.push({
                      pathname: "/(tabs)/(community)/chat",
                      params: { user: JSON.stringify(chatPayload) },
                    });
                  } catch (err) {
                    console.error("Error preparing chat:", err);
                  }
                }}
              >
                <View style={[styles.avatar, {
                  marginRight: isRTL ? 0 : 12,
                  marginLeft: isRTL ? 12 : 0
                }]}>
                  <Text style={styles.avatarText}>
                    {item.userName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.chatInfo, {
                  alignItems: isRTL ? 'flex-end' : 'flex-start'
                }]}>
                  <Text style={[styles.chatName, {
                    textAlign: isRTL ? 'right' : 'left'
                  }]}>
                    {item.userName}
                  </Text>
                  <Text style={[styles.lastMessage, {
                    textAlign: isRTL ? 'right' : 'left'
                  }]} numberOfLines={1}>
                    {item.lastMessage || i18n.t('noMessages')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Groups Section */}
        <View style={styles.halfContainer}>
          <TextBold style={[styles.sectionTitle, {
            textAlign: isRTL ? 'right' : 'left'
          }]}>
            {i18n.t('groupChats')}
          </TextBold>
          <FlatList
            data={groups}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.groupItem, {
                  alignItems: isRTL ? 'flex-end' : 'flex-start'
                }]}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/(community)/group-chat",
                    params: { user: JSON.stringify(item) },
                  })
                }
              >
                <Text style={[styles.groupName, {
                  textAlign: isRTL ? 'right' : 'left'
                }]}>
                  {item.name}
                </Text>
                <Text style={[styles.lastMessage, {
                  textAlign: isRTL ? 'right' : 'left'
                }]}>
                  {item.lastMessageContent || i18n.t('noMessages')}
                </Text>
                <Text style={[styles.lastMessageTime, {
                  textAlign: isRTL ? 'right' : 'left'
                }]}>
                  {item.lastMessageTime || i18n.t('noTimeAvailable')}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F9FAFB"
  },
  addButton: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#825DEF",
    marginBottom: 10,
  },
  addButtonText: { fontSize: 18, color: "#fff", fontWeight: "600" },
  modalContainer: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  searchBar: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#F3F4F6",
    marginBottom: 16,
  },
  userItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  userText: { fontSize: 16, fontWeight: "500", color: "#111827" },
  closeBtn: {
    marginTop: 24,
    alignSelf: "center",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeText: { fontSize: 16, color: "#1E40AF", fontWeight: "600" },
  splitContainer: { flex: 1 },
  halfContainer: { flex: 0.8, marginBottom: 10 },
  sectionTitle: { color: "#000", fontSize: 18, marginBottom: 6 },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#A78BFA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  lastMessage: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  groupItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 5,
  },
  groupName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  lastMessageTime: { fontSize: 12, color: "#9CA3AF" },
});
