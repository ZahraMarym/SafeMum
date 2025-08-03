import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform, I18nManager, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import { useDispatch, useSelector } from 'react-redux';
import { setLanguage } from '@/redux/slice/languageSlice';
import i18n from '@/i18n';
import { useRouter } from 'expo-router';
import axios from 'axios';
const EXPO_PUBLIC_URL = process.env.EXPO_PUBLIC_URL;
import * as SecureStore from 'expo-secure-store';

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

const CreateAccountScreen = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userType, setUserType] = useState('');
  const [role, setRole] = useState('');

  const language = useSelector((state) => state.language.language);

  const handleSignUp = () => {
    if (!firstName || !lastName || !email || !password || (isAdmin && !userType)) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    // Log userType and role to ensure they are being set correctly
    console.log("User Type:", isAdmin ? userType : 'User');
    console.log("Role:", isAdmin ? 'Admin' : 'User');

    const payload = {
      email,
      password,
      username: `${firstName}${lastName}`,
      firstName,
      lastName,
      userType: isAdmin ? userType : 'User',
      role: isAdmin ? 'Admin' : 'User',
    };

    console.log("Registration Payload:", payload); // Check if payload is correct

    axios
      .post(`${EXPO_PUBLIC_URL}/users/register`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
      })
      .then((response) => {
        console.log('User registered:', response.data);
        Alert.alert('Success', 'Account created successfully!');

        return axios.post(
          `${EXPO_PUBLIC_URL}/users/login`,
          { email, password },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: '*/*',
            },
            validateStatus: () => true,
          }
        );
      })
      .then((response) => {
        if (response.status === 200 && response.data.success) {
          console.log('Login Success:', response.data);

          SecureStore.setItemAsync('accessToken', response.data.token);

          const userData = JSON.stringify(response.data);
          SecureStore.setItemAsync('user', userData);
          console.log('User data stored at login:', response.data);

          if (response.data.refreshToken) {
            SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
          }

          // Conditional Navigation:
          if (response.data.role==="Admin") {
            router.push('/(admin-tabs)/(admin-home)');
          } else {
            router.push('/(signup)/medical-information');
          }
        } else {
          throw new Error('Login failed');
        }
      })
      .catch((error) => {
        console.error('Error:', error.response?.data || error.message);
        Alert.alert(
          'Error',
          error.response?.data?.message || 'Failed to create account or login.'
        );
      });
  };


  // Show admin registration form if isAdmin is true
  const renderAdminForm = () => (
    <>
      <Text style={styles.label}>{i18n.t('userType')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterUserType')}
        value={userType}
        onChangeText={(text) => setUserType(text.toUpperCase())}
      />

      {/* The role will always be "admin" when registering as an admin */}
      <Text style={styles.label}>{i18n.t('role')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterRole')}
        value="admin"
        editable={false}
      />
    </>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#000" />
      </TouchableOpacity>
      <TextBold style={styles.title}>{i18n.t('createAccount')}</TextBold>
      <Text style={styles.subtitle}>{i18n.t('createAccountSubtitle')}</Text>

      <Text style={styles.label}>{i18n.t('firstName')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterFirstName')}
        value={firstName}
        onChangeText={setFirstName}
      />

      <Text style={styles.label}>{i18n.t('lastName')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterLastName')}
        value={lastName}
        onChangeText={setLastName}
      />

      <Text style={styles.label}>{i18n.t('email')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterEmail')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <Text style={styles.label}>{i18n.t('password')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('enterPassword')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {isAdmin && renderAdminForm()}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          <TextBold style={styles.buttonText}>{i18n.t('signUp')}</TextBold>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => setIsAdmin(!isAdmin)}>
        <Text style={styles.linkText}>
          {isAdmin ? i18n.t('registerAsUser') : i18n.t('registerAsAdmin')}
        </Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        {i18n.t('alreadyHaveAccount')}{' '}
        <Text style={styles.loginLink} onPress={() => router.push('/(signin)')}>
          {i18n.t('login')}
        </Text>
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    textAlign: 'center',
    marginTop: 3,
    fontSize: 16,
    color: '#000',
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
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#7D7D7D',
  },
  loginLink: {
    color: '#8877F5',
    fontWeight: '500',
  },
  linkText: {
    color: '#8877F5',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default CreateAccountScreen;
