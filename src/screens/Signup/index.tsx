import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform, I18nManager, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import { useDispatch, useSelector } from 'react-redux'; // Import Redux hooks
import { setLanguage } from '@/redux/slice/languageSlice'; // Import language action
import i18n from '@/i18n';
import { useRouter } from 'expo-router';
import axios from 'axios';

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

const CreateAccountScreen = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locale, setLocale] = useState(i18n.locale);

  const language = useSelector((state) => state.language.language); // Get the current language from Redux state

const handleSignUp = async () => {
  if (!firstName || !lastName || !email || !password) {
    Alert.alert("Error", "All fields are required.");
    return;
  }

  const payload = {
    email,
    password,
    username: `${firstName}${lastName}`, // or ask user to input separately
    firstName,
    lastName,
  };

  try {
    const response = await axios.post(
      `${process.env.url}/users/register`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
      }
    );

    console.log('User registered:', response.data);
    Alert.alert("Success", "Account created successfully!");

    // Optional: Navigate to login screen
    router.push("/(signin)");
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    Alert.alert(
      "Error",
      error.response?.data?.message || "Failed to create account."
    );
  }
};


  const changeLanguage = async (lang: string) => {
    dispatch(setLanguage(lang)); // Dispatch action to update language in Redux store
    i18n.locale = lang; // Set the language in i18n

    const rtl = lang === 'ur'; // If language is Urdu, apply RTL
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
      await Updates.reloadAsync(); // Refresh the UI after changing the language
    }
  };

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#000" />
      </TouchableOpacity>
      <TextBold style={styles.title}>{i18n.t('createAccount')}</TextBold>

      <Text style={styles.subtitle}>
        {i18n.t('createAccountSubtitle')}
      </Text>

      {/* First Name */}
      <Text style={styles.label}>{i18n.t('firstName')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterFirstName')}
        placeholderTextColor="#A9A9A9"
        value={firstName}
        onChangeText={setFirstName}
      />

      {/* Last Name */}
      <Text style={styles.label}>{i18n.t('lastName')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterLastName')}
        placeholderTextColor="#A9A9A9"
        value={lastName}
        onChangeText={setLastName}
      />

      {/* Email */}
      <Text style={styles.label}>{i18n.t('email')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterEmail')}
        placeholderTextColor="#A9A9A9"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      {/* Password */}
      <Text style={styles.label}>{i18n.t('password')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterPassword')}
        placeholderTextColor="#A9A9A9"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleSignUp}
        >
          <TextBold style={styles.buttonText}>{i18n.t('signUp')}</TextBold>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footerText}>
        {i18n.t('alreadyHaveAccount')}{" "}
        <Text style={styles.loginLink} onPress={() => router.push("/(signin)")}>
          {i18n.t('login')}
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6FF',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    alignSelf: 'center',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
    textAlign: isRTL ? 'right' : 'left',
    alignSelf: isRTL ? 'flex-end' : 'flex-start',
  },
  subtitle: {
    textAlign: "center",
    marginTop: 3,
    fontSize: 16,
    color: "#000",
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
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
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
  footerText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
    color: "#7D7D7D",
  },
  loginLink: {
    color: "#8877F5",
    fontWeight: "500",
  },
});

export default CreateAccountScreen;
