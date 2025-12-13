import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  I18nManager,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import axios from "axios";

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

const ResetPasswordScreen = () => {
  const router = useRouter();

  // 🔥 Get access_token and refresh_token from deep link
  const { access_token, refresh_token } = useLocalSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("🎟️ Access Token received:", access_token);
    console.log("🔄 Refresh Token received:", refresh_token);

    if (!access_token) {
      Alert.alert("Error", "Missing reset token! Please request a new reset link.");
    }
  }, [access_token, refresh_token]);

  const handleSetPassword = async () => {
    Keyboard.dismiss();

    if (!access_token) {
      Alert.alert("Error", "Missing reset token!");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    console.log("🚀 Sending reset request with access token:", access_token);

    try {
      // ✅ Match backend field names: newPassword, accessToken, refreshToken
      const response = await axios.put(`${process.env.EXPO_PUBLIC_URL}/users/reset-password`, {
        newPassword: password,
        accessToken: access_token,
        refreshToken: refresh_token || ""
      });

      console.log("✅ Reset Response:", response.data);

      if (response.data.success) {
        Alert.alert(
          "Success",
          "Password updated successfully!",
          [
            {
              text: "OK",
              onPress: () => router.push("/signin")
            }
          ]
        );
      } else {
        Alert.alert("Error", response.data.message || "Failed to update password");
      }
    } catch (err) {
      console.error("❌ RESET ERROR:", err);
      console.error("Error response:", err.response?.data);

      const errorMessage = err.response?.data?.message
        || err.response?.data?.Message
        || "Failed to update password. Please try again.";

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color="#000" />
      </TouchableOpacity>

      <TextBold style={styles.title}>Reset Password</TextBold>

      <Text style={styles.label}>New Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter new password"
        placeholderTextColor="#A9A9A9"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Confirm Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Re-enter new password"
        placeholderTextColor="#A9A9A9"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        autoCapitalize="none"
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleSetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <TextBold style={styles.buttonText}>Reset Password</TextBold>
          )}
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

export default ResetPasswordScreen;