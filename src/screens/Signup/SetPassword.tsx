import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  I18nManager,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import i18n from '@/i18n';

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

const ResetPasswordScreen = () => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
   const [locale, setLocale] = useState(i18n.locale);

  const handleSetPassword = () => {
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    console.log("Password set successfully:", password);
    // TODO: handle API call or navigation after setting password
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <TextBold style={styles.title}>Set Password</TextBold>

      {/* Password Input */}
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Password"
        placeholderTextColor="#A9A9A9"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* Confirm Password Input */}
      <Text style={styles.label}>Confirm Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter confirm password"
        placeholderTextColor="#A9A9A9"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      changeLanguage(locale === 'en' ? 'ur' : 'en');
                      router.push("/(signin)/otp")
                    }}
                  >
                    <TextBold style={styles.buttonText}>Reset Password</TextBold>
                  </TouchableOpacity>
                </View>
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

export default ResetPasswordScreen;
