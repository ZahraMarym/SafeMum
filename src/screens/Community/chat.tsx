import useSignalR from '@/SignalR';
import { TextBold } from '@/components/TextBold';
import i18n from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';



export default function LoginScreen() {
  const { language, textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchedMessages, setFetchedMessages] = useState([]);
  const { messages: realTimeMessages, setMessages: setRealTimeMessages, sendMessage } = useSignalR();
  const { user } = useLocalSearchParams();
  const [RecUserName, setRecUserName] = useState('');
  const router = useRouter();

  // Change language when it updates in Redux
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


  let parsedUser = user;
  if (typeof user === 'string') {
    try {
      parsedUser = JSON.parse(user);
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }
  console.log("parsed user", parsedUser)

  const receiverId = parsedUser?.id;
    console.log("receiverId", receiverId)


  const fetchMessages = async () => {
    try {
      setLoading(true);
      const storedUser = await SecureStore.getItemAsync('user');
      const currentUser = JSON.parse(storedUser);
      const senderId = currentUser.userId;

      const token = await SecureStore.getItemAsync('accessToken');
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_URL}/communication/get-message-by-user-request?SenderId=${senderId}&ReceiverId=${receiverId}&PageNumber=1&PageSize=10`,
        {
          headers: {
            Accept: '*/*',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch messages');

      const data = await response.json();
      setFetchedMessages(data.data || []);
      setRecUserName(parsedUser.name);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSend = async () => {
    if (message.trim()) {
      try {
        const storedUser = await SecureStore.getItemAsync('user');
        const currentUser = JSON.parse(storedUser);
        const senderId = currentUser.userId;

        await sendMessage(senderId, receiverId, message);
        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const allMessages = [...fetchedMessages, ...realTimeMessages];

  return (
    <View style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, {
            left: isRTL ? undefined : '5%',
            right: isRTL ? '5%' : undefined
          }]} 
          onPress={() => router.back()}
        >
          <Ionicons 
            name={isRTL ? "chevron-forward" : "chevron-back"} 
            size={25} 
            color="white" 
          />
        </TouchableOpacity>
        <TextBold style={[styles.name, {
          marginLeft: isRTL ? 0 : '10%',
          marginRight: isRTL ? '10%' : 0,
          textAlign: isRTL ? 'right' : 'left'
        }]}>
          {RecUserName.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
          )}
        </TextBold>
      </View>

      <FlatList
        data={allMessages}
        keyExtractor={(item, index) => item.id?.toString() + index}
        renderItem={({ item }) => {
          const isSentMessage = item.senderId !== receiverId;
          return (
            <View style={[
              styles.messageItem,
              isSentMessage ? styles.sentMessage : styles.receivedMessage,
              {
                alignSelf: isSentMessage 
                  ? (isRTL ? 'flex-start' : 'flex-end')
                  : (isRTL ? 'flex-end' : 'flex-start'),
                marginRight: isSentMessage 
                  ? (isRTL ? 10 : 0)
                  : (isRTL ? 0 : 10),
                marginLeft: isSentMessage 
                  ? (isRTL ? 0 : 10)
                  : (isRTL ? 10 : 0),
              }
            ]}>
              <Text style={[styles.senderName, {
                textAlign: isRTL ? 'right' : 'left'
              }]}>
                {isSentMessage ? i18n.t('you') : `${RecUserName}:`}
              </Text>
              <Text style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {item.content}
              </Text>
              <Text style={[styles.timestamp, {
                textAlign: isRTL ? 'left' : 'right'
              }]}>
                {new Date(item.sendAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          );
        }}
      />

      {loading && (
        <Text style={styles.loading}>{i18n.t('loading')}</Text>
      )}

      <View style={[styles.inputContainer, {
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }]}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={i18n.t('typeMessage')}
          style={[styles.input, {
            textAlign: isRTL ? 'right' : 'left',
            marginRight: isRTL ? 0 : 10,
            marginLeft: isRTL ? 10 : 0
          }]}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>{i18n.t('send')}</Text>
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
    zIndex: 1,
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
    fontSize: 18,
    color: '#fff',
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
