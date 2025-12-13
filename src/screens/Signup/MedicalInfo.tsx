import { Text } from '@/components/Text';
import { TextBold } from '@/components/TextBold';
import { TextInput } from '@/components/TextInput';
import i18n from '@/i18n';
import { setLanguage } from '@/redux/slice/languageSlice'; // Import language action
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker'; // Add picker for blood group
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  I18nManager,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux'; // Import Redux hooks
const screenWidth = Dimensions.get('window').width;
const { width } = Dimensions.get('window');
import {
  calcPercentageHeight,
  calcPercentageWidth,
} from "@/lib/utils/dimensions";


const MedicalPregnancyInfoScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  // Replace locale state with Redux selector
  const { language, textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';

  const [isPregnant, setIsPregnant] = useState(true);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [previousPregnancies, setPreviousPregnancies] = useState('');
  const [liveBirths, setLiveBirths] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [isDiabetic, setIsDiabetic] = useState(true);
  const [hasHypertension, setHasHypertension] = useState(false);
  const [haemoglobinLevel, setHaemoglobinLevel] = useState('');
  const [isSmoker, setIsSmoker] = useState(false);
  const [takesMedication, setTakesMedication] = useState('');
  const [bloodGroup, setBloodGroup] = useState('A+'); // Default blood group

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || dueDate;
    setShowDatePicker(Platform.OS === 'ios');
    setDueDate(currentDate);
  };

  const changeLanguage = async (lang: string) => {
    dispatch(setLanguage(lang)); // Dispatch action to update language in Redux store
    i18n.locale = lang; // Set the language in i18n

    const rtl = lang === 'ur'; // If language is Urdu, apply RTL
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
      // Note: Updates.reloadAsync() was removed as it's not imported
    }
  };

  // Set initial language state when the component mounts
  useEffect(() => {
    i18n.locale = language; // Set the locale for i18n
    if (language === 'ur') {
      I18nManager.forceRTL(true);
      I18nManager.allowRTL(true);
    } else {
      I18nManager.forceRTL(false);
      I18nManager.allowRTL(false);
    }
  }, [language]);

  const submitForm = async () => {
    const formData = {
      currentlyPregnant: isPregnant,
      edd: dueDate.toISOString().split('T')[0], // Format date as YYYY-MM-DD
      noOfPreviousPregnancies: parseInt(previousPregnancies),
      noOfLiveBirths: parseInt(liveBirths),
      emergencyContactName: emergencyName,
      emergencyContactNumber: emergencyContact,
      isDiabetic: isDiabetic,
      hasHypertension: hasHypertension,
      haemoglobinLevel: parseFloat(haemoglobinLevel),
      isSmoker: isSmoker,
      takesMedication: takesMedication.split(',').map((med) => med.trim()), // Split medication by comma
      bloodGroup: bloodGroup,
    };
    console.log("form data", formData)

    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_URL}/user-pregnancy-information/create-user-pregnancy-information`,
        formData,
        {
          headers: {
            'Accept': '*/*',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          }
        }
      );

      if (response.status === 200) {
        Alert.alert('Success', 'Your information has been submitted successfully!');
        router.push("/(tabs)/(home)");
      } else {
        Alert.alert('Error', response.data.message || 'Something went wrong');
      }
    } catch (error) {
      Alert.alert('Error', 'There was an issue submitting the form. Please try again later.');
      console.error('Error submitting form:', error);
    }
  };

  return (
    <ScrollView style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]}
                contentContainerStyle={styles.content}>

      {/* Back Button */}
      <TouchableOpacity
        style={[styles.backButton, {
          alignSelf: isRTL ? 'flex-end' : 'flex-start'
        }]}
        onPress={() => router.back()}
      >
        <Ionicons
          name={isRTL ? "chevron-forward" : "chevron-back"}
          size={24}
          color="black"
        />
      </TouchableOpacity>

      {/* Title */}
      <TextBold style={styles.title}>{i18n.t('MedicalInfoTitle')}</TextBold>

      {/* Currently Pregnant */}
      <View style={[styles.rowBetween, {
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }]}>
        <Text style={[
          styles.label,
          {
            textAlign: isRTL ? 'right' : 'left',
            alignSelf: isRTL ? 'flex-end' : 'flex-start'
          }
        ]}>
          {i18n.t('currentlyPregnant')}
        </Text>
        <Switch
          trackColor={{ false: '#ccc', true: '#C1B2DF' }}
          thumbColor={isPregnant ? '#8368C7' : '#f4f3f4'}
          value={isPregnant}
          onValueChange={setIsPregnant}
        />
      </View>

      {/* Due Date Picker */}
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={[styles.datePickerContainer, {
          flexDirection: isRTL ? 'row-reverse' : 'row'
        }]}
      >
        <Ionicons name="calendar-outline" size={20} color="#C1B2DF" />
        <Text style={[styles.dateText, {
          marginLeft: isRTL ? 0 : 10,
          marginRight: isRTL ? 10 : 0,
          textAlign: isRTL ? 'right' : 'left'
        }]}>
          {dueDate.toLocaleDateString()}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dueDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      {/* Number of Previous Pregnancies */}
      <View style={styles.fieldContainer}>
        <TextInput
          placeholder={i18n.t('numberOfPreviousPregnancies')}
          keyboardType="numeric"
          value={previousPregnancies}
          onChangeText={setPreviousPregnancies}
          style={[
            styles.input,
            {
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr'
            }
          ]}
        />
      </View>

      {/* Number of Live Births */}
      <View style={styles.fieldContainer}>
        <TextInput
          placeholder={i18n.t('numberOfLiveBirths')}
          keyboardType="numeric"
          value={liveBirths}
          onChangeText={setLiveBirths}
          style={[
            styles.input,
            {
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr'
            }
          ]}
        />
      </View>

      {/* Emergency Contact Name */}
      <View style={styles.fieldContainer}>
        <TextInput
          placeholder={i18n.t('emergencyContactName')}
          value={emergencyName}
          onChangeText={setEmergencyName}
          style={[
            styles.input,
            {
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr'
            }
          ]}
        />
      </View>

      {/* Emergency Contact Number */}
      <View style={styles.fieldContainer}>
        <TextInput
          placeholder={i18n.t('emergencyContactNumber')}
          keyboardType="phone-pad"
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          style={[
            styles.input,
            {
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr'
            }
          ]}
        />
      </View>

      {/* Diabetic */}
      <View style={[styles.rowBetween, {
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }]}>
        <Text style={[
          styles.label,
          {
            textAlign: isRTL ? 'right' : 'left',
            alignSelf: isRTL ? 'flex-end' : 'flex-start'
          }
        ]}>
          {i18n.t('diabetic')}
        </Text>
        <Switch
          value={isDiabetic}
          onValueChange={setIsDiabetic}
          trackColor={{ false: '#ccc', true: '#C1B2DF' }}
          thumbColor={isDiabetic ? '#8368C7' : '#f4f3f4'}
        />
      </View>

      {/* Has Hypertension */}
      <View style={[styles.rowBetween, {
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }]}>
        <Text style={[
          styles.label,
          {
            textAlign: isRTL ? 'right' : 'left',
            alignSelf: isRTL ? 'flex-end' : 'flex-start'
          }
        ]}>
          {i18n.t('hasHypertension')}
        </Text>
        <Switch
          value={hasHypertension}
          onValueChange={setHasHypertension}
          trackColor={{ false: '#ccc', true: '#C1B2DF' }}
          thumbColor={hasHypertension ? '#8368C7' : '#f4f3f4'}
        />
      </View>

      {/* Haemoglobin Level */}
      <View style={styles.fieldContainer}>
        <TextInput
          placeholder={i18n.t('haemoglobinLevel')}
          keyboardType="decimal-pad"
          value={haemoglobinLevel}
          onChangeText={setHaemoglobinLevel}
          style={[
            styles.input,
            {
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr'
            }
          ]}
        />
      </View>

      {/* Smoker */}
      <View style={[styles.rowBetween, {
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }]}>
        <Text style={[
          styles.label,
          {
            textAlign: isRTL ? 'right' : 'left',
            alignSelf: isRTL ? 'flex-end' : 'flex-start'
          }
        ]}>
          {i18n.t('smoker')}
        </Text>
        <Switch
          value={isSmoker}
          onValueChange={setIsSmoker}
          trackColor={{ false: '#ccc', true: '#C1B2DF' }}
          thumbColor={isSmoker ? '#8368C7' : '#f4f3f4'}
        />
      </View>

      {/* Takes Medication */}
      <View style={styles.fieldContainer}>
        <TextInput
          placeholder={i18n.t('takesMedication')}
          value={takesMedication}
          onChangeText={setTakesMedication}
          style={[
            styles.input,
            {
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr'
            }
          ]}
        />
      </View>

      {/* Blood Group Picker */}
      <View style={[styles.pickerContainer, {
        alignItems: isRTL ? 'flex-end' : 'flex-start'
      }]}>
        <Text style={[
          styles.pickerLabel,
          {
            textAlign: isRTL ? 'right' : 'left',
            alignSelf: isRTL ? 'flex-end' : 'flex-start',
            marginBottom: 8
          }
        ]}>
          {i18n.t('bloodGroup')}
        </Text>
        <View style={[styles.pickerWrapper, {
          alignSelf: 'stretch'
        }]}>
          <Picker
            selectedValue={bloodGroup}
            onValueChange={(itemValue) => setBloodGroup(itemValue)}
            style={[styles.picker, {
              textAlign: isRTL ? 'right' : 'left'
            }]}
          >
            <Picker.Item label="A+" value="A+" />
            <Picker.Item label="A-" value="A-" />
            <Picker.Item label="B+" value="B+" />
            <Picker.Item label="B-" value="B-" />
            <Picker.Item label="AB+" value="AB+" />
            <Picker.Item label="AB-" value="AB-" />
            <Picker.Item label="O+" value="O+" />
            <Picker.Item label="O-" value="O-" />
          </Picker>
        </View>
      </View>

      {/* Submit Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={submitForm}
        >
          <Text style={styles.nextButtonText}>{i18n.t('next')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: "#F6F6FF",
      paddingHorizontal: calcPercentageWidth(6),
      paddingVertical: calcPercentageHeight(7),
    },

    content: {
      paddingBottom: calcPercentageHeight(6),
    },

    backButton: {
      marginBottom: calcPercentageHeight(2.5),
    },

    title: {
      fontSize: calcPercentageWidth(5.5),
      alignSelf: "center",
      marginBottom: calcPercentageHeight(3.5),
      textAlign: "center",
    },

    fieldContainer: {
      marginBottom: calcPercentageHeight(1.8),
    },

    label: {
      fontSize: calcPercentageWidth(4),
      fontWeight: "600",
      color: "#000",
      width: "100%",
      flex: 1,
    },

    rowBetween: {
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: calcPercentageHeight(2.5),
      paddingHorizontal: calcPercentageWidth(1),
    },

    datePickerContainer: {
      alignItems: "center",
      backgroundColor: "#ffffff",
      padding: calcPercentageHeight(1.6),
      borderRadius: calcPercentageWidth(2),
      marginBottom: calcPercentageHeight(2.5),
      borderColor: "#E5E7EB",
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },

    dateText: {
      color: "#333",
      fontSize: calcPercentageWidth(4),
    },

    input: {
      backgroundColor: "#fff",
      borderRadius: calcPercentageWidth(2),
      paddingHorizontal: calcPercentageWidth(4),
      paddingVertical: calcPercentageHeight(1.5),
      fontSize: calcPercentageWidth(3.5),
      borderColor: "#E5E7EB",
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },

    pickerContainer: {
      marginBottom: calcPercentageHeight(1.8),
    },

    pickerLabel: {
      fontSize: calcPercentageWidth(4),
      fontWeight: "600",
      color: "#000",
      marginBottom: calcPercentageHeight(1),
    },

    pickerWrapper: {
      backgroundColor: "#fff",
      borderRadius: calcPercentageWidth(2),
      borderColor: "#E5E7EB",
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },

    picker: {
      height: calcPercentageHeight(6.5),
      color: "#333",
    },

    buttonContainer: {
      alignItems: "center",
      marginTop: calcPercentageHeight(2.5),
    },

    nextButton: {
      width: calcPercentageWidth(80),
      backgroundColor: "#A78BFA",
      paddingVertical: calcPercentageHeight(1.8),
      justifyContent: "center",
      alignItems: "center",
      borderRadius: calcPercentageWidth(3.5),
      shadowColor: "#A78BFA",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: Platform.OS === "ios" ? 0.3 : 0.6,
      shadowRadius: 6,
      elevation: 6,
      marginBottom: calcPercentageHeight(6),
    },

    nextButtonText: {
      color: "#FFFFFF",
      fontSize: calcPercentageWidth(5),
      fontWeight: "600",
      letterSpacing: 0.8,
    },
});

export default MedicalPregnancyInfoScreen;