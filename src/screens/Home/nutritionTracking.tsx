import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import * as SpeechRecognition from "expo-speech-recognition";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import { Text } from '../../components/Text';
import { TextInput } from '../../components/TextInput';
import i18n from '../../i18n';



export default function NutritionTrackingScreen() {
  // Add Redux selector for language and direction
  const { language, textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';

  const [waterAmount, setWaterAmount] = useState(""); // For water intake
  const [supplementName, setSupplementName] = useState(""); // For supplement name
  const [supplementDosage, setSupplementDosage] = useState(""); // For supplement dosage
  const [doctorName, setDoctorName] = useState(""); // For prenatal appointment
  const [hospitalName, setHospitalName] = useState(""); // For prenatal appointment
  const [location, setLocation] = useState(""); // For prenatal appointment
 const [appointmentDate, setAppointmentDate] = useState(new Date()); // default to current date
  const [showDatePicker, setShowDatePicker] = useState(false); // Show date picker on button press

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
    setAppointmentDate(currentDate); // Set the selected date
  };

  const handleSubmit = () => {
    // Ensure appointmentDate is a valid Date before using it
    if (!(appointmentDate instanceof Date) || isNaN(appointmentDate.getTime())) {
      Alert.alert("Error", "Invalid date selected.");
      return;
    }

    // Format the date if needed (e.g., to ISO format)
    const formattedDate = appointmentDate.toISOString();
    console.log("Appointment Date:", formattedDate);
    // Handle further logic to send the date to the API
    Alert.alert("Success", `Appointment scheduled for: ${formattedDate}`);
  };


  const startListening = useCallback(async (field) => {
      setCurrentField(field);
      const isPermissionGranted = await SpeechRecognition.getPermissionsAsync();
      if (!isPermissionGranted.granted) {
        Alert.alert("Permission Denied", "Please enable microphone permissions.");
        return;
      }

      setRecognizing(true);
      await SpeechRecognition.startAsync({
        language: "en-US",
        interimResults: false,
      });
    }, []);

    // Stop speech recognition
    const stopListening = useCallback(async () => {
      setRecognizing(false);
      await SpeechRecognition.stopAsync();
    }, []);

   // Handle speech result and update respective field
     useEffect(() => {
       const handleSpeechResult = (result) => {
         const text = result?.transcript || "";
         if (currentField === "waterAmount") setWaterAmount(text);
         if (currentField === "supplementName") setSupplementName(text);
         if (currentField === "supplementDosage") setSupplementDosage(text);
         if (currentField === "doctorName") setDoctorName(text);
         if (currentField === "hospitalName") setHospitalName(text);
         if (currentField === "location") setLocation(text);
       };

       SpeechRecognition.addEventListener("onSpeechResult", handleSpeechResult);

       return () => {
         SpeechRecognition.removeEventListener("onSpeechResult", handleSpeechResult);
       };
     }, [currentField]);



  // Handle water intake submission
  const handleWaterIntakeSubmit = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      console.log("waterAmount", waterAmount)
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_URL}/nutrition-tracker/add-water-intake-log`,
        {
          amountInMl: parseInt(waterAmount), // Convert water amount to number
        },
        {
          headers: {
            accept: "/",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Water intake logged:", response.data);
      Alert.alert("Success", "Water intake logged successfully.");
      setWaterAmount(""); // Clear input after submission
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
            accept: "/",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Supplement intake logged:", response.data);
      Alert.alert("Success", "Supplement intake logged successfully.");
      setSupplementName(""); // Clear inputs after submission
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
     console.log("location", location);

     const url = `${process.env.EXPO_PUBLIC_URL}/nutrition-tracker/add-prenatal-appointment`;
     console.log("url", url);

     const response = await axios.post(
       url,
       {
         doctorName: doctorName,
         hospitalNamae: hospitalName, // ✅ Corrected key
         appointmentDate: new Date(appointmentDate).toISOString(), // Optional safety
         location: location,
       },
       {
         headers: {
           accept: "/",
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
     setLocation("");
   } catch (error) {
     console.error("Error adding prenatal appointment:", error.response?.data || error.message);
     Alert.alert("Error", "Failed to add prenatal appointment.");
   }
 };


  const styles = StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: "#fff",
      direction: isRTL ? 'rtl' : 'ltr'
    },
    backButton: {
      position: 'absolute',
      top: 30,
      left: isRTL ? undefined : 24,
      right: isRTL ? 24 : undefined,
    },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 30,
      color: "#333",
    },
    section: {
      marginBottom: 35,
      backgroundColor: "#fff",
      borderRadius: 10,
      padding: 15,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 5,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      marginBottom: 15,
      color: "#333",
      textAlign: isRTL ? 'right' : 'left',
    },
    input: {
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: "#fafafa",
      marginBottom: 15,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    button: {
      backgroundColor: "#A78BFA",
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 5,
    },
    buttonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 16,
    },
    dateText: {
      fontSize: 16,
      marginTop: 10,
      color: "#555",
    },
    dateRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: "#fafafa",
      borderWidth: 1,
      borderColor: "#ddd",
      marginBottom: 15,
    },

    dateText: {
      fontSize: 16,
      color: "#555",
    },

  });

  return (
     <ScrollView contentContainerStyle={styles.container}>
       <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
             <Ionicons 
          name={isRTL ? "chevron-back" : "chevron-forward"} 
          size={24} 
          color="black" 
        />
           </TouchableOpacity>
       <Text style={styles.title}>{i18n.t('nutritionTracking')}</Text>

       {/* Water Intake Section */}
       <View style={styles.section}>
         <Text style={styles.sectionTitle}>{i18n.t('waterIntake')}</Text>
         <TextInput
           style={styles.input}
           placeholder={i18n.t('amountInML')}
           value={waterAmount}
           onChangeText={setWaterAmount}
           keyboardType="numeric"
         />
         <TouchableOpacity style={styles.button} onPress={handleWaterIntakeSubmit}>
           <Text style={styles.buttonText}>{i18n.t('logWaterIntake')}</Text>
         </TouchableOpacity>
          <TouchableOpacity onPress={() => startListening("waterAmount")} style={styles.voiceButton}>
                   <Ionicons name="mic" size={24} color="gray" />
                 </TouchableOpacity>
       </View>

       {/* Supplement Intake Section */}
       <View style={styles.section}>
         <Text style={styles.sectionTitle}>{i18n.t('supplementIntake')}</Text>
         <TextInput
           style={styles.input}
           placeholder={i18n.t('supplementName')}
           value={supplementName}
           onChangeText={setSupplementName}
         />
         <TextInput
           style={styles.input}
           placeholder={i18n.t('dosage')}
           value={supplementDosage}
           onChangeText={setSupplementDosage}
         />
         <TouchableOpacity style={styles.button} onPress={handleSupplementSubmit}>
           <Text style={styles.buttonText}>{i18n.t('logSupplementIntake')}</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => startListening("supplementName")} style={styles.voiceButton}>
                   <Ionicons name="mic" size={24} color="gray" />
                 </TouchableOpacity>
       </View>

       {/* Prenatal Appointment Section */}
       <View style={styles.section}>
         <Text style={styles.sectionTitle}>{i18n.t('prenatalAppointment')}</Text>
         <TextInput
           style={styles.input}
           placeholder={i18n.t('doctorName')}
           value={doctorName}
           onChangeText={setDoctorName}
         />
         <TextInput
           style={styles.input}
           placeholder={i18n.t('hospitalName')}
           value={hospitalName}
           onChangeText={setHospitalName}
         />

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


         <TextInput
           style={styles.input}
           placeholder={i18n.t('location')}
           value={location}
           onChangeText={setLocation}
         />

         <TouchableOpacity style={styles.button} onPress={handlePrenatalAppointmentSubmit}>
           <Text style={styles.buttonText}>{i18n.t('addPrenatalAppointment')}</Text>
         </TouchableOpacity>
          <TouchableOpacity onPress={() => startListening("location")} style={styles.voiceButton}>
                   <Ionicons name="mic" size={24} color="gray" />
                 </TouchableOpacity>
       </View>
     </ScrollView>
   );
 }

 const styles = StyleSheet.create({
   container: {
     padding: 20,
     backgroundColor: "#fff",
   },
     backButton: {
       position: 'absolute',
       top: 30,
       left: 24,
     },
   title: {
     fontSize: 26,
     fontWeight: "bold",
     textAlign: "center",
     marginBottom: 30,
     color: "#333",
   },
   section: {
     marginBottom: 35,
     backgroundColor: "#fff",
     borderRadius: 10,
     padding: 15,
     shadowColor: "#000",
     shadowOpacity: 0.1,
     shadowOffset: { width: 0, height: 3 },
     shadowRadius: 5,
     elevation: 2,
   },
   sectionTitle: {
     fontSize: 20,
     fontWeight: "600",
     marginBottom: 15,
     color: "#333",
   },
   input: {
     borderWidth: 1,
     borderColor: "#ddd",
     borderRadius: 8,
     padding: 12,
     fontSize: 16,
     backgroundColor: "#fafafa",
     marginBottom: 15,
   },
   button: {
     backgroundColor: "#A78BFA",
     paddingVertical: 12,
     borderRadius: 8,
     alignItems: "center",
     marginTop: 5,
   },
   buttonText: {
     color: "#fff",
     fontWeight: "600",
     fontSize: 16,
   },
   dateText: {
     fontSize: 16,
     marginTop: 10,
     color: "#555",
   },
   dateRow: {
     flexDirection: "row",
     alignItems: "center",
     paddingVertical: 12,
     paddingHorizontal: 10,
     borderRadius: 8,
     backgroundColor: "#fafafa",
     borderWidth: 1,
     borderColor: "#ddd",
     marginBottom: 15,
   },

   dateText: {
     fontSize: 16,
     color: "#555",
   },

 });