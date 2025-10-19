import { TextBold } from "@/components/TextBold";
import i18n from "@/i18n";
import useSignalR from "@/SignalR";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSelector } from "react-redux";
import { Audio } from "expo-av";
import {
  calcPercentageHeight,
  calcPercentageWidth,
} from "@/lib/utils/dimensions";

// Voice Message Component
const VoiceMessage = ({ uri, isPlaying, onTogglePlay, duration = 0 }) => {
  return (
    <View style={styles.voiceMessageContainer}>
      <TouchableOpacity onPress={onTogglePlay} style={styles.playButton}>
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={16}
          color="#825DEF"
        />
      </TouchableOpacity>

      <View style={styles.audioWaveform}>
        {/* Simple waveform visualization */}
        {[...Array(15)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.waveformBar,
              {
                height: Math.random() * 15 + 5,
                backgroundColor: isPlaying ? '#825DEF' : '#666'
              }
            ]}
          />
        ))}
      </View>

      <Text style={styles.audioDuration}>
        {duration > 0 ? `${Math.floor(duration / 1000)}s` : "0s"}
      </Text>
    </View>
  );
};

export default function GroupChatScreen() {
  // Redux selector for RTL support
  const { language, textDirection } = useSelector((state) => state.language);
  const isRTL = textDirection === 'rtl';

  const [loading, setLoading] = useState(false);
  const { user } = useLocalSearchParams();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [fetchedMessages, setFetchedMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userNames, setUserNames] = useState({});

  // Audio states
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [playingSound, setPlayingSound] = useState(null);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [audioDurations, setAudioDurations] = useState({});
  const [audioSystemReady, setAudioSystemReady] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);

  const parsedUser = user ? JSON.parse(user) : null;

  // API Configuration
  const API_BASE_URL = process.env.EXPO_PUBLIC_URL || 'https://safemum-app-5f503b88629c.herokuapp.com/api';

  useEffect(() => {
    const anyI18n = i18n;
    if (typeof anyI18n.changeLanguage === "function") {
      anyI18n.changeLanguage(language);
    } else {
      anyI18n.locale = language;
    }
  }, [language]);

  if (!parsedUser) {
    return (
      <View style={styles.container}>
        <Text>Error: Group data is not available.</Text>
      </View>
    );
  }

  const groupId = parsedUser.groupId;
  const groupName = parsedUser.name;

  // Initialize audio system
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log('Initializing audio system...');

        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Audio recording permission is required');
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });

        await new Promise(resolve => setTimeout(resolve, 200));

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        setAudioSystemReady(true);
        console.log('Audio system initialized successfully');

      } catch (error) {
        console.error('Error initializing audio system:', error);
        Alert.alert('Audio Error', 'Failed to initialize audio system');
      }
    };

    initializeAudio();
  }, []);

  // Fetch logged-in user's ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setCurrentUserId(parsed?.user?.id || parsed?.userId || null);
        }
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };
    fetchUserId();
  }, []);

  const {
    messages: realTimeMessages,
    sendMessageToGroup,
  } = useSignalR();

  // Helper functions
  const constructAudioUrl = (audioPath) => {
    if (!audioPath) return null;
    if (audioPath.startsWith('http')) return audioPath;
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/uploads/voice/${audioPath}`;
  };

  const isVoiceMessage = (item) => {
    if (item.messageType === 'voice' || item.MessageType === 'voice') {
      return true;
    }

    const audioFileExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.flac'];
    const audioField = item.voiceMessageUrl || item.content || '';
    return audioFileExtensions.some(ext => audioField.toLowerCase().endsWith(ext));
  };

  const getVoiceUrl = (item) => {
    if (item.content && (item.content.startsWith("http://") || item.content.startsWith("https://"))) {
      return item.content;
    }

    if (item.voiceMessageUrl) {
      return constructAudioUrl(item.voiceMessageUrl);
    }

    if (item.voiceUrl) {
      return constructAudioUrl(item.voiceUrl);
    }

    return null;
  };

  // Load audio durations
  const loadAudioDurations = async (voiceMessages) => {
    const durations = {};

    for (const msg of voiceMessages) {
      const audioUrl = getVoiceUrl(msg);

      if (audioUrl) {
        try {
          const { sound, status } = await Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: false }
          );

          if (status.isLoaded && status.durationMillis) {
            durations[msg.id] = status.durationMillis;
          } else {
            durations[msg.id] = 0;
          }

          await sound.unloadAsync();
        } catch (error) {
          console.error(`Error loading audio duration for message ${msg.id}:`, error);
          durations[msg.id] = 0;
        }
      }
    }

    setAudioDurations(durations);
  };

  // Fetch initial group messages
  const fetchMessages = async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("accessToken");

      console.log("Fetching messages for groupId:", groupId);
      const response = await axios.get(
        `${API_BASE_URL}/communication/get-group-messages?Id=${groupId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Response data:", response.data);
      setFetchedMessages(response.data || []);

      // Load audio durations for voice messages
      const voiceMessages = (response.data || []).filter(msg => isVoiceMessage(msg));
      if (voiceMessages.length > 0) {
        await loadAudioDurations(voiceMessages);
      }

    } catch (error) {
      console.error("Error fetching group messages:", error.response ? error.response.data : error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [groupId]);

  // Fetch sender names for unique sender IDs
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
              `${API_BASE_URL}/communication/get-user-by-id?Id=${id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            const name = res.data?.name || "User";
            setUserNames((prev) => ({ ...prev, [id]: name }));
          } catch (error) {
            console.error(`Failed to fetch name for ${id}`, error.message);
            setUserNames((prev) => ({ ...prev, [id]: "User" }));
          }
        }
      });
    };

    if (allMessages.length > 0) {
      fetchSenderNames();
    }
  }, [allMessages]);

  // Audio system reset
  const forceResetAudioSystem = async () => {
    try {
      console.log('Force resetting audio system...');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      console.log('Audio system reset complete');
    } catch (error) {
      console.error('Error resetting audio system:', error);
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!audioSystemReady) {
      Alert.alert('Audio Not Ready', 'Please wait for audio system to initialize');
      return;
    }

    try {
      console.log('Attempting to start recording...');

      if (isRecording || recording) {
        console.log('Already recording, stopping first...');
        await stopRecording();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (playingSound) {
        try {
          await playingSound.stopAsync();
          await playingSound.unloadAsync();
        } catch (e) {
          console.log('Error stopping playback:', e.message);
        }
        setPlayingSound(null);
        setPlayingMessageId(null);
      }

      await forceResetAudioSystem();

      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
        },
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);

      const status = await newRecording.getStatusAsync();
      if (!status.canRecord) {
        throw new Error('Recording object created but cannot record');
      }

      setRecording(newRecording);
      setIsRecording(true);
      console.log('Recording started successfully');

    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Error', `Failed to start recording: ${err.message}`);
      setIsRecording(false);
      setRecording(null);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    console.log('Stopping recording...');

    if (!recording) {
      console.log('No recording to stop');
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(false);

      const status = await recording.getStatusAsync();
      console.log('Recording status before stop:', status);

      let uri = null;

      if (status.canRecord || status.isRecording) {
        await recording.stopAndUnloadAsync();
        uri = recording.getURI();
      } else {
        uri = recording.getURI();
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          console.log('Error during unload (may be normal):', e.message);
        }
      }

      setRecording(null);

      if (uri) {
        setRecordingUri(uri);
        console.log('Recording saved, waiting for user to send...');
      } else {
        Alert.alert('Error', 'No recording data found');
      }

    } catch (error) {
      console.error('Error stopping recording:', error);
      setRecording(null);
      setIsRecording(false);
      setTimeout(() => {
        forceResetAudioSystem();
      }, 500);
    }
  };

  // Send text message
  const handleSendMessage = async () => {
    try {
      if (newMessage.trim() && currentUserId) {
        await sendMessageToGroup(currentUserId, groupId, newMessage.trim());
        setNewMessage("");
      }
    } catch (err) {
      console.error("Failed to send group message:", err);
    }
  };

  // Send voice message
  const sendVoiceMessage = async () => {
    if (!recordingUri || !currentUserId) return;

    try {
      setIsSendingVoice(true);
      const token = await SecureStore.getItemAsync("accessToken");

      const formData = new FormData();
      formData.append("senderId", currentUserId);
      formData.append("groupId", groupId);
      formData.append("voiceMessage", {
        uri: recordingUri,
        type: "audio/m4a",
        name: "voice_note.m4a",
      });

      console.log("Sending voice message to:", `${API_BASE_URL}/communication/send-voice-message`);

      const response = await fetch(`${API_BASE_URL}/communication/send-voice-message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        console.log("Voice message sent successfully");
        setRecordingUri(null);
        await fetchMessages();
      } else {
        const errorText = await response.text();
        console.error("Voice message send failed:", errorText);
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
    } catch (err) {
      console.error("Failed to send voice message:", err);
      Alert.alert('Error', `Failed to send voice message: ${err.message}`);
    } finally {
      setIsSendingVoice(false);
    }
  };

  // Play/Pause voice message
  const togglePlayVoiceMessage = async (messageId, voiceUrl) => {
    try {
      if (playingSound) {
        await playingSound.unloadAsync();
        setPlayingSound(null);
        setPlayingMessageId(null);
      }

      if (playingMessageId === messageId) {
        return;
      }

      console.log(`Playing audio from: ${voiceUrl}`);
      const { sound } = await Audio.Sound.createAsync({ uri: voiceUrl }, { shouldPlay: true });
      setPlayingSound(sound);
      setPlayingMessageId(messageId);

      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          setPlayingSound(null);
          setPlayingMessageId(null);
        }
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      Alert.alert('Playback Error', `Unable to play audio: ${error.message}`);
    }
  };

  // Cancel recorded audio
  const cancelVoiceMessage = () => {
    setRecordingUri(null);
  };

  // Fetch users when button is clicked
  const fetchUsers = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const response = await axios.get(
        `${API_BASE_URL}/communication/get-all-user?PageSize=100&PageNumber=1`,
        {
          headers: { accept: "*/*", Authorization: `Bearer ${token}` },
        }
      );
      console.log("user response", response.data.data);
      setUsers(response.data.data || []);
      setModalVisible(true);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const addUserToGroup = async (userId) => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");

      if (!groupId || !userId) {
        console.error("Missing groupId or userId");
        return;
      }

      const payload = {
        groupId: String(groupId),
        userId: String(userId),
      };

      console.log("Payload being sent:", payload);

      const response = await axios.post(
        `${API_BASE_URL}/communication/add-user-in-chat-group`,
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

      console.log("User added to group:", response.data);
      setModalVisible(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Axios error:", {
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

  // Cleanup
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        console.log('Component cleanup...');
        try {
          if (playingSound) {
            await playingSound.unloadAsync();
          }
        } catch (e) {
          console.log('Error cleaning up sound:', e.message);
        }

        try {
          if (recording) {
            const status = await recording.getStatusAsync();
            if (status.canRecord || status.isRecording) {
              await recording.stopAndUnloadAsync();
            }
          }
        } catch (e) {
          console.log('Error cleaning up recording:', e.message);
        }

        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: false,
          });
        } catch (e) {
          console.log('Error resetting audio mode:', e.message);
        }
      };

      cleanup();
    };
  }, []);

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
          {groupName.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
          )}
        </TextBold>

        <TouchableOpacity
          style={[styles.addButton, {
            left: isRTL ? '5%' : undefined,
            right: isRTL ? undefined : '5%'
          }]}
          onPress={fetchUsers}
        >
          <Ionicons name="add-circle-outline" size={25} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={allMessages}
        keyExtractor={(item, index) => `${item.id || index}-${index}`}
        renderItem={({ item }) => {
          const isCurrentUser = item.senderId === currentUserId;
          const isVoice = isVoiceMessage(item);

          const senderName = isCurrentUser
            ? i18n.t('you') || 'You'
            : userNames[item.senderId] || 'Loading...';

          console.log(`Rendering message ${item.id}: isVoice=${isVoice}, content="${item.content}", voiceUrl="${getVoiceUrl(item)}"`);

          return (
            <View style={[
              styles.messageItem,
              isCurrentUser ? styles.sentMessage : styles.receivedMessage,
              {
                alignSelf: isCurrentUser
                  ? (isRTL ? 'flex-start' : 'flex-end')
                  : (isRTL ? 'flex-end' : 'flex-start'),
                marginRight: isCurrentUser
                  ? (isRTL ? 10 : 0)
                  : (isRTL ? 0 : 10),
                marginLeft: isCurrentUser
                  ? (isRTL ? 0 : 10)
                  : (isRTL ? 10 : 0),
              }
            ]}>
              <Text style={[styles.senderName, {
                textAlign: isRTL ? 'right' : 'left'
              }]}>
                {senderName}:
              </Text>

              {isVoice ? (
                <VoiceMessage
                  uri={getVoiceUrl(item)}
                  isPlaying={playingMessageId === item.id}
                  onTogglePlay={() => togglePlayVoiceMessage(item.id, getVoiceUrl(item))}
                  duration={audioDurations[item.id] || 0}
                />
              ) : (
                <Text style={[styles.messageContent, {
                  textAlign: isRTL ? 'right' : 'left'
                }]}>
                  {item.content}
                </Text>
              )}

              <Text style={[styles.timestamp, {
                textAlign: isRTL ? 'left' : 'right'
              }]}>
                {new Date(item.sendAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        }}
        style={styles.messagesList}
      />

      {loading && (
        <Text style={styles.loading}>Loading...</Text>
      )}

      {/* Input Container */}
      <View style={[styles.inputContainer, {
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }]}>
        {!recordingUri && (
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            style={[styles.input, {
              textAlign: isRTL ? 'right' : 'left',
              marginRight: isRTL ? 0 : 10,
              marginLeft: isRTL ? 10 : 0
            }]}
            multiline
          />
        )}

        {recordingUri && (
          <View style={styles.recordingPreview}>
            <Text style={styles.recordingPreviewText}>Voice message recorded</Text>
            <TouchableOpacity onPress={cancelVoiceMessage} style={styles.cancelButton}>
              <Ionicons name="close" size={16} color="#ff4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Voice Recording Button */}
        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
          style={[
            styles.voiceButton,
            {
              backgroundColor: isRecording ? '#ff4444' : '#825DEF',
              transform: [{ scale: isRecording ? 1.1 : 1 }]
            }
          ]}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={20}
            color="white"
          />
        </TouchableOpacity>

        {recordingUri && (
          <TouchableOpacity
            onPress={sendVoiceMessage}
            style={[
              styles.sendVoiceButton,
              { opacity: isSendingVoice ? 0.6 : 1 }
            ]}
            disabled={isSendingVoice}
          >
            <Ionicons
              name={isSendingVoice ? "hourglass" : "send"}
              size={18}
              color="white"
            />
          </TouchableOpacity>
        )}

        {!recordingUri && (
          <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        )}
      </View>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording...</Text>
        </View>
      )}

      {/* Modal with RTL support */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, {
            direction: isRTL ? 'rtl' : 'ltr'
          }]}>
            <TouchableOpacity
              style={[styles.crossButton, {
                left: isRTL ? 10 : undefined,
                right: isRTL ? undefined : 10
              }]}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>

            <Text style={[styles.modalTitle, {
              textAlign: isRTL ? 'right' : 'left'
            }]}>
              Select User
            </Text>

            <FlatList
              data={users}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.userItem, {
                    alignItems: isRTL ? 'flex-end' : 'flex-start',
                    backgroundColor: selectedUser?.id === item.id ? '#e0e0e0' : '#f9f9f9'
                  }]}
                  onPress={() => setSelectedUser(item)}
                >
                  <Text style={styles.userItemText}>
                    {item.name || 'Unknown User'}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {selectedUser && (
              <View style={styles.addButtonContainer}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => addUserToGroup(selectedUser.id)}
                >
                  <TextBold style={styles.closeButtonText}>
                    Add {selectedUser.name} to Group
                  </TextBold>
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
    container: {
      flex: 1,
      padding: calcPercentageWidth(3),
      backgroundColor: "#fff",
    },

    backButton: {
      position: "absolute",
      top: calcPercentageHeight(60),
      zIndex: 1,
    },

    addButton: {
      position: "absolute",
      top: calcPercentageHeight(60),
      zIndex: 1,
    },

    header: {
      height: calcPercentageHeight(10),
      width: "100%",
      backgroundColor: "#825DEF",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: calcPercentageWidth(5),
      borderRadius: calcPercentageWidth(1.5),
    },

    name: {
      marginLeft: calcPercentageWidth(10),
      color: "#fff",
      fontSize: calcPercentageWidth(4.5),
    },

    messagesList: {
      flex: 1,
      paddingVertical: calcPercentageHeight(1.5),
    },

    messageItem: {
      marginBottom: calcPercentageHeight(1.5),
      padding: calcPercentageWidth(4),
      borderRadius: calcPercentageWidth(6),
      maxWidth: "80%",
      minWidth: "30%",
    },

    sentMessage: {
      alignSelf: "flex-end",
      backgroundColor: "#e5e5e5",
      marginRight: calcPercentageWidth(2.5),
    },

    receivedMessage: {
      alignSelf: "flex-start",
      backgroundColor: "#A78BFA",
      marginLeft: calcPercentageWidth(2.5),
    },

    senderName: {
      fontWeight: "bold",
      marginBottom: calcPercentageHeight(0.5),
      color: "#128C7E",
      fontSize: calcPercentageWidth(3.8),
    },

    messageContent: {
      marginTop: calcPercentageHeight(0.6),
      fontSize: calcPercentageWidth(3.8),
    },

    timestamp: {
      fontSize: calcPercentageWidth(2.8),
      color: "#888",
      textAlign: "right",
    },

    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: calcPercentageHeight(1.5),
      borderTopWidth: 1,
      borderTopColor: "#ddd",
      paddingTop: calcPercentageHeight(1.2),
    },

    input: {
      flex: 1,
      backgroundColor: "#ECE5DD",
      padding: calcPercentageWidth(3),
      borderRadius: calcPercentageWidth(6),
      borderWidth: 1,
      borderColor: "#ddd",
      marginRight: calcPercentageWidth(2.5),
      fontSize: calcPercentageWidth(3.8),
    },

    loading: {
      textAlign: "center",
      fontSize: calcPercentageWidth(4),
      color: "#888",
      marginTop: calcPercentageHeight(2.5),
    },

    /** ---------------- Modal ---------------- */
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },

    modalContainer: {
      backgroundColor: "#fff",
      width: "85%",
      maxWidth: calcPercentageWidth(90),
      padding: calcPercentageWidth(5),
      borderRadius: calcPercentageWidth(3),
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
    },

    modalTitle: {
      fontSize: calcPercentageWidth(6),
      fontWeight: "bold",
      marginBottom: calcPercentageHeight(1.8),
      color: "#333",
      textAlign: "center",
    },

    userItem: {
      padding: calcPercentageWidth(4),
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
      width: "100%",
      backgroundColor: "#F9F9F9",
      marginBottom: calcPercentageHeight(1.2),
      borderRadius: calcPercentageWidth(2),
    },

    userItemText: {
      fontSize: calcPercentageWidth(4),
      color: "#333",
    },

    addButtonContainer: {
      marginTop: calcPercentageHeight(2),
      alignItems: "center",
    },

    closeButton: {
      marginTop: calcPercentageHeight(2),
      backgroundColor: "#A78BFA",
      paddingVertical: calcPercentageHeight(1.2),
      paddingHorizontal: calcPercentageWidth(5),
      borderRadius: calcPercentageWidth(3),
    },

    closeButtonText: {
      color: "#fff",
      fontSize: calcPercentageWidth(4),
    },

    crossButton: {
      position: "absolute",
      top: calcPercentageHeight(1),
      right: calcPercentageWidth(2),
      zIndex: 1,
      padding: calcPercentageWidth(2),
    },

    /** ---------------- Send + Voice Buttons ---------------- */
    sendButton: {
      backgroundColor: "#825DEF",
      paddingVertical: calcPercentageHeight(1.5),
      paddingHorizontal: calcPercentageWidth(5),
      borderRadius: calcPercentageWidth(6),
    },

    sendButtonText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: calcPercentageWidth(3.8),
    },

    voiceButton: {
      width: calcPercentageWidth(12),
      height: calcPercentageWidth(12),
      borderRadius: calcPercentageWidth(6),
      justifyContent: "center",
      alignItems: "center",
      marginRight: calcPercentageWidth(2),
      elevation: 3,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },

    sendVoiceButton: {
      width: calcPercentageWidth(12),
      height: calcPercentageWidth(12),
      borderRadius: calcPercentageWidth(6),
      backgroundColor: "#128C7E",
      justifyContent: "center",
      alignItems: "center",
      marginRight: calcPercentageWidth(2),
    },

    /** ---------------- Recording ---------------- */
    recordingIndicator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: calcPercentageWidth(3),
      backgroundColor: "#ff4444",
      borderRadius: calcPercentageWidth(6),
      marginTop: calcPercentageHeight(1.2),
    },

    recordingDot: {
      width: calcPercentageWidth(2),
      height: calcPercentageWidth(2),
      borderRadius: calcPercentageWidth(1),
      backgroundColor: "white",
      marginRight: calcPercentageWidth(2),
    },

    recordingText: {
      color: "white",
      fontWeight: "bold",
      fontSize: calcPercentageWidth(3.6),
    },

    recordingPreview: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f0f0f0",
      padding: calcPercentageWidth(3),
      borderRadius: calcPercentageWidth(6),
      marginRight: calcPercentageWidth(2),
    },

    recordingPreviewText: {
      color: "#666",
      fontWeight: "500",
      fontSize: calcPercentageWidth(3.6),
    },

    cancelButton: {
      marginLeft: "auto",
      padding: calcPercentageWidth(1.5),
    },

    /** ---------------- Voice Message ---------------- */
    voiceMessageContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: calcPercentageWidth(5),
      padding: calcPercentageWidth(2.5),
      minWidth: calcPercentageWidth(45),
    },

    playButton: {
      width: calcPercentageWidth(8),
      height: calcPercentageWidth(8),
      borderRadius: calcPercentageWidth(4),
      backgroundColor: "rgba(255,255,255,0.9)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: calcPercentageWidth(2),
    },

    audioWaveform: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      height: calcPercentageHeight(3),
      marginHorizontal: calcPercentageWidth(1.5),
    },

    waveformBar: {
      width: calcPercentageWidth(0.8),
      backgroundColor: "#825DEF",
      marginHorizontal: calcPercentageWidth(0.3),
      borderRadius: calcPercentageWidth(0.4),
    },

    audioDuration: {
      fontSize: calcPercentageWidth(3),
      color: "#666",
      fontWeight: "500",
      minWidth: calcPercentageWidth(8),
      textAlign: "center",
    },
});
