import { TextBold } from '@/components/TextBold';
import i18n from '@/i18n';
import useSignalR from '@/SignalR';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Audio } from 'expo-av';
import { useEffect, useState, useRef } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';


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

export default function AdminChatScreen() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchedMessages, setFetchedMessages] = useState([]);
  const { messages: realTimeMessages, setMessages: setRealTimeMessages, sendMessage } = useSignalR();
  const { user } = useLocalSearchParams();
  const [RecUserName, setRecUserName] = useState('');
  const router = useRouter();

  const language = useSelector((state) => state.language.language);
  const { textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';

const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);

  // Audio playback states
  const [playingSound, setPlayingSound] = useState(null);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [audioDurations, setAudioDurations] = useState({});

  // Request audio permissions
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Audio recording permission is required');
        }

        // Set audio mode for recording and playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Error requesting audio permissions:', error);
      }
    })();
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (playingSound) {
        playingSound.unloadAsync().catch(console.error);
      }
      if (recording) {
        recording.stopAndUnloadAsync().catch(console.error);
      }
    };
  }, []);

  // Change language when it updates in Redux
  useEffect(() => {
    const anyI18n = i18n as any;
    if (typeof anyI18n.changeLanguage === "function") {
      anyI18n.changeLanguage(language);
    } else {
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

  const receiverId = parsedUser?.id;

  // Helper function to construct full audio URL
  const constructAudioUrl = (audioPath) => {
    if (!audioPath) return null;

    // If it's already a full URL, return as is
    if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
      return audioPath;
    }

    // If it's a relative path, construct full URL
    const baseUrl = process.env.EXPO_PUBLIC_URL || 'http://your-api-base-url.com';
    const cleanPath = audioPath.startsWith('/') ? audioPath : `/${audioPath}`;
    return `${baseUrl}${cleanPath}`;
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const storedUser = await SecureStore.getItemAsync('user');
      const currentUser = JSON.parse(storedUser);
      const senderId = currentUser.userId;

      const token = await SecureStore.getItemAsync('accessToken');
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_URL}/communication/get-message-by-user-request?SenderId=${senderId}&ReceiverId=${receiverId}&PageNumber=1&PageSize=50`,
        {
          headers: {
            Accept: '*/*',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch messages');

      const data = await response.json();
      console.log('Fetched messages:', JSON.stringify(data.data, null, 2));

      // Debug: Let's see what fields are actually in the messages
      if (data.data && data.data.length > 0) {
        console.log('=== MESSAGE FIELD ANALYSIS ===');
        data.data.forEach((msg, index) => {
          console.log(`Message ${index + 1} (ID: ${msg.id}) fields:`, Object.keys(msg));
          console.log(`Message ${index + 1} sample data:`, {
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            messageType: msg.messageType || msg.MessageType || 'not set',
            // Show any field that might contain 'voice', 'audio', or 'message'
            possibleAudioFields: Object.keys(msg).filter(key =>
              key.toLowerCase().includes('voice') ||
              key.toLowerCase().includes('audio') ||
              key.toLowerCase().includes('message')
            ).reduce((obj, key) => {
              obj[key] = msg[key];
              return obj;
            }, {})
          });
        });
        console.log('=== END MESSAGE ANALYSIS ===');
      }

      setFetchedMessages(data.data || []);
      setRecUserName(parsedUser.name);

      // Load audio durations for voice messages
      const voiceMessages = data.data?.filter(msg => isVoiceMessage(msg)) || [];
      console.log('Voice messages found:', voiceMessages.length);

      if (voiceMessages.length > 0) {
        loadAudioDurations(voiceMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Load audio durations
  const loadAudioDurations = async (voiceMessages) => {
    const durations = {};

    for (const msg of voiceMessages) {
      const audioUrl = getVoiceUrl(msg);

      if (audioUrl) {
        try {
          console.log(`Loading duration for message ${msg.id} from URL: ${audioUrl}`);

          const { sound, status } = await Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: false }
          );

          if (status.isLoaded && status.durationMillis) {
            durations[msg.id] = status.durationMillis;
            console.log(`Duration for message ${msg.id}: ${status.durationMillis}ms`);
          } else {
            console.log(`Could not load duration for message ${msg.id}`);
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
        Alert.alert('Error', 'Failed to send message');
      }
    }
  };

  // Play/Pause voice message
  const togglePlayVoiceMessage = async (messageId, voiceUrl) => {
    try {
      console.log(`Attempting to play audio for message ${messageId} from URL: ${voiceUrl}`);

      // Stop currently playing sound if different message
      if (playingSound && playingMessageId !== messageId) {
        await playingSound.stopAsync();
        await playingSound.unloadAsync();
        setPlayingSound(null);
        setPlayingMessageId(null);
      }

      // If same message is playing, toggle playback
      if (playingMessageId === messageId && playingSound) {
        const status = await playingSound.getStatusAsync();
        if (status.isPlaying) {
          await playingSound.pauseAsync();
          setPlayingMessageId(null);
        } else {
          await playingSound.playAsync();
          setPlayingMessageId(messageId);
        }
        return;
      }

      // Load and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: voiceUrl },
        { shouldPlay: true }
      );

      setPlayingSound(sound);
      setPlayingMessageId(messageId);

      // Set up playback status update
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingMessageId(null);
        }
      });

    } catch (error) {
      console.error('Error playing voice message:', error);
      Alert.alert('Playback Error', `Failed to play voice message: ${error.message}`);
    }
  };

  // Add this state variable at the top of your component with other states
  const [audioSystemReady, setAudioSystemReady] = useState(false);

  // Replace your audio permissions useEffect with this enhanced version
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log('Initializing audio system...');

        // Request permissions
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Audio recording permission is required');
          return;
        }

        // Force reset audio mode to clear any existing recording objects
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });

        // Wait a bit for the system to reset
        await new Promise(resolve => setTimeout(resolve, 200));

        // Set proper audio mode for recording and playback
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

  // Completely rewritten recording functions with better state management
  const forceResetAudioSystem = async () => {
    try {
      console.log('Force resetting audio system...');

      // Reset audio mode completely
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      // Wait for reset
      await new Promise(resolve => setTimeout(resolve, 300));

      // Re-enable recording
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

  const startRecording = async () => {
    if (!audioSystemReady) {
      Alert.alert('Audio Not Ready', 'Please wait for audio system to initialize');
      return;
    }

    try {
      console.log('Attempting to start recording...');

      // Ensure we're not already recording
      if (isRecording || recording) {
        console.log('Already recording or have active recording, stopping first...');
        await stopRecording();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait longer
      }

      // Stop any playing audio
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

      // Force reset the audio system
      await forceResetAudioSystem();

      console.log('Creating new recording...');

      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1, // Changed to mono to reduce complexity
          bitRate: 64000, // Reduced bitrate
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM, // Changed from HIGH
          sampleRate: 44100,
          numberOfChannels: 1, // Changed to mono
          bitRate: 64000, // Reduced bitrate
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 64000,
        },
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);

      // Verify the recording was created successfully
      const status = await newRecording.getStatusAsync();
      if (!status.canRecord) {
        throw new Error('Recording object created but cannot record');
      }

      setRecording(newRecording);
      setIsRecording(true);
      console.log('Recording started successfully');

    } catch (err) {
      console.error('Failed to start recording:', err);

      // Try one more time with a complete system reset
      if (err.message.includes('Only one Recording object')) {
        console.log('Attempting recovery with system reset...');
        try {
          await forceResetAudioSystem();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait even longer

          const { recording: recoveryRecording } = await Audio.Recording.createAsync({
            android: {
              extension: '.m4a',
              outputFormat: Audio.AndroidOutputFormat.MPEG_4,
              audioEncoder: Audio.AndroidAudioEncoder.AAC,
              sampleRate: 22050, // Lower sample rate for compatibility
              numberOfChannels: 1,
              bitRate: 32000, // Even lower bitrate
            },
            ios: {
              extension: '.m4a',
              outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
              audioQuality: Audio.IOSAudioQuality.LOW,
              sampleRate: 22050,
              numberOfChannels: 1,
              bitRate: 32000,
            },
          });

          setRecording(recoveryRecording);
          setIsRecording(true);
          console.log('Recovery recording started successfully');

        } catch (recoveryError) {
          console.error('Recovery failed:', recoveryError);
          Alert.alert('Recording Error', 'Unable to start recording. Please restart the app.');
          setIsRecording(false);
          setRecording(null);
        }
      } else {
        Alert.alert('Recording Error', `Failed to start recording: ${err.message}`);
        setIsRecording(false);
        setRecording(null);
      }
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording...');

    if (!recording) {
      console.log('No recording to stop');
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(false);

      // Check if recording is still active
      const status = await recording.getStatusAsync();
      console.log('Recording status before stop:', status);

      let uri = null;

      if (status.canRecord || status.isRecording) {
        await recording.stopAndUnloadAsync();
        uri = recording.getURI();
      } else {
        // Try to get URI even if not recording
        uri = recording.getURI();
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          console.log('Error during unload (may be normal):', e.message);
        }
      }

      console.log('Recording stopped, URI:', uri);

      // Clear recording state first
      setRecording(null);

      if (uri) {
        // Set the recording URI to show preview
        setRecordingUri(uri);
        // DON'T automatically send here - let the user click the send button
        console.log('Recording saved, waiting for user to send...');
      } else {
        Alert.alert('Error', 'No recording data found');
      }

    } catch (error) {
      console.error('Error stopping recording:', error);
      setRecording(null);
      setIsRecording(false);

      // Try to reset the audio system after an error
      setTimeout(() => {
        forceResetAudioSystem();
      }, 500);
    }
  };

  // Enhanced cleanup with better error handling
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

        // Reset audio system on cleanup
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


const [isSendingVoice, setIsSendingVoice] = useState(false);

  // Send the recorded audio
 const sendVoiceMessage = async (audioUri = recordingUri) => {
   if (!audioUri) {
     Alert.alert('Error', 'No voice recording found');
     return;
   }

   // Prevent duplicate sends
   if (isSendingVoice) {
     console.log('Voice message already being sent, ignoring duplicate request');
     return;
   }

   try {
     setIsSendingVoice(true);
     console.log('Sending voice message with URI:', audioUri);

     const storedUser = await SecureStore.getItemAsync('user');
     const currentUser = JSON.parse(storedUser);
     const senderId = currentUser.userId;

     const formData = new FormData();
     formData.append('senderId', senderId.toString());
     formData.append('receiverId', receiverId.toString());

     // Create file object for the voice message
     const fileName = `voice_${Date.now()}.m4a`;
     formData.append('voiceMessage', {
       uri: audioUri,
       type: 'audio/m4a',
       name: fileName,
     } as any);

     const token = await SecureStore.getItemAsync('accessToken');
     console.log('Sending voice message...');

     const response = await fetch(
       `${process.env.EXPO_PUBLIC_URL}/communication/send-voice-message`,
       {
         method: 'POST',
         headers: {
           'Accept': '*/*',
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'multipart/form-data',
         },
         body: formData,
       }
     );

     const responseText = await response.text();
     console.log('Voice message response:', responseText);

     if (response.ok) {
       console.log('Voice message sent successfully');
       setRecordingUri(null); // Clear the recording URI after successful send
       // Refresh messages to show the new voice message
       await fetchMessages();
     } else {
       console.error('Failed to send voice message:', response.status, responseText);
       Alert.alert('Error', 'Failed to send voice message');
     }
   } catch (error) {
     console.error('Failed to send voice message:', error);
     Alert.alert('Error', 'Failed to send voice message: ' + error.message);
   } finally {
     setIsSendingVoice(false); // Reset the flag
   }
 };

  // Cancel recorded audio
  const cancelVoiceMessage = () => {
    setRecordingUri(null);
  };

const isVoiceMessage = (item) => {
  // Check for various possible voice message fields (such as content containing an audio file link)
  const audioFileExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.flac']; // Add any other audio extensions you expect

  // Check if content contains an audio URL
  const content = item.content || '';
  const isAudioUrl = audioFileExtensions.some(ext => content.toLowerCase().endsWith(ext));

  return isAudioUrl;
};


const getVoiceUrl = (item) => {
  // Check if the message contains an audio file URL in the content field
  if (item.content && item.content.trim()) {
    return item.content; // If content contains a valid URL, return it directly
  }

  // If no content is found, try other possible fields (audioUrl, voiceUrl, etc.)
  const voiceFields = [
    'voiceMessageUrl',
    'voiceUrl',
    'audioUrl',
    'voiceMessage',
    'voiceMessagePath',
    'audio_url',
    'voice_message_url'
  ];

  for (const field of voiceFields) {
    if (item[field]) {
      return constructAudioUrl(item[field]);
    }
  }

  return null; // Return null if no valid audio URL is found
};


  const allMessages = [...fetchedMessages, ...realTimeMessages].sort((a, b) =>
    new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime()
  );




  return (
    <View style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              left: isRTL ? undefined : '5%',
              right: isRTL ? '5%' : undefined,
            },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={25}
            color="white"
          />
        </TouchableOpacity>
        <TextBold
          style={[
            styles.name,
            {
              marginLeft: isRTL ? 0 : '10%',
              marginRight: isRTL ? '10%' : 0,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {RecUserName}
        </TextBold>
      </View>

     <FlatList
           data={allMessages}
           keyExtractor={(item, index) => `${item.id || index}_${item.sendAt || Date.now()}`}
           renderItem={({ item }) => {
             const isSentMessage = item.senderId !== receiverId;
             const isVoice = isVoiceMessage(item);

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

                 {isVoice ? (
                   <VoiceMessage
                     uri={getVoiceUrl(item)}
                     isPlaying={playingMessageId === item.id}
                     onTogglePlay={() => togglePlayVoiceMessage(item.id, getVoiceUrl(item))}
                     duration={audioDurations[item.id] || 0}
                   />
                 ) : (
                   <Text style={{
                     textAlign: isRTL ? 'right' : 'left',
                     color: isSentMessage ? '#000' : '#fff'
                   }}>
                     {item.content || 'No content'}
                   </Text>
                 )}

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
           style={styles.messagesList}
         />

         {loading && (
           <Text style={styles.loading}>{i18n.t('loading')}</Text>
         )}

         <View style={[styles.inputContainer, {
           flexDirection: isRTL ? 'row-reverse' : 'row'
         }]}>
           {!recordingUri && (
             <TextInput
               value={message}
               onChangeText={setMessage}
               placeholder={i18n.t('typeMessage')}
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
               <Text style={styles.recordingText}>Voice message recorded</Text>
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
               onPress={() => sendVoiceMessage()}
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
             <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
               <Text style={styles.sendButtonText}>{i18n.t('send')}</Text>
             </TouchableOpacity>
           )}
         </View>

         {isRecording && (
           <View style={styles.recordingIndicator}>
             <View style={styles.recordingDot} />
             <Text style={styles.recordingText}>Recording...</Text>
           </View>
         )}
    </View>
  );
}

const styles = StyleSheet.create({
 container: {
     flex: 1,
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
   messagesList: {
     flex: 1,
     padding: 10,
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
     fontSize: 12,
   },
   timestamp: {
     fontSize: 11,
     color: '#888',
     textAlign: 'right',
     marginTop: 5,
   },
   inputContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     padding: 10,
     borderTopWidth: 1,
     borderTopColor: '#ddd',
     backgroundColor: '#fff',
   },
   input: {
     flex: 1,
     backgroundColor: '#ECE5DD',
     padding: 12,
     borderRadius: 25,
     borderWidth: 1,
     borderColor: '#ddd',
     marginRight: 10,
     maxHeight: 100,
   },
   sendButton: {
     backgroundColor: '#825DEF',
     paddingVertical: 12,
     paddingHorizontal: 20,
     borderRadius: 25,
   },
   sendButtonText: {
     color: '#fff',
     fontWeight: 'bold',
   },
   voiceButton: {
     width: 45,
     height: 45,
     borderRadius: 22.5,
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 10,
     elevation: 3,
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.2,
     shadowRadius: 3,
   },
   sendVoiceButton: {
     width: 45,
     height: 45,
     borderRadius: 22.5,
     backgroundColor: '#128C7E',
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 10,
   },
   loading: {
     textAlign: 'center',
     fontSize: 16,
     color: '#888',
     marginTop: 20,
   },
   recordingIndicator: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     padding: 10,
     backgroundColor: '#ff4444',
   },
   recordingDot: {
     width: 8,
     height: 8,
     borderRadius: 4,
     backgroundColor: 'white',
     marginRight: 8,
   },
   recordingText: {
     color: 'white',
     fontWeight: 'bold',
   },
   recordingPreview: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#f0f0f0',
     padding: 12,
     borderRadius: 25,
     marginRight: 10,
   },
   cancelButton: {
     marginLeft: 'auto',
     padding: 5,
   },

   voiceMessageContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: 'rgba(255,255,255,0.1)',
     borderRadius: 20,
     padding: 10,
     minWidth: 180,
   },
   playButton: {
     width: 32,
     height: 32,
     borderRadius: 16,
     backgroundColor: 'rgba(255,255,255,0.9)',
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 10,
   },
   audioWaveform: {
     flexDirection: 'row',
     alignItems: 'center',
     flex: 1,
     height: 25,
     marginHorizontal: 5,
   },
   waveformBar: {
     width: 3,
     backgroundColor: '#825DEF',
     marginHorizontal: 1,
     borderRadius: 1.5,
   },
   audioDuration: {
     fontSize: 11,
     color: '#666',
     fontWeight: '500',
     minWidth: 25,
     textAlign: 'center',
   },
});
