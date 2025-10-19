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
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";
import {
  calcPercentageHeight,
  calcPercentageWidth,
} from "@/lib/utils/dimensions";

export default function CommunityScreen() {
  const { language, textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';

  const [modalVisible, setModalVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const router = useRouter();
  const [groupChatModalVisible, setGroupChatModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

useEffect(() => {
  const anyI18n = i18n as any;
  if (typeof anyI18n.changeLanguage === "function") {
    // react-i18next style
    anyI18n.changeLanguage(language);
  } else {
    // i18n-js style
    anyI18n.locale = language;
  }
}, [language]);

  // ✅ Fetch all users (for Add User modal)
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
      pathname: "/(admin-tabs)/(admin-community)/chat",
      params: { user: JSON.stringify(user) },
    });
  };

  // ✅ Fetch conversations
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
      // ✅ filter out conversations where userName === "unknown"
      const filteredConversations = (response.data || []).filter(
        (conv: any) => conv.userName?.toLowerCase() !== "unknown"
      );
      setConversations(filteredConversations);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch groups
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_URL}/communication/get-all-group`,
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

  // ✅ Handle Group Creation
  const handleCreateGroupChat = async () => {
    if (!groupName || selectedMembers.length < 1) {
      Alert.alert(
        "Error",
        "Please provide a group name and select at least one member."
      );
      return;
    }

    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const storedUser = await SecureStore.getItemAsync("user");
      if (!storedUser || !token) {
        Alert.alert("Error", "Please log in again.");
        return;
      }

      const currentUser = JSON.parse(storedUser);
      const senderId = currentUser.userId;

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_URL}/communication/create-chat-group`,
        {
          name: groupName,
          adminUserId: senderId,
          memberUserIds: selectedMembers,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response?.data?.groupId) {
        Alert.alert("Success", "Group chat created successfully!");
        setGroupChatModalVisible(false);
        router.push({
          pathname: "/(admin-tabs)/(admin-community)/chat",
          params: {
            groupId: response.data.groupId,
            groupName: groupName,
          },
        });
      } else {
        Alert.alert("Error", "Failed to create group chat.");
      }
    } catch (err) {
      console.error("Error creating group chat:", err);
      Alert.alert("Error", "Failed to create group chat.");
    }
  };

  // Move StyleSheet inside component to access isRTL
  const styles = StyleSheet.create({
       container: {
         flex: 1,
         padding: calcPercentageWidth(5),
         backgroundColor: "#F9FAFB",
         direction: isRTL ? "rtl" : "ltr",
       },

       addButton: {
         flexDirection: isRTL ? "row-reverse" : "row",
         alignItems: "center",
         gap: calcPercentageWidth(2.5),
         paddingVertical: calcPercentageHeight(1.6),
         paddingHorizontal: calcPercentageWidth(5),
         borderRadius: calcPercentageWidth(3),
         backgroundColor: "#825DEF",
         marginBottom: calcPercentageHeight(1),
       },

       addButtonText: {
         fontSize: calcPercentageWidth(4.5),
         color: "#fff",
         fontWeight: "600",
       },

       splitContainer: { flex: 1 },

       halfContainer: { flex: 0.8, marginBottom: calcPercentageHeight(1) },

       sectionTitle: {
         fontSize: calcPercentageWidth(4.3),
         color: "#000",
         marginBottom: calcPercentageHeight(0.6),
         textAlign: isRTL ? "right" : "left",
         fontWeight: "600",
       },

       conversationItem: {
         flexDirection: isRTL ? "row-reverse" : "row",
         alignItems: "center",
         paddingVertical: calcPercentageHeight(1.2),
         borderBottomWidth: 1,
         borderBottomColor: "#E5E7EB",
       },

       avatar: {
         width: calcPercentageWidth(12),
         height: calcPercentageWidth(12),
         borderRadius: calcPercentageWidth(6),
         backgroundColor: "#A78BFA",
         alignItems: "center",
         justifyContent: "center",
         marginRight: isRTL ? 0 : calcPercentageWidth(3),
         marginLeft: isRTL ? calcPercentageWidth(3) : 0,
       },

       avatarText: {
         color: "#fff",
         fontSize: calcPercentageWidth(4.5),
         fontWeight: "bold",
       },

       chatInfo: {
         flex: 1,
         alignItems: isRTL ? "flex-end" : "flex-start",
       },

       chatName: {
         fontSize: calcPercentageWidth(4),
         fontWeight: "600",
         color: "#111827",
         textAlign: isRTL ? "right" : "left",
       },

       lastMessage: {
         fontSize: calcPercentageWidth(3.5),
         color: "#6B7280",
         textAlign: isRTL ? "right" : "left",
         marginTop: calcPercentageHeight(0.3),
       },

       groupItem: {
         paddingVertical: calcPercentageHeight(1.2),
         paddingHorizontal: isRTL ? calcPercentageWidth(4) : calcPercentageWidth(3),
         borderBottomWidth: 1,
         borderBottomColor: "#E5E7EB",
         backgroundColor: "#F9FAFB",
         borderRadius: calcPercentageWidth(2),
         marginBottom: calcPercentageHeight(0.6),
         alignItems: isRTL ? "flex-end" : "flex-start",
       },

       modalContainer: {
         flex: 1,
         padding: calcPercentageWidth(5),
         backgroundColor: "#fff",
       },

       searchBar: {
         borderWidth: 1,
         borderColor: "#D1D5DB",
         borderRadius: calcPercentageWidth(3),
         paddingHorizontal: calcPercentageWidth(4),
         paddingVertical: calcPercentageHeight(1.2),
         fontSize: calcPercentageWidth(4),
         backgroundColor: "#F3F4F6",
         marginBottom: calcPercentageHeight(1.8),
         textAlign: isRTL ? "right" : "left",
       },

       userItem: {
         flexDirection: isRTL ? "row-reverse" : "row",
         justifyContent: "space-between",
         paddingVertical: calcPercentageHeight(1.5),
         paddingHorizontal: calcPercentageWidth(3),
         borderBottomWidth: 1,
         borderBottomColor: "#E5E7EB",
         backgroundColor: "#F9FAFB",
         borderRadius: calcPercentageWidth(2),
         marginBottom: calcPercentageHeight(0.8),
       },

       input: {
         height: calcPercentageHeight(6),
         borderColor: "#b7b7b7",
         borderWidth: 1,
         color: "black",
         paddingHorizontal: calcPercentageWidth(4),
         borderRadius: calcPercentageWidth(3),
         marginBottom: calcPercentageHeight(2),
         backgroundColor: "#F3F4F6",
         textAlign: isRTL ? "right" : "left",
         fontSize: calcPercentageWidth(3.8),
       },

       createGroupButton: {
         backgroundColor: "#10BE56",
         paddingVertical: calcPercentageHeight(1.5),
         borderRadius: calcPercentageWidth(3),
         alignItems: "center",
         marginTop: calcPercentageHeight(2),
       },

       createGroupText: {
         color: "#fff",
         fontSize: calcPercentageWidth(4),
         fontWeight: "600",
       },

       closeBtn: {
         marginTop: calcPercentageHeight(3),
         alignSelf: "center",
         backgroundColor: "#E5E7EB",
         paddingHorizontal: calcPercentageWidth(6),
         paddingVertical: calcPercentageHeight(1.2),
         borderRadius: calcPercentageWidth(2.5),
       },

       closeText: {
         fontSize: calcPercentageWidth(4),
         color: "#1E40AF",
         fontWeight: "600",
       },

       userText: {
         fontSize: calcPercentageWidth(4),
         color: "#111827",
       },

       groupName: {
         fontSize: calcPercentageWidth(4),
         fontWeight: "600",
         color: "#111827",
         textAlign: isRTL ? "right" : "left",
       },

       lastMessageTime: {
         fontSize: calcPercentageWidth(3),
         color: "#9CA3AF",
         textAlign: isRTL ? "right" : "left",
       },

  });

  return (
    <View style={styles.container}>
      {/* ✅ Add User Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle-outline" size={26} color="#fff" />
        <Text style={styles.addButtonText}>{i18n.t("addUser")}</Text>
      </TouchableOpacity>

      {/* ✅ Add User Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={[styles.modalContainer, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          <TextInput
            placeholder={i18n.t("searchUser")}
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchBar}
            textAlign={isRTL ? 'right' : 'left'}
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
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>{i18n.t("close")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ✅ Split Screen */}
      <View style={styles.splitContainer}>
        {/* Conversations (Top Half) */}
        <View style={styles.halfContainer}>
          <TextBold style={styles.sectionTitle}>{i18n.t("conversations")}</TextBold>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.conversationItem}
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
                      pathname: "/(admin-tabs)/(admin-community)/chat",
                      params: { user: JSON.stringify(chatPayload) },
                    });
                  } catch (err) {
                    console.error("Error preparing chat:", err);
                  }
                }}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.userName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{item.userName}</Text>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage || i18n.t("noMessagesYet")}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Groups (Bottom Half) */}
        <View style={styles.halfContainer}>
          <TextBold style={styles.sectionTitle}>{i18n.t("groupChats")}</TextBold>
          <FlatList
            data={groups}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.groupItem}
                onPress={() =>
                  router.push({
                    pathname: "/(admin-tabs)/(admin-community)/group-chat",
                    params: { user: JSON.stringify(item) },
                  })
                }
              >
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.lastMessage}>
                  {item.lastMessageContent || i18n.t("noMessagesYet")}
                </Text>
                <Text style={styles.lastMessageTime}>
                  {item.lastMessageTime || i18n.t("noTimeAvailable")}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {/* ✅ Group Chat Modal */}
      <Modal visible={groupChatModalVisible} animationType="slide">
        <View style={[styles.modalContainer, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          <TextInput
            placeholder={i18n.t("groupName")}
            value={groupName}
            onChangeText={setGroupName}
            style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
          />
          <FlatList
            data={users}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userItem}
                onPress={() => {
                  setSelectedMembers((prev) =>
                    prev.includes(item.id)
                      ? prev.filter((id) => id !== item.id)
                      : [...prev, item.id]
                  );
                }}
              >
                <Text style={styles.userText}>{item.name}</Text>
                {selectedMembers.includes(item.id) && (
                  <Ionicons name="checkmark-circle" size={24} color="#10BE56" />
                )}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={handleCreateGroupChat}
          >
            <Text style={styles.createGroupText}>{i18n.t("createGroup")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setGroupChatModalVisible(false)}
          >
            <Text style={styles.closeText}>{i18n.t("close")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ✅ Button to open Group Chat Modal */}
      <TouchableOpacity
        style={[styles.addButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={() => setGroupChatModalVisible(true)}
      >
        <Ionicons name="chatbox-ellipses" size={26} color="#fff" />
        <Text style={styles.addButtonText}>{i18n.t("createGroup")}</Text>
      </TouchableOpacity>
    </View>
  );
}
