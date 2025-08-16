import { useEffect, useState, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  Modal,
  Text,
  Button,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TextBold } from "@/components/TextBold";
import { Ionicons } from "@expo/vector-icons";
import useSignalR from "@/SignalR";
import axios from "axios";

export default function GroupChatScreen() {
  const [loading, setLoading] = useState(false);
  const { user } = useLocalSearchParams();
  const router = useRouter();
 const [modalVisible, setModalVisible] = useState(false);
  const [users, setUsers] = useState([]); // To store fetched users
  const [selectedUser, setSelectedUser] = useState(null); // Store selected user
  const [newMessage, setNewMessage] = useState("");
  const [fetchedMessages, setFetchedMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({}); // ✅ store {senderId: name}

  const parsedUser = user ? JSON.parse(user) : null;
  console.log("Parsed user:", parsedUser);

  if (!parsedUser) {
    return (
      <View style={styles.container}>
        <Text>Error: Group data is not available.</Text>
      </View>
    );
  }

  const groupId = parsedUser.groupId;
  const groupName = parsedUser.name;

  // ✅ Fetch logged-in user's ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setCurrentUserId(parsed?.user?.id || parsed?.userId || null);
        }
      } catch (error) {
        console.error("❌ Error fetching user ID:", error);
      }
    };
    fetchUserId();
  }, []);

  const {
    messages: realTimeMessages,
    sendMessageToGroup,
  } = useSignalR();

  // ✅ Fetch initial group messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const token = await SecureStore.getItemAsync("accessToken");

        console.log("Fetching messages for groupId:", groupId);
        const response = await axios.get(
          `https://safemum-app-5f503b88629c.herokuapp.com/api/communication/get-group-messages?Id=${groupId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("Response data:", response.data);
        setFetchedMessages(response.data || []);
      } catch (error) {
        console.error(
          "❌ Error fetching group messages:",
          error.response ? error.response.data : error.message
        );
      } finally {
        setLoading(false);
      }
    };

    if (groupId) fetchMessages();
  }, [groupId]);

  // ✅ Fetch sender names for unique sender IDs
  const allMessages = useMemo(
    () => [...fetchedMessages, ...realTimeMessages],
    [fetchedMessages, realTimeMessages]
  );

  useEffect(() => {
    const fetchSenderNames = async () => {
      const uniqueIds = [
        ...new Set(allMessages.map((msg) => msg.senderId)),
      ];
      const token = await SecureStore.getItemAsync("accessToken");

      uniqueIds.forEach(async (id) => {
        if (!userNames[id]) {
          try {
            const res = await axios.get(
              `https://safemum-app-5f503b88629c.herokuapp.com/api/communication/get-user-by-id?Id=${id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            const name = res.data?.name || "User";
            console.log("users response", res)
            setUserNames((prev) => ({ ...prev, [id]: name }));
          } catch (error) {
            console.error(`❌ Failed to fetch name for ${id}`, error.message);
            setUserNames((prev) => ({ ...prev, [id]: "User" }));
          }
        }
      });
    };

    if (allMessages.length > 0) {
      fetchSenderNames();
    }
  }, [allMessages]);

  // ✅ Send message
  const handleSendMessage = async () => {
    try {
      if (newMessage.trim() && currentUserId) {
        await sendMessageToGroup(currentUserId, groupId, newMessage.trim());
        setNewMessage("");
      }
    } catch (err) {
      console.error("❌ Failed to send group message:", err);
    }
  };


    // Fetch users when button is clicked
     const fetchUsers = async () => {
       try {
         const token = await SecureStore.getItemAsync("accessToken");
         const response = await axios.get(
           `${process.env.EXPO_PUBLIC_URL}/communication/get-all-user?PageSize=100&PageNumber=1`,
           {
             headers: { accept: "/", Authorization: `Bearer ${token}` },
           }
         );
     console.log("user response", response.data.data)
         setUsers(response.data.data);
         setModalVisible(true); // Open modal after users are fetched
       } catch (error) {
         console.error("Error fetching users:", error);
       }
     };

 const addUserToGroup = async (userId) => {
   try {
     const token = await SecureStore.getItemAsync("accessToken");

     // Ensure groupId is defined and a string
     if (!groupId || !userId) {
       console.error("Missing groupId or userId");
       return;
     }

     const payload = {
       groupId: String(groupId),
       userId: String(userId),
     };

     console.log("Payload being sent:", payload);
     const url = `${process.env.EXPO_PUBLIC_URL}/communication/add-user-in-chat-group`
     console.log("url", url)
console.log("🔄 Sending request...");

const response = await axios.post(
  `${process.env.EXPO_PUBLIC_URL}/communication/add-user-in-chat-group`,
  payload,
  {
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    timeout: 30000,
  }
);

console.log("✅ Request complete");

     console.log("✅ User added to group:", response.data);
     setModalVisible(false);
   } catch (error) {
    console.error("❌ Axios error:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        request: error.request,
      });
  Alert.alert(
      "Failed to Add User",
      error.response?.data?.error || "User might already be in the group or there was a server error."
    );
   }
 };




  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={25} color="white" />
        </TouchableOpacity>
        <TextBold style={styles.name}>
          {groupName.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
          })}
        </TextBold>
        <TouchableOpacity style={styles.addButton}
       onPress={fetchUsers}
        >
          <Ionicons name="add-circle-outline" size={25} color="white" />
        </TouchableOpacity>

      </View>

      <FlatList
        data={allMessages}
        keyExtractor={(item, index) => item.id?.toString() + index}
        renderItem={({ item }) => {
          const isCurrentUser = item.senderId === currentUserId;
          const displayName = isCurrentUser
            ? "You"
            : userNames[item.senderId] || "User";

          return (
            <View
              style={[
                styles.messageItem,
                isCurrentUser ? styles.sentMessage : styles.receivedMessage,
              ]}
            >
              <Text style={styles.senderName}>{displayName}:</Text>
              <Text style={styles.messageContent}>{item.content}</Text>
              <Text style={styles.timestamp}>
                {new Date(item.sendAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        }}
      />

      {loading && <Text style={styles.loading}>Loading...</Text>}

      <View style={styles.inputContainer}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message"
          style={styles.input}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          style={styles.sendButton}
          disabled={!newMessage.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
       {/* Modal to show users */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
           <TouchableOpacity
                  style={styles.crossButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
            <Text style={styles.modalTitle}>Select a User</Text>

            {/* User list */}
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => setSelectedUser(item)}
                >
                  <Text style={styles.userItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />

            {selectedUser && (
              <View style={styles.addButtonContainer}>
               <TouchableOpacity
                             style={styles.closeButton}
                             onPress={() => addUserToGroup(selectedUser.id)}
                           >
                 <TextBold style={styles.closeButtonText}>{`Add ${selectedUser.name} to Group`}</TextBold>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  backButton: { position: "absolute", top: "60%", left: "5%" },
  header: {
    height: "10%",
    width: "100%",
    backgroundColor: "#825DEF",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 20,
    borderRadius: 5,
  },
    addButton: { position: "absolute", top: "60%", right: "5%" },
    header: {
      height: "10%",
      width: "100%",
      backgroundColor: "#825DEF",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: 20,
      borderRadius: 5,
    },
  name: { marginLeft: "10%", color: "#fff", fontSize: 18 },
  messageItem: {
    marginBottom: 12,
    padding: 15,
    borderRadius: 25,
    maxWidth: "80%",
    minWidth: "30%",
  },
  sentMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#e5e5e5",
    marginRight: 10,
  },
  receivedMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#A78BFA",
    marginLeft: 10,
  },
  senderName: { fontWeight: "bold", marginBottom: 5, color: "#128C7E" },
  messageContent: { marginTop: 5, fontSize: 16 },
  timestamp: { fontSize: 11, color: "#888", textAlign: "right" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#ECE5DD",
    padding: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#825DEF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  sendButtonText: { color: "#fff", fontWeight: "bold" },
  loading: { textAlign: "center", fontSize: 16, color: "#888", marginTop: 20 },
   // Modal Styling
     modalOverlay: {
       flex: 1,
       justifyContent: "center",
       alignItems: "center",
       backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
     },
     modalContainer: {
       backgroundColor: "#fff",
       width: "85%",
       maxWidth: 400,
       padding: 20,
       borderRadius: 10,
       elevation: 5, // Add shadow on Android
       shadowColor: "#000", // Shadow on iOS
       shadowOffset: { width: 0, height: 3 },
       shadowOpacity: 0.2,
       shadowRadius: 5,
     },
     modalTitle: {
       fontSize: 24,
       fontWeight: "bold",
       marginBottom: 15,
       color: "#333", // Dark text for better readability
       textAlign: "center",
     },
     userItem: {
       padding: 15,
       borderBottomWidth: 1,
       borderBottomColor: "#eee",
       width: "100%",
       backgroundColor: "#F9F9F9", // Light background for each user item
       marginBottom: 10,
       borderRadius: 8,
     },
     userItemText: {
       fontSize: 16,
       color: "#333", // Dark text for readability
     },
     addButtonContainer: {
       marginTop: 20,
       alignItems: "center",
     },
     closeButton: {
       marginTop: 15,
       backgroundColor: "#A78BFA",
       paddingVertical: 10,
       paddingHorizontal: 20,
       borderRadius: 10,
     },
     closeButtonText: {
       color: "#fff",
       fontSize: 16,
     },
 crossButton: {
   position: 'absolute',
   top: 10,
   right: 10,
   zIndex: 1,
   padding: 8,
 },

});
