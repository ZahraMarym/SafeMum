import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import useSignalR from '@/SignalR';

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchedMessages, setFetchedMessages] = useState([]);
  const { messages: realTimeMessages, setMessages: setRealTimeMessages, sendMessage } = useSignalR();
  const { user, groupId, groupName, receiverId } = useLocalSearchParams();  // Extract groupId and receiverId from params
  const [RecUserName, setRecUserName] = useState('');
  const router = useRouter();

  let parsedUser = user;
  if (typeof user === 'string') {
    try {
      parsedUser = JSON.parse(user);
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }

  // Check if the chat is a group chat or individual
  const isGroupChat = !!groupId;
  const chatReceiverId = isGroupChat ? groupId : receiverId;  // Use groupId for group chat and receiverId for individual chat
  const receiverName = isGroupChat ? groupName : parsedUser?.name;  // Use groupName for group chat, else use individual name

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const storedUser = await SecureStore.getItemAsync('user');
      const currentUser = JSON.parse(storedUser);
      const senderId = currentUser.userId;

      let url = '';
      if (isGroupChat) {
        // Fetch group messages
        url = `${process.env.EXPO_PUBLIC_URL}/communication/get-message-by-group?SenderId=${senderId}&GroupId=${chatReceiverId}&PageNumber=1&PageSize=10`;
      } else {
        // Fetch individual messages
        url = `${process.env.EXPO_PUBLIC_URL}/communication/get-message-by-user-request?SenderId=${senderId}&ReceiverId=${chatReceiverId}&PageNumber=1&PageSize=10`;
      }

      const response = await fetch(url, {
        headers: {
          Accept: '*/*',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch messages');

      const data = await response.json();
      setFetchedMessages(data.data || []);
      setRecUserName(receiverName);  // Set the receiver name for either individual or group chat
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [chatReceiverId]);

  // Handle sending message
  const handleSend = async () => {
    if (message.trim()) {
      try {
        const storedUser = await SecureStore.getItemAsync('user');
        const currentUser = JSON.parse(storedUser);
        const senderId = currentUser.userId;

        // Send message to either group or individual
        await sendMessage(senderId, chatReceiverId, message);
        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const allMessages = [...fetchedMessages, ...realTimeMessages];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={25} color="white" />
        </TouchableOpacity>
        <Text style={styles.name}>{RecUserName}</Text>
      </View>

      {/* Messages list */}
      <FlatList
        data={allMessages}
        keyExtractor={(item, index) => item.id?.toString() + index}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageItem,
              item.senderId !== chatReceiverId ? styles.sentMessage : styles.receivedMessage,
            ]}
          >
            <Text style={styles.senderName}>
              {item.senderId !== chatReceiverId ? 'You:' : `${RecUserName}:`}
            </Text>
            <Text>{item.content}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.sendAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      />

      {/* Loading indicator */}
      {loading && <ActivityIndicator size="large" color="#000" style={styles.loading} />}

      {/* Message input */}
      <View style={styles.inputContainer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message"
          style={styles.input}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: '60%',
    left: '5%',
  },
  header: {
    height: '10%',
    width: '100%',
    backgroundColor: '#825DEF',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 5,
  },
  name: {
    marginLeft: '10%',
    color: '#fff',
    fontSize: 18,
  },
  messageItem: {
    marginBottom: 12,
    padding: 15,
    borderRadius: 25,
    maxWidth: '80%',
    minWidth: '30%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e5e5e5',
    marginRight: 10,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#A78BFA',
    marginLeft: 10,
  },
  senderName: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#128C7E',
  },
  timestamp: {
    fontSize: 11,
    color: '#888',
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#ECE5DD',
    padding: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#825DEF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loading: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
});

