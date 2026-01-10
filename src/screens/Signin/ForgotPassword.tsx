import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, I18nManager, Platform, Alert, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import i18n from '@/i18n';
import axios from "axios";

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [locale, setLocale] = useState(i18n.locale);

  const submitForgot = async () => {
    Keyboard.dismiss();

    if (!email) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    setLoading(true);

    try {
      const url = `${process.env.EXPO_PUBLIC_URL}/users/forgot-password`;

      const res = await axios.post(
        url,
        { email },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "*/*",
          },
        }
      );

      console.log("res", res.data);

      // Extract the token from the response
      const resetToken = res.data.message?.split(": ")[1] || "";

      if (resetToken) {
        Alert.alert(
          "Success",
          "Reset token generated. Please reset your password.",
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate to reset password screen with the token
                router.push({
                  pathname: "/(signin)/reset-password",
                  params: {
                    access_token: resetToken,
                    email: email
                  }
                });
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", "Failed to generate reset token");
      }
    } catch (err) {
      console.log("Forgot password error:", err?.response?.data || err.message);

      Alert.alert(
        "Error",
        err?.response?.data?.message || "Unable to send reset link"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="black" />
      </TouchableOpacity>

      <TextBold style={styles.title}>Forgot Password</TextBold>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={submitForgot}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <TextBold style={styles.buttonText}>Send Link</TextBold>
          )}
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