import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import i18n from '@/i18n';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

export default function LoginScreen() {
  const router = useRouter();
  const [locale, setLocale] = useState(i18n.locale);
  const [email, setEmail] = useState("")

  const changeLanguage = async (lang: string) => {
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


  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="black" />
      </TouchableOpacity>

      <TextBold style={styles.title}>{i18n.t('login')}</TextBold>

      <Text style={styles.label}>{i18n.t('email')}</Text>
      <View style={styles.inputContainer}>
       <TextInput
         placeholder={i18n.t('enterEmail')}
         value={email}
         onChangeText={setEmail}
         style={{
           borderColor: '#E5E7EB',
           borderWidth: 1,
           backgroundColor: '#fff',
           borderRadius: 6,
           paddingHorizontal: 14,
           paddingVertical: 12,
           fontSize: 14,
           textAlign: I18nManager.isRTL ? 'right' : 'left', // <- THIS IS KEY
         }}
       />

        <TouchableOpacity style={styles.forgotPassword} onPress={()=>{
            router.push("/(signin)/forgot-password")}}>
          <Text style={styles.forgotText}>{i18n.t('forgotPassword')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{i18n.t('password')}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder={i18n.t('enterPassword')}
          placeholderTextColor="#A3A3A3"
          secureTextEntry
          style={styles.input}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            router.push("/(tabs)/(home)");
          }}

        >
          <TextBold style={styles.buttonText}>{i18n.t('getStarted')}</TextBold>
        </TouchableOpacity>
      </View>

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>{i18n.t('dontHaveAccount')}</Text>
        <TouchableOpacity onPress={()=>{router.push("/(signup)")}}>
          <TextBold style={styles.signupLink}>{i18n.t('signUp')}</TextBold>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6FF',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: isRTL ? undefined : 24,
    right: isRTL ? 24 : undefined,
    transform: [{ scaleX: isRTL ? -1 : 1 }],
  },
  title: {
    fontSize: 22,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 40,
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

  inputContainer: {
    marginBottom: 28,
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
  forgotPassword: {
    marginTop: 4,
    alignSelf: isRTL ? 'flex-start' : 'flex-end',
  },
  forgotText: {
    color: '#F87171',
    fontSize: 12,
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
  signupRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'center',
    marginTop: 20,
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  signupLink: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    textAlign: isRTL ? 'right' : 'left',
  },
});
