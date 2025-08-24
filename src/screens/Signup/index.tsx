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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
const EXPO_PUBLIC_URL = process.env.EXPO_PUBLIC_URL;

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type SpeechRecognitionErrorCode,
} from 'expo-speech-recognition';

const screenWidth = Dimensions.get('window').width;
const isRTL = false; // I18nManager.isRTL;

// ===== Voice command dictionaries =====
const EN_CMDS = {
  signup: ['sign up', 'create account', 'register'],
  back: ['back'],
  login: ['login', 'sign in'],
  adminOn: ['admin mode', 'register as admin'],
  adminOff: ['user mode', 'register as user'],
};
const UR_CMDS = {
  signup: ['سائن اَپ', 'اکاؤنٹ بناؤ', 'رجسٹر'],
  back: ['پیچھے'],
  login: ['لاگ اِن', 'سائن اِن'],
  adminOn: ['ایڈمن موڈ', 'ایڈمن کے طور پر رجسٹر'],
  adminOff: ['یوزر موڈ', 'یوزر کے طور پر رجسٹر'],
};

const saidAny = (said: string, arr: string[]) => arr.some((w) => said.includes(w.toLowerCase()));

const CreateAccountScreen = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isAdmin, setIsAdmin]     = useState(false);
  const [userType, setUserType]   = useState('');
  const [role, setRole]           = useState('');

  const { language, textDirection } = useSelector((state: any) => state.language);
  const locale = language; // keep local alias

  // ===== Voice state =====
  const [recognizing, setRecognizing] = useState(false);
  const [heard, setHeard]             = useState('');
  const guardRef = useRef(false);
  const alertShownRef = useRef(false);
  const resultLatchRef = useRef(0);

  // ===== TTS helpers =====
  const speakLang = useMemo(() => (locale === 'ur' ? 'ur-PK' : 'en-US'), [locale]);
  const speak = useCallback(
    (msg: string) => {
      try { Speech.stop(); } catch {}
      Speech.speak(msg, { language: speakLang, pitch: 1.0 });
    },
    [speakLang]
  );

  const voiceMsgIncomplete = useMemo(
    () =>
      locale === 'ur'
        ? 'براہِ مہربانی تمام مطلوبہ خانے پُر کریں۔'
        : 'Please fill in all required fields first.',
    [locale]
  );

  const isFieldsComplete = useMemo(() => {
    if (!firstName || !lastName || !email || !password) return false;
    if (isAdmin && !userType) return false;
    return true;
  }, [firstName, lastName, email, password, isAdmin, userType]);

  const checkConnection = useCallback(async () => {
    const net = await NetInfo.fetch();
    const reachable = net.isInternetReachable ?? (net.isConnected === true);
    return reachable;
  }, []);



