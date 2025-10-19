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
import {
  calcPercentageHeight,
  calcPercentageWidth,
} from "@/lib/utils/dimensions";


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
  // Works for both setups
  const anyI18n = i18n as any;
  if (typeof anyI18n.changeLanguage === "function") {
    anyI18n.changeLanguage(language);     // react-i18next style
  } else {
    anyI18n.locale = language;            // i18n-js style
  }
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



const styles = StyleSheet.create({
 container: {
       flex: 1,
       padding: calcPercentageWidth(5),
       backgroundColor: "#F9FAFB",
       direction: isRTL ? "rtl" : "ltr",
     },

     // Add Button
     addButton: {
       alignItems: "center",
       gap: calcPercentageWidth(2.5),
       paddingVertical: calcPercentageHeight(2),
       paddingHorizontal: calcPercentageWidth(5),
       borderRadius: calcPercentageWidth(3),
       backgroundColor: "#825DEF",
       marginBottom: calcPercentageHeight(1.5),
       flexDirection: isRTL ? "row-reverse" : "row",
     },
     addButtonText: {
       fontSize: calcPercentageWidth(4.5),
       color: "#fff",
       fontWeight: "600",
     },

     // Modal
     modalContainer: {
       flex: 1,
       padding: calcPercentageWidth(5),
       backgroundColor: "#FFFFFF",
       direction: isRTL ? "rtl" : "ltr",
     },

     searchBar: {
       borderWidth: 1,
       borderColor: "#D1D5DB",
       borderRadius: calcPercentageWidth(3),
       paddingHorizontal: calcPercentageWidth(4),
       paddingVertical: calcPercentageHeight(1.5),
       fontSize: calcPercentageWidth(4),
       backgroundColor: "#F3F4F6",
       marginBottom: calcPercentageHeight(2),
       textAlign: isRTL ? "right" : "left",
     },

     userItem: {
       paddingVertical: calcPercentageHeight(2),
       paddingHorizontal: calcPercentageWidth(3),
       borderBottomWidth: 1,
       borderBottomColor: "#E5E7EB",
       backgroundColor: "#F9FAFB",
       borderRadius: calcPercentageWidth(2),
       marginBottom: calcPercentageHeight(1),
       alignItems: isRTL ? "flex-end" : "flex-start",
     },

     userText: {
       fontSize: calcPercentageWidth(4),
       fontWeight: "500",
       color: "#111827",
       textAlign: isRTL ? "right" : "left",
     },

     closeBtn: {
       marginTop: calcPercentageHeight(3),
       alignSelf: "center",
       backgroundColor: "#E5E7EB",
       paddingHorizontal: calcPercentageWidth(6),
       paddingVertical: calcPercentageHeight(1.5),
       borderRadius: calcPercentageWidth(2.5),
     },
     closeText: {
       fontSize: calcPercentageWidth(4),
       color: "#1E40AF",
       fontWeight: "600",
     },

     // Layout Sections
     splitContainer: {
       flex: 1,
     },
     halfContainer: {
       flex: 0.8,
       marginBottom: calcPercentageHeight(1.5),
     },
     sectionTitle: {
       color: "#000",
       fontSize: calcPercentageWidth(4.6),
       marginBottom: calcPercentageHeight(1),
       textAlign: isRTL ? "right" : "left",
       fontWeight: "700",
     },

     // Conversation Items
     conversationItem: {
       flexDirection: isRTL ? "row-reverse" : "row",
       alignItems: "center",
       paddingVertical: calcPercentageHeight(1.5),
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
       marginTop: calcPercentageHeight(0.5),
       textAlign: isRTL ? "right" : "left",
     },

     // Groups
     groupItem: {
       paddingVertical: calcPercentageHeight(1.8),
       borderBottomWidth: 1,
       borderBottomColor: "#E5E7EB",
       backgroundColor: "#F9FAFB",
       borderRadius: calcPercentageWidth(2.5),
       marginBottom: calcPercentageHeight(0.8),
       alignItems: isRTL ? "flex-end" : "flex-start",
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
       marginTop: calcPercentageHeight(0.5),
     },
});


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

