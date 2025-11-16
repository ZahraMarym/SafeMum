import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  I18nManager,
  Alert,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import i18n from '@/i18n';
import * as Linking from "expo-linking";
import axios from "axios";

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

function extractToken(url) {
  if (!url) return "";

  try {
    // If URL has hash (#access_token=...)
    if (url.includes("#")) {
      const hash = url.split("#")[1];
      const params = new URLSearchParams(hash);
      if (params.get("access_token")) return params.get("access_token");
      if (params.get("token")) return params.get("token");
    }

    // Query params (?token=...)
    const query = url.split("?")[1];
    const params = new URLSearchParams(query);
    return params.get("access_token") || params.get("token") || "";
  } catch {
    return "";
  }
}


const ResetPasswordScreen = () => {
  const router = useRouter();
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [token, setToken] = useState("");

   // 🔥 Listen for deep-links
   useEffect(() => {
     // App opened from killed state
     Linking.getInitialURL().then(url => {
       console.log("INITIAL URL =>", url);
       const t = extractToken(url);
       console.log("TOKEN (cold) =>", t);
       if (t) setToken(t);
     });

     // App already running
     const sub = Linking.addEventListener("url", ({ url }) => {
       console.log("EVENT URL =>", url);
       const t = extractToken(url);
       console.log("TOKEN (event) =>", t);
       if (t) setToken(t);
     });

     return () => sub.remove();
   }, []);

   const handleSetPassword = async () => {
     if (!token) {
       Alert.alert("Error", "Missing reset token");
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

     console.log("FINAL TOKEN =>", token);

     try {
       await axios.put(`${process.env.EXPO_PUBLIC_URL}/users/reset-password`, {
         newPassword: password,
         token: token,
       });

       Alert.alert("Success", "Password updated!");
       router.push("/(signin)");

     } catch (err) {
       console.log(err);
       Alert.alert("Error", "Failed to update password");
     }
   };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#000" />
      </TouchableOpacity>

      <TextBold style={styles.title}>Reset Password</TextBold>

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Password"
        placeholderTextColor="#A9A9A9"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

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
          onPress={handleSetPassword}
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
