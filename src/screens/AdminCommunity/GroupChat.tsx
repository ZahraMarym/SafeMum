import { useEffect, useState, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  Text,
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
});