const handleSignUp = useCallback(async () => {
  if (!isFieldsComplete) {
    Alert.alert('Error', 'All fields are required.');
    speak(voiceMsgIncomplete);
    return;
  }

  // Normalize inputs
  const clean = {
    firstName: firstName.trim(),
    lastName:  lastName.trim(),
    email:     email.trim().toLowerCase(),
    password, // keep exact
    userType:  isAdmin
      ? userType.trim().charAt(0).toUpperCase() + userType.trim().slice(1).toLowerCase() // Capital Case
      : 'User',
    role:      isAdmin ? 'Admin' : 'User',
  };

  const payload = {
    email: clean.email,
    password: clean.password,
    username: `${clean.firstName}${clean.lastName}`.replace(/\s+/g, ''),
    firstName: clean.firstName,
    lastName: clean.lastName,
    userType: clean.userType,
    role: clean.role,
  };

  try {
    // 1) REGISTER
    const reg = await axios.post(`${EXPO_PUBLIC_URL}/users/register`, payload, {
      headers: { 'Content-Type': 'application/json', Accept: '*/*' },
      validateStatus: () => true,
    });
    console.log('REGISTER status:', reg.status, 'data:', reg.data);

    const regSuccess =
      (reg.status === 200 || reg.status === 201) &&
      (reg.data?.success === true || reg.data?.id || reg.data?._id);

    if (!regSuccess) {
      const serverMsg = extractApiError(reg.data.errorMessage || reg.data.errorMessage.key);
      const msg = buildStatusAwareMessage(reg.status, serverMsg, locale);
      Alert.alert('Register Failed', msg);
      speak(msg);
      return;
    }

    Alert.alert(
      'Success',
      locale === 'ur' ? 'اکاؤنٹ کامیابی سے بن گیا!' : 'Account created successfully!'
    );

    // small pause to avoid any eventual consistency issues
    await new Promise((r) => setTimeout(r, 250));

    // 2) LOGIN — email first
    let loginResp = await axios.post(
      `${EXPO_PUBLIC_URL}/users/login`,
      { email: clean.email, password: clean.password /*, role: clean.role */ },
      { headers: { 'Content-Type': 'application/json', Accept: '*/*' }, validateStatus: () => true }
    );
    console.log('LOGIN(email) status:', loginResp.status, 'data:', loginResp.data);

    // Fallback: username login if email flow failed
    if (!(loginResp.status === 200 && loginResp.data?.success)) {
      const fb = await axios.post(
        `${EXPO_PUBLIC_URL}/users/login`,
        { username: payload.username, password: clean.password /*, role: clean.role */ },
        { headers: { 'Content-Type': 'application/json', Accept: '*/*' }, validateStatus: () => true }
      );
      console.log('LOGIN(username) status:', fb.status, 'data:', fb.data);
      if (fb.status === 200 && fb.data?.success) loginResp = fb;
    }

    if (loginResp.status === 401 || loginResp.status === 403) {
      const serverMsg = extractApiError(loginResp.data);
      const msg = serverMsg || (locale === 'ur' ? 'براہِ مہربانی پہلے تصدیق کریں۔' : 'Please verify your email/OTP first.');
      Alert.alert('Verification Required', msg);
      speak(msg);
      return;
    }

    if (!(loginResp.status === 200 && loginResp.data?.success)) {
      const serverMsg = extractApiError(loginResp.data);
      const msg = buildStatusAwareMessage(loginResp.status, serverMsg, locale);
      Alert.alert('Login Failed', msg);
      speak(msg);
      return;
    }

    // 3) SAVE + NAVIGATE
    await SecureStore.setItemAsync('accessToken', loginResp.data.token);
    await SecureStore.setItemAsync('user', JSON.stringify(loginResp.data));
    if (loginResp.data.refreshToken) {
      await SecureStore.setItemAsync('refreshToken', loginResp.data.refreshToken);
    }

    if (loginResp.data.role === 'Admin') {
      router.push('/(admin-tabs)/(admin-home)');
    } else {
      router.push('/(signup)/medical-information');
    }
  } catch (err: any) {
    const status = err?.response?.status;
    const serverMsg = extractApiError(err?.response?.data);
    const msg = buildStatusAwareMessage(status, serverMsg, locale);
    console.log('SIGNUP/LOGIN error:', status, err?.response?.data, err?.message);
    Alert.alert('Error', msg);
    speak(msg.errorMessage);
  }
}, [
  isFieldsComplete,
  isAdmin,
  userType,
  email,
  password,
  firstName,
  lastName,
  router,
  speak,
  voiceMsgIncomplete,
  locale,
]);

// -------- Helpers: readable error messages (EN/UR) --------
const tMsg = (locale: 'en'|'ur', en: string, ur: string) => (locale === 'ur' ? ur : en);

const extractApiError = (data: any): string | null => {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data.message && typeof data.message === 'string') return data.message;
  if (data.error && typeof data.error === 'string') return data.error;

  // Common validation error shapes
  if (Array.isArray(data.errors) && data.errors.length) {
    // prefer "msg" (express-validator), then "message"
    const msgs = data.errors
      .map((e: any) => e?.msg || e?.message || e?.error || e?.detail || '')
      .filter(Boolean);
    if (msgs.length) return msgs.join('\n');
  }
  if (data.details && typeof data.details === 'string') return data.details;
  if (data.detail && typeof data.detail === 'string') return data.detail;

  try {
    // last resort: stringify safely (truncated)
    const s = JSON.stringify(data);
    return s?.length > 300 ? s.slice(0, 300) + '…' : s;
  } catch { return null; }
};

