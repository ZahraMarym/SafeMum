import React, { useState } from "react";
import { View, Button, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { TextBold } from '@/components/TextBold';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import Ionicons from "@expo/vector-icons/Ionicons";


export default function NutritionTrackingScreen() {
  const [waterAmount, setWaterAmount] = useState(""); // For water intake
  const [supplementName, setSupplementName] = useState(""); // For supplement name
  const [supplementDosage, setSupplementDosage] = useState(""); // For supplement dosage
  const [doctorName, setDoctorName] = useState(""); // For prenatal appointment
  const [hospitalName, setHospitalName] = useState(""); // For prenatal appointment
  const [location, setLocation] = useState(""); // For prenatal appointment
 const [appointmentDate, setAppointmentDate] = useState(new Date()); // default to current date
  const [showDatePicker, setShowDatePicker] = useState(false); // Show date picker on button press

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


  return (
     <ScrollView contentContainerStyle={styles.container}>
       <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
             <Ionicons name="chevron-back" size={24} color="black" />
           </TouchableOpacity>
       <Text style={styles.title}>Nutrition Tracking</Text>

       {/* Water Intake Section */}
       <View style={styles.section}>
         <Text style={styles.sectionTitle}>Water Intake</Text>
         <TextInput
           style={styles.input}
           placeholder="Amount in ML"
           value={waterAmount}
           onChangeText={setWaterAmount}
           keyboardType="numeric"
         />
         <TouchableOpacity style={styles.button} onPress={handleWaterIntakeSubmit}>
           <Text style={styles.buttonText}>Log Water Intake</Text>
         </TouchableOpacity>
       </View>

       {/* Supplement Intake Section */}
       <View style={styles.section}>
         <Text style={styles.sectionTitle}>Supplement Intake</Text>
         <TextInput
           style={styles.input}
           placeholder="Supplement Name"
           value={supplementName}
           onChangeText={setSupplementName}
         />
         <TextInput
           style={styles.input}
           placeholder="Dosage (e.g., 1 tab)"
           value={supplementDosage}
           onChangeText={setSupplementDosage}
         />
         <TouchableOpacity style={styles.button} onPress={handleSupplementSubmit}>
           <Text style={styles.buttonText}>Log Supplement Intake</Text>
         </TouchableOpacity>
       </View>

       {/* Prenatal Appointment Section */}
       <View style={styles.section}>
         <Text style={styles.sectionTitle}>Prenatal Appointment</Text>
         <TextInput
           style={styles.input}
           placeholder="Doctor's Name"
           value={doctorName}
           onChangeText={setDoctorName}
         />
         <TextInput
           style={styles.input}
           placeholder="Hospital Name"
           value={hospitalName}
           onChangeText={setHospitalName}
         />

       {/* Appointment Date Picker Styled Row */}
       <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
         <Ionicons name="calendar-outline" size={22} color="#A78BFA" style={{ marginRight: 8 }} />
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
           placeholder="Location"
           value={location}
           onChangeText={setLocation}
         />

         <TouchableOpacity style={styles.button} onPress={handlePrenatalAppointmentSubmit}>
           <Text style={styles.buttonText}>Add Prenatal Appointment</Text>
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