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
const isRTL = I18nManager.isRTL;



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
      await Updates.reloadAsync(); // Refresh the UI after changing the language
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
       'https://safemum-app-5f503b88629c.herokuapp.com/api/user-pregnancy-information/create-user-pregnancy-information',
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


  // Update styles to use dynamic RTL/LTR alignment
  const getAlignmentStyles = () => ({
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  });

  return (
    <ScrollView style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]} 
                contentContainerStyle={styles.content}>
      <TouchableOpacity 
        style={[styles.backButton, {
          left: isRTL ? undefined : 24,
          right: isRTL ? 24 : undefined,
        }]} 
        onPress={() => router.back()}
      >
        <Ionicons 
          name={isRTL ? "chevron-back" : "chevron-forward"} 
          size={24} 
          color="black" 
        />
      </TouchableOpacity>

      <TextBold style={styles.title}>{i18n.t('MedicalInfoTitle')}</TextBold>

      <View style={[styles.rowBetween, {
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }]}>
        <Text style={[styles.label, getAlignmentStyles()]}>
          {i18n.t('currentlyPregnant')}
        </Text>
        <Switch
          trackColor={{ false: '#ccc', true: '#C1B2DF' }}
          thumbColor={isPregnant ? '#8368C7' : '#f4f3f4'}
          value={isPregnant}
          onValueChange={setIsPregnant}
        />
      </View>

      <TouchableOpacity 
        onPress={() => setShowDatePicker(true)} 
        style={[styles.datePickerContainer, {
          flexDirection: isRTL ? 'row-reverse' : 'row'
        }]}
      >
        <Ionicons name="calendar-outline" size={20} color="#C1B2DF" />
        <Text style={[styles.dateText, {
          marginLeft: isRTL ? 0 : 10,
          marginRight: isRTL ? 10 : 0
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

      {/* Form Inputs with RTL/LTR support */}
      <TextInput
        placeholder={i18n.t('numberOfPreviousPregnancies')}
        keyboardType="numeric"
        value={previousPregnancies}
        onChangeText={setPreviousPregnancies}
        style={[styles.input, getAlignmentStyles()]}
      />
      <TextInput
        placeholder={i18n.t('numberOfLiveBirths')}
        keyboardType="numeric"
        value={liveBirths}
        onChangeText={setLiveBirths}
        style={[styles.input, getAlignmentStyles()]}
      />

      <TextInput
        placeholder={i18n.t('emergencyContactName')}
        value={emergencyName}
        onChangeText={setEmergencyName}
        style={[styles.input, getAlignmentStyles()]}
      />

      <TextInput
        placeholder={i18n.t('emergencyContactNumber')}
        keyboardType="phone-pad"
        value={emergencyContact}
        onChangeText={setEmergencyContact}
        style={[styles.input, getAlignmentStyles()]}
      />

      <View style={[styles.rowBetween, {
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }]}>
        <Text style={[styles.label, getAlignmentStyles()]}>
          {i18n.t('diabetic')}
        </Text>
        <Switch
          value={isDiabetic}
          onValueChange={setIsDiabetic}
          trackColor={{ false: '#ccc', true: '#C1B2DF' }}
          thumbColor={isDiabetic ? '#8368C7' : '#f4f3f4'}
        />
      </View>

      <View style={[styles.rowBetween, {
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }]}>
        <Text style={[styles.label, getAlignmentStyles()]}>
          {i18n.t('hasHypertension')}
        </Text>
        <Switch
          value={hasHypertension}
          onValueChange={setHasHypertension}
          trackColor={{ false: '#ccc', true: '#C1B2DF' }}
          thumbColor={hasHypertension ? '#8368C7' : '#f4f3f4'}
        />
      </View>

      <TextInput
        placeholder={i18n.t('haemoglobinLevel')}
        keyboardType="decimal-pad"
        value={haemoglobinLevel}
        onChangeText={setHaemoglobinLevel}
        style={[styles.input, getAlignmentStyles()]}
      />

      <View style={[styles.rowBetween, {
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }]}>
        <Text style={[styles.label, getAlignmentStyles()]}>
          {i18n.t('smoker')}
        </Text>
        <Switch
          value={isSmoker}
          onValueChange={setIsSmoker}
          trackColor={{ false: '#ccc', true: '#C1B2DF' }}
          thumbColor={isSmoker ? '#8368C7' : '#f4f3f4'}
        />
      </View>

      <TextInput
        placeholder={i18n.t('takesMedication')}
        value={takesMedication}
        onChangeText={setTakesMedication}
        style={[styles.input, getAlignmentStyles()]}
      />

      {/* Blood Group Picker */}
      <View style={[styles.pickerContainer, {
        alignItems: isRTL ? 'flex-end' : 'flex-start'
      }]}>
        <Text style={[styles.label, getAlignmentStyles()]}>
          {i18n.t('bloodGroup')}
        </Text>
        <Picker
          selectedValue={bloodGroup}
          onValueChange={(itemValue) => setBloodGroup(itemValue)}
          style={[styles.picker, { 
            width: '100%',
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

      <TouchableOpacity 
        style={[styles.nextButton, {
          alignSelf: 'center'
        }]} 
        onPress={submitForm}
      >
        <Text style={styles.nextButtonText}>{i18n.t('next')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6FF',
    paddingHorizontal: 24,
    paddingTop: 10,
    marginBottom: 50,
  },
  backButton: {
    position: 'absolute',
    top: 35,
    zIndex: 1,
  },
  title: {
    fontSize: 22,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 40,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  rowBetween: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  dateText: {
    marginLeft: 10,
    color: '#AAA',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  pickerContainer: {
    marginBottom: 15,
  backgroundColor: '#fff',
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      borderColor: '#E5E7EB',
      borderWidth: 1,
  },
  picker: {
    height: 50,
    color: '#AAA',
  },
  nextButton: {
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
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
});

export default MedicalPregnancyInfoScreen;
