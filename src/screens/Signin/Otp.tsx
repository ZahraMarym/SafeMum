import React, { useState, useRef } from "react";
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
import i18n from '@/i18n';
import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

const OTPScreen = () => {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef([]);
      const [locale, setLocale] = useState(i18n.locale);

  const handleChange = (text, index) => {
    if (text.length > 1) return;
    const updatedOtp = [...otp];
    updatedOtp[index] = text;
    setOtp(updatedOtp);
    if (text && index < 6) {
      inputs.current[index + 1]?.focus();
    }
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

  const handleVerify = () => {
    Keyboard.dismiss();
    const code = otp.join("");
    console.log("Verifying OTP:", code);
    // TODO: Add your verify logic here
  };

  return (
    <View style={styles.container}>
      {/* Back Icon and Title */}
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <TextBold style={styles.title}>OTP</TextBold>

      <Text style={styles.instruction}>
        Enter OTP Received on *****ds@gmail.com
      </Text>

      {/* OTP Input Fields */}
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputs.current[index] = ref)}
            style={styles.otpInput}
            keyboardType="numeric"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
          />
        ))}
      </View>

     <View style={styles.buttonContainer}>
                 <TouchableOpacity
                   style={styles.button}
                   onPress={() => {
                     changeLanguage(locale === 'en' ? 'ur' : 'en');
                     router.push("/(signin)/reset-password")
                   }}
                 >
                   <TextBold style={styles.buttonText}>Verify Code</TextBold>
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
  instruction: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#000",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 10,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 8,
    backgroundColor: "#fff",
    textAlign: "center",
    fontSize: 18,
  },
   buttonContainer: {
       marginTop:20,
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

export default OTPScreen;
