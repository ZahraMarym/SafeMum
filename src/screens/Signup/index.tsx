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
import DateTimePicker from "@react-native-community/datetimepicker";

const CreateAccountScreen = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dob, setDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [address, setAddress] = useState("");
  const [locale, setLocale] = useState(i18n.locale);

  const handleSignUp = () => {
    if (!name || !gender || !dob || !address) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    console.log("Signup details:", { name, gender, dob, address });
    // TODO: API integration
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDob(selectedDate);
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
      {/* Header */}
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <TextBold style={styles.title}>Create Account</TextBold>

      <Text style={styles.subtitle}>
        Create an account to personalize the journey.
      </Text>

      {/* Name */}
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        placeholderTextColor="#A9A9A9"
        value={name}
        onChangeText={setName}
      />

      {/* Date of Birth */}
      <Text style={styles.label}>Date of Birth</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
        <Text style={{ color: dob ? "#000" : "#A9A9A9" }}>
          {dob ? dob.toDateString() : "Select your date of birth"}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dob}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Address */}
      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your address"
        placeholderTextColor="#A9A9A9"
        value={address}
        onChangeText={setAddress}
      />

      <View style={styles.buttonContainer}>
             <TouchableOpacity
               style={styles.button}
               onPress={() => {
                 changeLanguage(locale === 'en' ? 'ur' : 'en');
               }}
             >
               <TextBold style={styles.buttonText}>SignUp</TextBold>
             </TouchableOpacity>
           </View>

      {/* Footer */}
      <Text style={styles.footerText}>
        Already have an account?{" "}
        <Text style={styles.loginLink} onPress={() => router.push("/(signin)")}>
          Log in
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
