import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type SpeechRecognitionErrorCode,
} from "expo-speech-recognition";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, Platform } from "react-native";
import { useSelector } from "react-redux";
import { useRouter } from 'expo-router';
import { Text } from '../../components/Text';
import { TextInput } from '../../components/TextInput';
import i18n from '../../i18n';
import {
  calcPercentageHeight,
  calcPercentageWidth,
} from "@/lib/utils/dimensions";


export default function NutritionTrackingScreen() {
  const router = useRouter();

  // Add Redux selector for language and direction
  const { language, textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';

  const [waterAmount, setWaterAmount] = useState("");
  const [supplementName, setSupplementName] = useState("");
  const [supplementDosage, setSupplementDosage] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [location, setLocation] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentField, setCurrentField] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Voice recognition state
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const guardRef = useRef(false);
  const alertShownRef = useRef(false);

  useEffect(() => {
    const anyI18n = i18n as any;
    if (typeof anyI18n.changeLanguage === "function") {
      // react-i18next style
      anyI18n.changeLanguage(language);
    } else {
      // i18n-js style
      anyI18n.locale = language;
    }
  }, [language]);

  // Handle date change from DateTimePicker
  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || appointmentDate;
    setShowDatePicker(false);
    setAppointmentDate(currentDate);
  };

  // ===== Permissions & availability =====
  const ensurePermissions = useCallback(async () => {
    try {
      const cur = await ExpoSpeechRecognitionModule.getPermissionsAsync?.();
      if (!cur?.granted) {
        const req = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!req.granted) return false;
      }

      if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        const mic = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (mic !== PermissionsAndroid.RESULTS.GRANTED) return false;
      }

      const available = await (ExpoSpeechRecognitionModule.isRecognitionAvailableAsync?.()
        ?? ExpoSpeechRecognitionModule.isRecognitionAvailable?.());
      if (!available) {
        const msg = "Speech recognition isn't available. Ensure Google Speech Services are installed/enabled.";
        Alert.alert("Unavailable", msg);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // ===== Speech recognition events =====
  useSpeechRecognitionEvent('start', () => setRecognizing(true));
  useSpeechRecognitionEvent('end', () => setRecognizing(false));

  useSpeechRecognitionEvent('result', (event) => {
    const text = (event.results?.[0]?.transcript ?? '').trim();
    if (!text) return;

    setRecognizedText(text);

    // Set the appropriate field based on currentField
    if (currentField === "waterAmount") setWaterAmount(text);
    if (currentField === "supplementName") setSupplementName(text);
    if (currentField === "supplementDosage") setSupplementDosage(text);
    if (currentField === "doctorName") setDoctorName(text);
    if (currentField === "hospitalName") setHospitalName(text);
    if (currentField === "location") setLocation(text);

    // Stop recognition after getting result
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
  });

  useSpeechRecognitionEvent('error', (e) => {
    setRecognizing(false);
    if (alertShownRef.current) return;
    alertShownRef.current = true;

    const code = e.error as SpeechRecognitionErrorCode;
    let msg = e.message || 'Speech recognition failed.';
    if (code === 'no-speech') msg = 'No speech detected. Please try again.';
    if (code === 'not-allowed') msg = 'Microphone/Speech permission denied.';
    if (code === 'service-not-allowed') msg = 'Speech service not available.';
    if (code === 'language-not-supported') msg = 'Selected language not supported.';

    Alert.alert('Speech Error', msg, [
      { text: 'OK', onPress: () => (alertShownRef.current = false) },
    ]);
  });

  const startListening = useCallback(async (field: string) => {
    setCurrentField(field);
    guardRef.current = false;
    alertShownRef.current = false;

    const ok = await ensurePermissions();
    if (!ok) return;

    try {
      await ExpoSpeechRecognitionModule.start({
        lang: language === 'ur' ? 'ur-PK' : 'en-US',
        interimResults: false,
        continuous: false,
      });
    } catch (error) {
      if (!alertShownRef.current) {
        alertShownRef.current = true;
        Alert.alert('Error', 'Could not start speech recognition.', [
          { text: 'OK', onPress: () => (alertShownRef.current = false) },
        ]);
      }
    }
  }, [ensurePermissions, language]);

  const stopListening = useCallback(async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {}
    };
  }, []);

  // Handle water intake submission
  const handleWaterIntakeSubmit = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      console.log("waterAmount", waterAmount);
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_URL}/nutrition-tracker/add-water-intake-log`,
        {
          amountInMl: parseInt(waterAmount),
        },
        {
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Water intake logged:", response.data);
      Alert.alert("Success", "Water intake logged successfully.");
      setWaterAmount("");
    } catch (error) {
      console.error("Error adding water intake:", error);
      Alert.alert("Error", "Failed to log water intake.");
    }
  };

  // Handle supplement intake submission
  const handleSupplementSubmit = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_URL}/nutrition-tracker/add-supplement-intake-log`,
        {
          name: supplementName,
          dosage: supplementDosage,
        },
        {
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Supplement intake logged:", response.data);
      Alert.alert("Success", "Supplement intake logged successfully.");
      setSupplementName("");
      setSupplementDosage("");
    } catch (error) {
      console.error("Error adding supplement intake:", error);
      Alert.alert("Error", "Failed to log supplement intake.");
    }
  };

  // Handle prenatal appointment submission
  const handlePrenatalAppointmentSubmit = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      console.log("token", token);
      console.log("doctorName", doctorName);
      console.log("hospitalName", hospitalName);
      console.log("appointmentDate", appointmentDate);
      console.log("appointmentTime", appointmentTime);
      console.log("location", location);

      const url = `${process.env.EXPO_PUBLIC_URL}/nutrition-tracker/add-prenatal-appointment`;
      console.log("url", url);