const buildStatusAwareMessage = (
  status: number | undefined,
  serverMsg: string | null,
  locale: 'en'|'ur'
) => {
  if (serverMsg) return serverMsg;

  // Friendly fallbacks by status
  switch (status) {
    case 400: return tMsg(locale, 'Bad request. Please check the form inputs.', 'غلط درخواست۔ براہِ کرم فارم کی معلومات چیک کریں۔');
    case 401: return tMsg(locale, 'Unauthorized. Please sign in first.', 'غیر مجاز۔ براہِ کرم پہلے سائن اِن کریں۔');
    case 403: return tMsg(locale, 'Forbidden. You don’t have access for this action.', 'منع۔ آپ کو اس عمل کی اجازت نہیں۔');
    case 409: return tMsg(locale, 'This email already exists. Try signing in instead.', 'یہ ای میل پہلے سے موجود ہے۔ براہِ کرم سائن اِن کریں۔');
    case 422: return tMsg(locale, 'Validation failed. Please fix the highlighted fields.', 'توثیق ناکام۔ براہِ کرم غلط خانوں کی تصحیح کریں۔');
    case 429: return tMsg(locale, 'Too many attempts. Please wait and try again.', 'بہت زیادہ کوششیں۔ کچھ دیر بعد دوبارہ کوشش کریں۔');
    default:
      if (status && status >= 500) {
        return tMsg(locale, 'Server error. Please try again later.', 'سرور میں خرابی۔ براہِ کرم بعد میں دوبارہ کوشش کریں۔');
      }
      return tMsg(locale, 'Something went wrong. Please try again.', 'کچھ غلط ہو گیا۔ براہِ کرم دوبارہ کوشش کریں۔');
  }
};



  // ===== Speech recognition events =====
  useSpeechRecognitionEvent('start', () => setRecognizing(true));
  useSpeechRecognitionEvent('end', () => setRecognizing(false));

  useSpeechRecognitionEvent('result', (event) => {
    const said = (event.results?.[0]?.transcript ?? '').toLowerCase().trim();
    if (!said) return;

    setHeard(said);
    if (resultLatchRef.current > 0) return;

    const dict = locale === 'ur' ? UR_CMDS : EN_CMDS;
    const doSignup = saidAny(said, dict.signup);
    const goBack   = saidAny(said, dict.back);
    const goLogin  = saidAny(said, dict.login);
    const turnAdminOn  = saidAny(said, dict.adminOn);
    const turnAdminOff = saidAny(said, dict.adminOff);

    if ((doSignup || goBack || goLogin || turnAdminOn || turnAdminOff) && !guardRef.current) {
      guardRef.current = true;
      resultLatchRef.current = Date.now();
      try { ExpoSpeechRecognitionModule.stop(); } catch {}

      setTimeout(async () => {
        if (doSignup) {
          if (!isFieldsComplete) {
            speak(voiceMsgIncomplete);
          } else {
            const online = await checkConnection();
            if (!online) {
              const msg = locale === 'ur' ? 'انٹرنیٹ دستیاب نہیں۔' : 'No internet connection.';
              Alert.alert('Error', msg);
              speak(msg);
            } else {
              handleSignUp();
            }
          }
        } else if (goBack) {
          router.back();
        } else if (goLogin) {
          router.push('/(signin)');
        } else if (turnAdminOn) {
          setIsAdmin(true);
          speak(locale === 'ur' ? 'ایڈمن موڈ فعال۔' : 'Admin mode enabled.');
        } else if (turnAdminOff) {
          setIsAdmin(false);
          speak(locale === 'ur' ? 'یوزر موڈ فعال۔' : 'User mode enabled.');
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

  // Allow mic only when fields complete
  const canUseVoice = isFieldsComplete;

  const startListening = useCallback(async () => {
    if (!canUseVoice) {
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
  }, [ensurePermissions, locale, canUseVoice, speak, voiceMsgIncomplete]);

  const stopListening = useCallback(async () => {
    try { await ExpoSpeechRecognitionModule.stop(); } catch {}
  }, []);

  useEffect(() => {
    return () => { try { ExpoSpeechRecognitionModule.stop(); } catch {} };
  }, []);

  // ===== UI =====
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons 
          name={isRTL ? "chevron-back" : "chevron-forward"} 
          size={24} 
          color="#000" 
        />
      </TouchableOpacity>

      {/* Form Fields */}
      <TextBold style={styles.title}>{i18n.t('createAccount')}</TextBold>
      <Text style={styles.subtitle}>{i18n.t('createAccountSubtitle')}</Text>

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{i18n.t('firstName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('enterFirstName')}
            value={firstName}
            onChangeText={setFirstName}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>
      </View>

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{i18n.t('lastName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('enterLastName')}
            value={lastName}
            onChangeText={setLastName}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>
      </View>

      <Text style={styles.label}>{i18n.t('email')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterEmail')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textAlign={isRTL ? 'right' : 'left'}
      />

      <Text style={styles.label}>{i18n.t('password')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterPassword')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textAlign={isRTL ? 'right' : 'left'}
      />

      {/* Admin toggle link (manual) */}
      <TouchableOpacity onPress={() => setIsAdmin(!isAdmin)}>
        <Text style={styles.linkText}>
          {isAdmin ? i18n.t('registerAsUser') : i18n.t('registerAsAdmin')}
        </Text>
      </TouchableOpacity>

      {/* Admin-only fields */}
      {isAdmin && (
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{i18n.t('userType')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('enterUserType')}
              value={userType}
              onChangeText={(text) => setUserType(text.toUpperCase())}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          <TextBold style={styles.buttonText}>{i18n.t('signUp')}</TextBold>
        </TouchableOpacity>
      </View>

      {/* Voice control button */}
      <TouchableOpacity
        style={[styles.voiceBtn, recognizing && styles.voiceBtnOn, !canUseVoice && styles.voiceBtnDisabled]}
        onPress={recognizing ? stopListening : startListening}
        activeOpacity={canUseVoice ? 0.7 : 1}
      >
        <Ionicons 
          name={recognizing ? 'mic' : 'mic-outline'} 
          size={22} 
          color="#fff" 
        />
        <TextBold style={[
          styles.voiceText,
          { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }
        ]}>
          {recognizing ? i18n.t('listening') : i18n.t('voiceCommands')}
        </TextBold>
      </TouchableOpacity>

      {heard ? (
        <Text style={styles.heardText}>
          {i18n.t('youSaid') || 'You said'}: “{heard}”
        </Text>
      ) : null}

      {/* Footer */}
      <View style={[
        styles.footerContainer,
        { flexDirection: isRTL ? 'row-reverse' : 'row' }
      ]}>
        <Text style={styles.footerText}>
          {i18n.t('alreadyHaveAccount')}
        </Text>
        <TouchableOpacity onPress={() => router.push('/(signin)')}>
          <Text style={styles.loginLink}>{i18n.t('login')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    backgroundColor: '#F6F6FF', 
    paddingHorizontal: 24, 
    paddingTop: 60,
    direction: isRTL ? 'rtl' : 'ltr'
  },
  backButton: {
    alignSelf: isRTL ? 'flex-end' : 'flex-start',
  },
  title: { 
    fontSize: 22, 
    alignSelf: 'center', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  subtitle: { 
    textAlign: 'center', 
    marginTop: 3, 
    fontSize: 16, 
    color: '#000' 
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
    textAlign: isRTL ? 'right' : 'left',
    alignSelf: isRTL ? 'flex-end' : 'flex-start',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr'
  },
  buttonContainer: { 
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'center', 
    alignItems: 'center', 
    alignSelf: 'center' 
  },
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
  voiceBtnDisabled: { opacity: 0.4 },
  voiceText: { color: '#fff', fontSize: 16, marginLeft: 8 },
  heardText: { marginTop: 8, fontSize: 12, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' },

  footerText: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#7D7D7D' },
  loginLink: { color: '#8877F5', fontWeight: '500' },
  linkText: { color: '#8877F5', fontWeight: '500', textAlign: 'center' },
});

// Additional styles
const additionalStyles = {
  footerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 4
  }
};

// Merge with existing styles
Object.assign(styles, additionalStyles);

export default CreateAccountScreen;
