import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, I18nManager, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import i18n from '@/i18n';

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

const ForgotPasswordScreen = ({ navigation }) => {
  const [input, setInput] = useState('');
    const router = useRouter();
      const [locale, setLocale] = useState(i18n.locale);


  const handleSendCode = () => {
    // handle email/phone validation and send code logic
    console.log('Code sent to:', input);
  };


    const changeLanguage = async (lang: string) => {
      i18n.locale = lang;
      setLocale(lang);

      const rtl = lang === 'ur';
      if (I18nManager.isRTL !== rtl) {
        I18nManager.forceRTL(rtl);
        I18nManager.allowRTL(rtl);
        await Updates.reloadAsync();
      }
    };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>

      {/* Title */}
      <TextBold style={styles.title}>Forgot Password</TextBold>

      {/* Input Field */}
      <Text style={styles.label}>Email or Phone</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email or phone"
        placeholderTextColor="#aaa"
        value={input}
        onChangeText={setInput}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.buttonContainer}>
             <TouchableOpacity
               style={styles.button}
               onPress={() => {
                 changeLanguage(locale === 'en' ? 'ur' : 'en');
                 router.push("/(signin)/otp")
               }}
             >
               <TextBold style={styles.buttonText}>Send Code</TextBold>
             </TouchableOpacity>
           </View>
    </View>
  );
};

export default ForgotPasswordScreen;
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
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    height: 45,
    marginBottom: 20,
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
});
