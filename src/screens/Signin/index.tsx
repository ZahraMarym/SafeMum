import { Text } from '@/components/Text';
import { TextBold } from '@/components/TextBold';
import { TextInput } from '@/components/TextInput';
import i18n from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';
import * as Updates from 'expo-updates';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  I18nManager,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type SpeechRecognitionErrorCode,
} from 'expo-speech-recognition';

const EXPO_PUBLIC_URL = process.env.EXPO_PUBLIC_URL;

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

// ===== Voice command dictionaries =====
const EN_CMDS = {
  login: ['login', 'sign in', 'submit'],
  back: ['back'],
  signup: ['sign up', 'create account'],
  forgot: ['forgot password', 'reset password']
};
const UR_CMDS = {
  login: ['لاگ اِن', 'سائن اِن', 'جمع'],
  back: ['پیچھے'],
  signup: ['سائن اَپ', 'اکاؤنٹ بناؤ'],
  forgot: ['پاسورڈ بھول گیا', 'پاسورڈ ری سیٹ']
};

// Add voice instruction dictionaries after the command dictionaries
const EN_INSTRUCTIONS = {
  speakEmail: "Please speak your email",
  speakPassword: "Please speak your password",
  emailSet: "Email has been set",
  passwordSet: "Password has been set",
  listening: "Listening...",
  voiceCommands: "Voice Commands",
  youSaid: "You said"
};

const UR_INSTRUCTIONS = {
  speakEmail: "برائے مہربانی اپنا ای میل بولیں",
  speakPassword: "برائے مہربانی اپنا پاسورڈ بولیں",
  emailSet: "ای میل سیٹ کر دیا گیا ہے",
  passwordSet: "پاسورڈ سیٹ کر دیا گیا ہے",
  listening: "سن رہا ہے...",
  voiceCommands: "آوازی احکامات",
  youSaid: "آپ نے کہا"
};

const saidAny = (said: string, arr: string[]) =>
  arr.some(w => said.includes(w.toLowerCase()));