const response = await axios.post(
  url,
  {
    doctorName: doctorName,
    hospitalNamae: hospitalName,
    appointmentDate: new Date(appointmentDate).toISOString(),
    appointmentTime: appointmentTime, // <-- added
    location: location,
  },
  {
    headers: {
      accept: "*/*",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }
);


      console.log("Prenatal appointment added:", response.data);
      Alert.alert("Success", "Prenatal appointment added successfully.");
      setDoctorName("");
      setHospitalName("");
      setAppointmentDate(new Date());
      setAppointmentTime("");
      setLocation("");
    } catch (error) {
      console.error("Error adding prenatal appointment:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to add prenatal appointment.");
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, "0");
      const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
      setAppointmentTime(`${hours}:${minutes}`);
    }
  };


const styles = StyleSheet.create({
    container: {
      padding: calcPercentageWidth(5),
      backgroundColor: "#F9FAFB",
      direction: isRTL ? "rtl" : "ltr",
    },

    backButton: {
      position: "absolute",
      top: calcPercentageHeight(6),
      left: isRTL ? undefined : calcPercentageWidth(8),
      right: isRTL ? calcPercentageWidth(8) : undefined,
      backgroundColor: "#A78BFA",
      borderRadius: calcPercentageWidth(8),
      padding: calcPercentageWidth(1.5),
      zIndex: 100,
    },

    titleWrapper: {
      marginBottom: calcPercentageHeight(4),
      backgroundColor: "#fff",
      borderRadius: calcPercentageWidth(5),
      paddingVertical: calcPercentageHeight(2.2),
      paddingHorizontal: calcPercentageWidth(5),
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 5 },
      shadowRadius: 10,
      elevation: 4,
      alignItems: "center",
      justifyContent: "center",
    },

    titleIcon: {
      marginBottom: calcPercentageHeight(1),
      backgroundColor: "#A78BFA15",
      padding: calcPercentageWidth(3),
      borderRadius: calcPercentageWidth(12),
    },

    title: {
      fontSize: calcPercentageWidth(7),
      fontWeight: "800",
      textAlign: "center",
      color: "#4C1D95",
      letterSpacing: 1,
    },

    subtitle: {
      fontSize: calcPercentageWidth(3.6),
      color: "#6B7280",
      marginTop: calcPercentageHeight(0.8),
      textAlign: "center",
    },

    section: {
      marginBottom: calcPercentageHeight(3.5),
      backgroundColor: "#fff",
      borderRadius: calcPercentageWidth(4),
      padding: calcPercentageWidth(4),
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 5 },
      shadowRadius: 10,
      elevation: 3,
    },

    sectionTitle: {
      fontSize: calcPercentageWidth(5),
      fontWeight: "700",
      marginBottom: calcPercentageHeight(2),
      color: "#374151",
      textAlign: isRTL ? "right" : "left",
      letterSpacing: 0.3,
    },

    inputContainer: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      marginBottom: calcPercentageHeight(2),
      backgroundColor: "#F3F4F6",
      borderRadius: calcPercentageWidth(4),
      paddingHorizontal: calcPercentageWidth(3),
      borderWidth: 1,
      borderColor: "#E5E7EB",
      shadowColor: "#A78BFA",
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },

    input: {
      flex: 1,
      paddingVertical: calcPercentageHeight(1.5),
      fontSize: calcPercentageWidth(4),
      textAlign: isRTL ? "right" : "left",
      writingDirection: isRTL ? "rtl" : "ltr",
      color: "#111827",
    },

    voiceButton: {
      width: calcPercentageWidth(10),
      height: calcPercentageWidth(10),
      borderRadius: calcPercentageWidth(5),
      justifyContent: "center",
      alignItems: "center",
      marginLeft: isRTL ? 0 : calcPercentageWidth(2),
      marginRight: isRTL ? calcPercentageWidth(2) : 0,
      backgroundColor: "#fff",
      shadowColor: "#A78BFA",
      shadowOpacity: 0.6,
      shadowRadius: 8,
      elevation: 4,
    },

    button: {
      backgroundColor: "#A78BFA",
      paddingVertical: calcPercentageHeight(1.8),
      borderRadius: calcPercentageWidth(4),
      alignItems: "center",
      marginTop: calcPercentageHeight(1),
      shadowColor: "#A78BFA",
      shadowOpacity: 0.5,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 6,
      elevation: 4,
    },

    buttonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: calcPercentageWidth(4),
      letterSpacing: 0.5,
    },

    dateRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      paddingVertical: calcPercentageHeight(1.5),
      paddingHorizontal: calcPercentageWidth(4),
      borderRadius: calcPercentageWidth(4),
      backgroundColor: "#F3F4F6",
      borderWidth: 1,
      borderColor: "#E5E7EB",
      marginBottom: calcPercentageHeight(2),
    },

    dateText: {
      fontSize: calcPercentageWidth(4),
      color: "#4B5563",
      marginLeft: isRTL ? 0 : calcPercentageWidth(2),
      marginRight: isRTL ? calcPercentageWidth(2) : 0,
      fontWeight: "500",
    },

    recognitionStatus: {
      fontSize: calcPercentageWidth(3.2),
      color: "#6B7280",
      textAlign: "center",
      fontStyle: "italic",
      marginBottom: calcPercentageHeight(1.5),
    },
});


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons
          name={isRTL ? "chevron-forward" : "chevron-back"}
          size={24}
          color="black"
        />
      </TouchableOpacity>
      <View style={styles.titleWrapper}>
        <View style={styles.titleIcon}>
        </View>
        <Text style={styles.title}>{i18n.t("nutritionTracking")}</Text>
        <Text style={styles.subtitle}>
          {i18n.t("trackYourWellness")}
        </Text>
      </View>


      {recognizedText ? (
        <Text style={styles.recognitionStatus}>
          Last recognized: "{recognizedText}"
        </Text>
      ) : null}

      {/* Water Intake Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('waterIntake')}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('amountInML')}
            value={waterAmount}
            onChangeText={setWaterAmount}
            keyboardType="numeric"
          />
          <TouchableOpacity
            onPress={() => recognizing && currentField === "waterAmount" ? stopListening() : startListening("waterAmount")}
            style={styles.voiceButton}
          >
            <Ionicons
              name={recognizing && currentField === "waterAmount" ? "stop-circle" : "mic"}
              size={24}
              color={recognizing && currentField === "waterAmount" ? "red" : "#A78BFA"}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleWaterIntakeSubmit}>
          <Text style={styles.buttonText}>{i18n.t('logWaterIntake')}</Text>
        </TouchableOpacity>
      </View>

      {/* Supplement Intake Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('supplementIntake')}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('supplementName')}
            value={supplementName}
            onChangeText={setSupplementName}
          />
          <TouchableOpacity
            onPress={() => recognizing && currentField === "supplementName" ? stopListening() : startListening("supplementName")}
            style={styles.voiceButton}
          >
            <Ionicons
              name={recognizing && currentField === "supplementName" ? "stop-circle" : "mic"}
              size={24}
              color={recognizing && currentField === "supplementName" ? "red" : "#A78BFA"}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('dosage')}
            value={supplementDosage}
            onChangeText={setSupplementDosage}
          />
          <TouchableOpacity
            onPress={() => recognizing && currentField === "supplementDosage" ? stopListening() : startListening("supplementDosage")}
            style={styles.voiceButton}
          >
            <Ionicons
              name={recognizing && currentField === "supplementDosage" ? "stop-circle" : "mic"}
              size={24}
              color={recognizing && currentField === "supplementDosage" ? "red" : "#A78BFA"}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSupplementSubmit}>
          <Text style={styles.buttonText}>{i18n.t('logSupplementIntake')}</Text>
        </TouchableOpacity>
      </View>

      {/* Prenatal Appointment Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('prenatalAppointment')}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('doctorName')}
            value={doctorName}
            onChangeText={setDoctorName}
          />
          <TouchableOpacity
            onPress={() => recognizing && currentField === "doctorName" ? stopListening() : startListening("doctorName")}
            style={styles.voiceButton}
          >
            <Ionicons
              name={recognizing && currentField === "doctorName" ? "stop-circle" : "mic"}
              size={24}
              color={recognizing && currentField === "doctorName" ? "red" : "#A78BFA"}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('hospitalName')}
            value={hospitalName}
            onChangeText={setHospitalName}
          />
          <TouchableOpacity
            onPress={() => recognizing && currentField === "hospitalName" ? stopListening() : startListening("hospitalName")}
            style={styles.voiceButton}
          >
            <Ionicons
              name={recognizing && currentField === "hospitalName" ? "stop-circle" : "mic"}
              size={24}
              color={recognizing && currentField === "hospitalName" ? "red" : "#A78BFA"}
            />
          </TouchableOpacity>
        </View>

        {/* Appointment Date Picker Styled Row */}
        <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
          <Ionicons
            name="calendar-outline"
            size={22}
            color="#A78BFA"
            style={{
              marginRight: isRTL ? 0 : 8,
              marginLeft: isRTL ? 8 : 0
            }}
          />
          <Text style={styles.dateText}>
            {appointmentDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={appointmentDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

    {/* Appointment Time Picker Styled Row */}
    <TouchableOpacity style={styles.dateRow} onPress={() => setShowTimePicker(true)}>
      <Ionicons
        name="time-outline"
        size={22}
        color="#A78BFA"
        style={{
          marginRight: isRTL ? 0 : 8,
          marginLeft: isRTL ? 8 : 0,
        }}
      />
      <Text style={styles.dateText}>
        {appointmentTime ? appointmentTime : i18n.t("selectTime")}
      </Text>
    </TouchableOpacity>

    {showTimePicker && (
      <DateTimePicker
        value={appointmentDate} // base date, time will be chosen
        mode="time"
        display="default"
        onChange={handleTimeChange}
      />
    )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('location')}
            value={location}
            onChangeText={setLocation}
          />
          <TouchableOpacity
            onPress={() => recognizing && currentField === "location" ? stopListening() : startListening("location")}
            style={styles.voiceButton}
          >
            <Ionicons
              name={recognizing && currentField === "location" ? "stop-circle" : "mic"}
              size={24}
              color={recognizing && currentField === "location" ? "red" : "#A78BFA"}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handlePrenatalAppointmentSubmit}>
          <Text style={styles.buttonText}>{i18n.t('addPrenatalAppointment')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}