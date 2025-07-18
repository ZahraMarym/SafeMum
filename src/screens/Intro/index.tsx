import React, { useEffect , useState} from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform, I18nManager, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { useDispatch, useSelector } from 'react-redux'; // Redux hooks
import { setLanguage } from '@/redux/slice/languageSlice'; // language action
import i18n from '@/i18n';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import Voice from '@react-native-voice/voice';
const { width } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;
import * as Speech from 'expo-speech';



export default function WelcomeScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  console.log("Voice", Voice)

  // Get the current language from Redux state
  const language = useSelector((state) => state.language.language);

  // Language change function
  const changeLanguage = (lang) => {
    dispatch(setLanguage(lang)); // Dispatch action to update language in Redux store
    i18n.locale = lang; // Set the language in i18n
    if (lang === 'ur') {
      I18nManager.forceRTL(true); // Apply RTL for Urdu
      I18nManager.allowRTL(true);
    } else {
      I18nManager.forceRTL(false); // Apply LTR for English
      I18nManager.allowRTL(false);
    }
  };

  // Language options for the dropdown
  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'اردو', value: 'ur' }
  ];

  // Set initial language state when the component mounts
  useEffect(() => {
    i18n.locale = language; // Set the locale for i18n
    if (language === 'ur') {
      I18nManager.forceRTL(true);
      I18nManager.allowRTL(true);
    } else {
      I18nManager.forceRTL(false);
      I18nManager.allowRTL(false);
    }
  }, [language]);

  // Toggle language switch
  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'ur' : 'en';
    changeLanguage(newLanguage); // Toggle language
  };

  // Check internet connection (mobile data or Wi-Fi)
  const checkConnection = async () => {
    const netState = await NetInfo.fetch();
    console.log('NetInfo state =', netState);

    if (netState.isConnected) {
      if (netState.type === 'cellular') {
        // If connected to mobile data
        router.push('/(signin)'); // Redirect to SignIn screen
      } else if (netState.type === 'wifi') {
        // If connected to Wi-Fi
         router.push('/(signin)'); // Redirect to SignIn screen
      } else {
        // If no recognized network type (rare case)
        Alert.alert('No Network', 'Please check your network connection.');
      }
    } else {
      Alert.alert('No Internet Connection', 'You are not connected to the internet.');
      router.push('/(tabs)/(home)'); // Redirect to Home screen if no internet
    }
  };

  const [isListening, setIsListening] = useState(false);

    useEffect(() => {
      // Ensure Voice is available before adding listeners and starting recognition
      if (Voice) {
        console.log('Voice is available.');
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechError = onSpeechError;
        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechEnd = onSpeechEnd;

        startListening();
      } else {
        console.error('Voice module is not initialized');
      }

      // Cleanup listeners on unmount
      return () => {
        Voice.removeAllListeners();
        Voice.destroy();
      };
    }, []);

    const startListening = async () => {
      try {
        // Ensure Voice is available before calling start
        if (Voice) {
          console.log('Starting voice recognition...');
          await Voice.start('en-US'); // Start speech recognition in English
          setIsListening(true);
          console.log('Voice recognition started');
        } else {
          console.error('Voice module is not initialized');
        }
      } catch (error) {
        console.error('Error starting voice recognition:', error);
        Alert.alert('Error', 'There was an issue with starting voice recognition.');
      }
    };

    const stopListening = async () => {
      try {
        if (Voice) {
          console.log('Stopping voice recognition...');
          await Voice.stop();
          setIsListening(false);
        } else {
          console.error('Voice module is not initialized');
        }
      } catch (error) {
        console.error('Error stopping voice recognition:', error);
        Alert.alert('Error', 'There was an issue with stopping voice recognition.');
      }
    };

    const onSpeechResults = (e) => {
      const spokenWords = e.value;
      const command = spokenWords[0].toLowerCase();
      console.log('Command:', command);

      if (command.includes('next') || command.includes('agy') || command.includes('aghay jao')) {
        Alert.alert('Navigating to the next screen');
        // Handle navigation
      } else {
        Alert.alert('Invalid Command', 'Please say "next" or "back" (or their Urdu equivalents).');
      }

      // Restart listening after processing the command
      startListening();
    };

    const onSpeechError = (e) => {
      console.error('Speech Error:', e);
      Alert.alert('Error', 'An error occurred while recognizing speech.');
      startListening(); // Restart listening on error
    };

    const onSpeechStart = () => {
      console.log('Speech recognition started');
    };

    const onSpeechEnd = () => {
      console.log('Speech recognition ended');
      startListening(); // Restart listening after it ends
    };


  return (
    <View style={styles.container}>
      <TextBold style={styles.title}>{i18n.t('appName')}</TextBold>
      <Text style={styles.subtitle}>{i18n.t('subtitle')}</Text>

      <Text style={styles.description}>{i18n.t('description')}</Text>

      {/* Language Toggle Switch */}
      <View style={styles.languageContainer}>
        <Text style={styles.label}>{i18n.t('selectLanguage')}</Text>
        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>English</Text>
          <Switch
            value={language === 'ur'} // If the current language is Urdu, switch is on
            onValueChange={toggleLanguage} // Toggle language on switch change
            thumbColor={language === 'ur' ? '#A78BFA' : '#f4f3f4'}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
          />
          <Text style={styles.switchText}>اردو</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={checkConnection} // Call the checkMobileData function on button press
      >
        <TextBold style={styles.buttonText}>{i18n.t('getStarted')}</TextBold>
        <Ionicons name="arrow-forward" size={25} color="#fff" style={styles.icon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: width * 0.35,
    height: width * 0.35,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    fontSize: 35,
    color: '#A78BFA',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 19,
    fontWeight: '500',
    color: '#C4B5FD',
    textAlign: 'center',
  },
  description: {
    marginTop: 90,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 24,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  languageContainer: {
    marginTop: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center', // Ensure the container is centered
  },
  label: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    fontSize: 16,
    color: '#374151',
    marginHorizontal: 8,
  },
  button: {
    flexDirection: 'row',
    width: screenWidth * 0.8,
    marginTop: 16,
    backgroundColor: '#A78BFA',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    borderRadius: 14,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  icon: {
    marginLeft: 10,
  },
});