export default function LoginScreen() {
  const router = useRouter();
  const [locale, setLocale] = useState(i18n.locale as 'en' | 'ur');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { language, textDirection } = useSelector((state: any) => state.language);

  // voice UI state
  const [recognizing, setRecognizing] = useState(false);
  const [heard, setHeard] = useState('');
  const guardRef = useRef(false);
  const alertShownRef = useRef(false);
  const resultLatchRef = useRef(0);

  // Add new state for field focus
  const [activeField, setActiveField] = useState<'email' | 'password' | null>(null);

  // ===== TTS helpers =====
  const speakLang = useMemo(() => (locale === 'ur' ? 'ur-PK' : 'en-US'), [locale]);

  const speak = useCallback(
    (msg: string) => {
      // Stop any ongoing speech first
      try { Speech.stop(); } catch {}
      Speech.speak(msg, { language: speakLang, pitch: 1.0 });
    },
    [speakLang]
  );

  const voiceMsgIncomplete = useMemo(
    () =>
      locale === 'ur'
        ? 'براہِ مہربانی پہلے ای میل اور پاس ورڈ درج کریں۔'
        : 'Please enter your email and password first.',
    [locale]
  );

  const changeLanguage = async (lang: 'en' | 'ur') => {
    const rtl = lang === 'ur';
    const rtlChanged = I18nManager.isRTL !== rtl;

    i18n.locale = lang;
    setLocale(lang);

    if (rtlChanged) {
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
      await Updates.reloadAsync();
    }
  };

  const checkConnection = useCallback(async () => {
    const net = await NetInfo.fetch();
    const reachable = net.isInternetReachable ?? (net.isConnected === true);
    return reachable;
  }, []);

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      Alert.alert(i18n.t('error'), i18n.t('emailPasswordRequired') || 'Email and password are required.');
      // Also speak for accessibility
      speak(voiceMsgIncomplete);
      return;
    }

    const online = await checkConnection();
    if (!online) {
      const msg = i18n.t('noInternet') || 'No Internet Connection';
      Alert.alert(i18n.t('error'), msg);
      speak(msg as string);
      return;
    }

    try {
      const response = await axios.post(
        `${EXPO_PUBLIC_URL}/users/login`,
        { email, password },
        {
          headers: { 'Content-Type': 'application/json', Accept: '*/*' },
          validateStatus: () => true,
        }
      );

      if (response.status === 200 && response.data.success) {
        Alert.alert(i18n.t('success'), response.data.message);

        await SecureStore.setItemAsync('accessToken', response.data.token);
        await SecureStore.setItemAsync('user', JSON.stringify(response.data));
        if (response.data.refreshToken) {
          await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
        }

        if (response.data.role === 'Admin') {
          router.push('/(admin-tabs)/(admin-home)');
        } else {
          router.push('/(tabs)/(home)');
        }
      } else {
        const msg = response.data?.message || 'Invalid credentials.';
        Alert.alert(i18n.t('loginFailed') || 'Login Failed', msg);
        speak(msg);
      }
    } catch (error: any) {
      const msg = (i18n.t('tryAgain') as string) || 'Something went wrong. Please try again.';
      Alert.alert(i18n.t('loginError') || 'Login Error', msg);
      speak(msg);
    }
  }, [email, password, router, checkConnection, speak, voiceMsgIncomplete]);

  // ===== Speech recognition events =====
  useSpeechRecognitionEvent('start', () => setRecognizing(true));
  useSpeechRecognitionEvent('end', () => setRecognizing(false));

  useSpeechRecognitionEvent('result', (event) => {
    const said = (event.results?.[0]?.transcript ?? '').toLowerCase().trim();
    if (!said) return;

    setHeard(said);

    // Handle voice typing for active field with localized feedback
    if (activeField && !resultLatchRef.current) {
      if (activeField === 'email') {
        setEmail(said.replace(/\s+/g, '').toLowerCase());
        setActiveField(null);
        speak(voiceInstructions.emailSet);
        return;
      } else if (activeField === 'password') {
        setPassword(said.replace(/\s+/g, ''));
        setActiveField(null);
        speak(voiceInstructions.passwordSet);
        return;
      }
    }

    if (resultLatchRef.current > 0) return;

    const dict = locale === 'ur' ? UR_CMDS : EN_CMDS;
    const doLogin = saidAny(said, dict.login);
    const goBack = saidAny(said, dict.back);
    const goSignup = saidAny(said, dict.signup);
    const goForgot = saidAny(said, dict.forgot);

    if ((doLogin || goBack || goSignup || goForgot) && !guardRef.current) {
      guardRef.current = true;
      resultLatchRef.current = Date.now();
      try { ExpoSpeechRecognitionModule.stop(); } catch {}

      setTimeout(async () => {
        if (doLogin) {
          // Extra guard: require fields before voice-login
          if (!email || !password) {
            speak(voiceMsgIncomplete);
          } else {
            await handleLogin();
          }
        } else if (goBack) {
          router.back();
        } else if (goSignup) {
          router.push('/(signup)');
        } else if (goForgot) {
          router.push('/(signin)/forgot-password');
        }
        setTimeout(() => {
          guardRef.current = false;
          resultLatchRef.current = 0;
        }, 300);
      }, 200);
    }
  });

  useSpeechRecognitionEvent('error', (e) => {
    setRecognizing(false);
    if (alertShownRef.current) return;
    alertShownRef.current = true;

    const code = e.error as SpeechRecognitionErrorCode;
    let msg = e.message || (i18n.t('speechFailed') as string) || 'Speech recognition failed.';
    if (code === 'no-speech') msg = (i18n.t('noSpeech') as string) || 'No speech detected. Please try again.';
    if (code === 'not-allowed') msg = (i18n.t('micDenied') as string) || 'Microphone/Speech permission denied.';
    if (code === 'service-not-allowed') msg = (i18n.t('serviceUnavailable') as string) || 'Speech service not available.';
    if (code === 'language-not-supported') msg = (i18n.t('langNotSupported') as string) || 'Selected language not supported.';

    Alert.alert((i18n.t('speechError') as string) || 'Speech Error', msg, [
      { text: 'OK', onPress: () => (alertShownRef.current = false) },
    ]);
    speak(msg);
  });

  // ===== Permissions & availability =====
  const ensurePermissions = useCallback(async () => {
    try {
      const cur = await ExpoSpeechRecognitionModule.getPermissionsAsync?.();
      if (!cur?.granted) {
        const req = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!req.granted) return false;
      }

      if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        const mic = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (mic !== PermissionsAndroid.RESULTS.GRANTED) return false;
      }

      const available = await (ExpoSpeechRecognitionModule.isRecognitionAvailableAsync?.()
        ?? ExpoSpeechRecognitionModule.isRecognitionAvailable?.());
      if (!available) {
        const msg =
          (i18n.t('installGoogleSpeech') as string) ||
          "Speech recognition isn't available. Ensure Google Speech Services are installed/enabled.";
        Alert.alert((i18n.t('unavailable') as string) || 'Unavailable', msg);
        speak(msg);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }, [speak]);

  const canUseVoice = email.length > 0 && password.length > 0;

  // Add voice instructions based on locale
  const voiceInstructions = useMemo(() =>
    locale === 'ur' ? UR_INSTRUCTIONS : EN_INSTRUCTIONS,
  [locale]);

  // Modify startListening to use localized instructions
  const startListening = useCallback(async (field?: 'email' | 'password') => {
    if (field) {
      setActiveField(field);
      speak(field === 'email' ? voiceInstructions.speakEmail : voiceInstructions.speakPassword);
    } else if (!canUseVoice) {
      speak(voiceMsgIncomplete);
      return;
    }

    guardRef.current = false;
    resultLatchRef.current = 0;
    alertShownRef.current = false;

    const ok = await ensurePermissions();
    if (!ok) return;

    try {
      await ExpoSpeechRecognitionModule.start({
        lang: locale === 'ur' ? 'ur-PK' : 'en-US',
        interimResults: false,
        continuous: false,
      });
    } catch {
      if (!alertShownRef.current) {
        alertShownRef.current = true;
        const msg = (i18n.t('cantStartSpeech') as string) || 'Could not start speech recognition.';
        Alert.alert((i18n.t('error') as string) || 'Error', msg, [
          { text: 'OK', onPress: () => (alertShownRef.current = false) },
        ]);
        speak(msg);
      }
    }
  }, [ensurePermissions, locale, canUseVoice, speak, voiceMsgIncomplete, voiceInstructions]);

  const stopListening = useCallback(async () => {
    try { await ExpoSpeechRecognitionModule.stop(); } catch {}
  }, []);

  useEffect(() => {
    return () => { try { ExpoSpeechRecognitionModule.stop(); } catch {} };
  }, []);



  const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6FF', paddingHorizontal: 24, paddingTop: 60 },
  backButton: {
    position: 'absolute',
    top: 60,
    width:"100%",
    left: isRTL ? undefined : 24,
    right: isRTL ? 24 : undefined,
  },
  title: { fontSize: 22, alignSelf: 'center', marginTop: 10, marginBottom: 40, textAlign: 'center' },
  label: {
    fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#000',
    textAlign: isRTL ? 'right' : 'left', alignSelf: isRTL ? 'flex-end' : 'flex-start',
  },
  inputContainer: { marginBottom: 28 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, borderColor: '#E5E7EB', borderWidth: 1,             textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  forgotPassword: { marginTop: 4, alignSelf: isRTL ? 'flex-end' : 'flex-start' , width:"100%"},
  forgotText: { color: '#F87171', fontSize: 12 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  button: {
    flexDirection: 'row', width: screenWidth * 0.8, marginTop: 16, backgroundColor: '#A78BFA',
    paddingVertical: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
    borderRadius: 14, shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0.6, shadowRadius: 6, elevation: 6,
  },
  buttonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', letterSpacing: 0.8 },

  // Voice button
  voiceBtn: {
    flexDirection: 'row', alignSelf: 'center', marginTop: 14, backgroundColor: '#6D28D9',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', gap: 8,
  },
  voiceBtnOn: { backgroundColor: '#10B981' },
  voiceBtnDisabled: { opacity: 0.4 }, // visually disabled until fields complete
  voiceText: { color: '#fff', fontSize: 16, marginLeft: 8 },
  heardText: { marginTop: 8, fontSize: 12, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' },

  signupRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'center',
    marginTop: 20,
    alignItems: 'center',
  },
  signupText: { fontSize: 14, color: '#6B7280', marginHorizontal: 4, textAlign: isRTL ? 'right' : 'left' },
  signupLink: { fontSize: 14, color: '#8B5CF6', fontWeight: '600', textAlign: isRTL ? 'right' : 'left' },
});


  return (
    <View style={styles.container}>
      {/* Back */}
      {/* Back Button */}
            <TouchableOpacity
              style={[styles.backButton, {
                alignSelf: isRTL ? 'flex-end' : 'flex-start'
              }]}
              onPress={() => router.back()}
            >
              <Ionicons
                name={isRTL ? "chevron-forward" : "chevron-back"}
                size={24}
                color="black"
              />
            </TouchableOpacity>

      <TextBold style={styles.title}>{i18n.t('login')}</TextBold>

      {/* Email */}
      <Text style={styles.label}>{i18n.t('email')}</Text>
      <View style={styles.inputContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
                    onPress={() => startListening('email')}
                    style={{
                      padding: 8,
                      marginLeft: 8,
                    }}
                  >
                    <Ionicons
                      name={activeField === 'email' ? 'mic' : 'mic-outline'}
                      size={24}
                      color="#6D28D9"
                    />
                  </TouchableOpacity>
          <TextInput
            placeholder={i18n.t('enterEmail')}
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { flex: 1 }]}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

        </View>
        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => router.push('/(signin)/forgot-password')}
        >
          <Text style={styles.forgotText}>{i18n.t('forgotPassword')}</Text>
        </TouchableOpacity>
      </View>

      {/* Password */}
      <Text style={styles.label}>{i18n.t('password')}</Text>
      <View style={styles.inputContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
         <TouchableOpacity
                    onPress={() => startListening('password')}
                    style={{
                      padding: 8,
                      marginLeft: 8,
                    }}
                  >
                    <Ionicons
                      name={activeField === 'password' ? 'mic' : 'mic-outline'}
                      size={24}
                      color="#6D28D9"
                    />
                  </TouchableOpacity>
          <TextInput
            placeholder={i18n.t('enterPassword')}
            placeholderTextColor="#A3A3A3"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { flex: 1 }]}
          />

        </View>
      </View>

      {/* Primary CTA (manual) */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <TextBold style={styles.buttonText}>{i18n.t('login')}</TextBold>
        </TouchableOpacity>
      </View>

      {/* Voice control button */}
      <TouchableOpacity
        style={[
          styles.voiceBtn,
          recognizing && styles.voiceBtnOn,
          !canUseVoice && styles.voiceBtnDisabled,
        ]}
        onPress={recognizing ? stopListening : startListening}
        activeOpacity={canUseVoice ? 0.7 : 1}
      >
        <Ionicons name={recognizing ? 'mic' : 'mic-outline'} size={22} color="#fff" />
        <TextBold style={styles.voiceText}>
          {recognizing ? voiceInstructions.listening : voiceInstructions.voiceCommands}
        </TextBold>
      </TouchableOpacity>

      {/* Last heard phrase */}
      {heard ? (
        <Text style={styles.heardText}>
          {voiceInstructions.youSaid}: "{heard}"
        </Text>
      ) : null}

      {/* Signup row */}
      <View style={styles.signupRow}>
        <Text style={styles.signupText}>{i18n.t('dontHaveAccount')}</Text>
        <TouchableOpacity onPress={() => router.push('/(signup)')}>
          <TextBold style={styles.signupLink}>{i18n.t('signUp')}</TextBold>
        </TouchableOpacity>
      </View>
    </View>
  );
}

