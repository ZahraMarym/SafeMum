import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { SvgUri } from "react-native-svg";
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  StatusBar,
  I18nManager,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '../../components/Text';
import i18n from '../../i18n';
import MotherImage from "../../../assets/images/motherImage.svg";
import { setLanguage } from '../../redux/slice/languageSlice';
import assets from "@/lib/utils/assets";
import pregnancySymptoms from "../../../assets/pregnancy_symptoms_en_ur.json";
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';


const EXPO_PUBLIC_URL = process.env.EXPO_PUBLIC_URL;
const { width } = Dimensions.get('window');

export default function SafeMumDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { language, textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const LOCAL_FILE_PATH = FileSystem.documentDirectory + 'app-data.json';
  const [userName, setUserName] = useState<string>(''); // State to store the user's name
  const [fcmToken, setFcmToken] = useState<string | null>(null);


  // --------------------- 🔥 FCM TOKEN ---------------------
  const generateDeviceFCMToken = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      if (
        authStatus !== messaging.AuthorizationStatus.AUTHORIZED &&
        authStatus !== messaging.AuthorizationStatus.PROVISIONAL
      ) {
        console.log('❌ Push notification permission not granted');
        return null;
      }

      const token = await messaging().getToken();
      console.log('🔥 FCM Token generated:', token);
      return token;
    } catch (error) {
      console.error('❌ Error generating FCM token:', error);
      return null;
    }
  };

  const registerDeviceToken = async (token: string) => {
              console.log('Registering token:', token); // Ensure this logs

    try {

      const accessToken = await SecureStore.getItemAsync('accessToken');
      const storedUser = await SecureStore.getItemAsync('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const senderId = currentUser?.userId;

      if (!accessToken || !senderId) throw new Error('Missing auth details');

      // Use the correct base URL from your notification API
      const apiUrl = `${process.env.EXPO_PUBLIC_URL}/notification/register-device-token`;


      const axios = require('axios');
      const res = await axios.post(
        apiUrl,
        { userId: senderId, deviceToken: token },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log('✅ Device token registered:', res.status);
      await SecureStore.setItemAsync('fcmToken', token);
    } catch (error) {
      console.error('❌ Error registering token:', error);
    }
  };

  // --------------------- 🚀 INIT HOOK ---------------------
useEffect(() => {
  const registerFCM = async () => {
    setLoading(true);
    const token = await generateDeviceFCMToken();
    if (token) {
      setFcmToken(token);
      await registerDeviceToken(token);
    }
    setLoading(false);
  };

  registerFCM();
}, []); // <-- empty array ensures it runs only once on mount



  useEffect(() => {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
  }, [isRTL]);

  const safeNavigateBack = useCallback(() => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(signin)');
      }
    } catch (error) {
      console.warn('Navigation error:', error);
      router.replace('/(signin)');
    }
  }, [router]);

  const safeNavigateNext = useCallback(() => {
    try {
        console.log("current week", data?.currentWeek)
router.push({
  pathname: "/(tabs)/(home)/pregnancy-tracker",
  params: { weekNumber: data?.currentWeek },
});
    } catch (error) {
      console.warn('Navigation error:', error);
      Alert.alert('Navigation Error', 'Unable to navigate');
    }
  }, [router]);

  const changeLanguage = async (lang: string) => {
    dispatch(setLanguage(lang));
    i18n.locale = lang;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(LOCAL_FILE_PATH);
        if (fileInfo.exists) {
          await loadLocalData();
        } else {
          await copyAssetToFileSystem();
        }

        const netState = await NetInfo.fetch();
        if (netState.isConnected && netState.isInternetReachable) {
          const token = await SecureStore.getItemAsync('accessToken');
          if (token) {
            await fetchFromAPI();
          } else {
            console.warn('🔐 No token found. Skipping API fetch.');
          }
        } else {
          console.log('📴 Offline mode: showing cached data.');
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        Alert.alert('Error', 'Initialization failed');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const copyAssetToFileSystem = async () => {
    try {
      const asset = Asset.fromModule(require('../../../assets/fallBackData.json'));
      await asset.downloadAsync();
      const sourceUri = asset.localUri || asset.uri;
      await FileSystem.copyAsync({ from: sourceUri, to: LOCAL_FILE_PATH });
      const content = await FileSystem.readAsStringAsync(LOCAL_FILE_PATH);
      setData(JSON.parse(content));
    } catch (e) {
      console.log('⚠️ Failed to load fallback asset:', e);
    }
  };

  const loadLocalData = async () => {
    try {
      const file = await FileSystem.readAsStringAsync(LOCAL_FILE_PATH);
      const parsed = JSON.parse(file);
      setData(parsed);
    } catch (e) {
      Alert.alert('Error', 'Failed to load local data');
      await copyAssetToFileSystem();
    }
  };

const fetchFromAPI = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      const storedUser = await SecureStore.getItemAsync('user');
      const currentUser = JSON.parse(storedUser);
      const senderId = currentUser.userId;

      // API call to get user details
      const response = await axios.get(
        `${EXPO_PUBLIC_URL}/communication/get-user-by-id?Id=${senderId}`,
        {
          headers: {
            Accept: '*/*',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Extract the name from the response
      const name = response.data?.name || "Unknown";
      setUserName(name);  // Set the user's name in the state

      // Fetch the dashboard content
      const res = await axios.get(
        `${EXPO_PUBLIC_URL}/content/dashboard-content?Id=${senderId}&Language=${language}`,
        {
          headers: {
            Accept: '*/*',
            Authorization: `Bearer ${token}`,
          },
        }
      );

    console.log("dashboard content",res.data )

      const apiData = res.data.data || res.data;
      setData(apiData);

      // Save the fetched data to local storage
      await FileSystem.writeAsStringAsync(
        LOCAL_FILE_PATH,
        JSON.stringify(apiData)
      );
    } catch (err) {
      console.warn('⚠️ Failed to fetch from API, loading local data.', err.message);
      await loadLocalData();
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    header: {
      backgroundColor: '#FFFFFF',
      paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
      paddingBottom: 20,
      paddingHorizontal: 24,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 18,
      color: '#64748B',
      marginTop: 16,
      fontWeight: '500',
    },
    dashboardContent: {
      flex: 1,
    },
    scrollContainer: {
      paddingHorizontal: 24,
      paddingVertical: 24,
      paddingBottom: 100,
    },
    welcomeCard: {
      backgroundColor: '#8B5CF6',
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 5,
      marginTop: 24,
      marginBottom:10,
    },
    welcomeTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 8,
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: '#FFFFFF',
      opacity: 0.9,
    },
   weekCard: {
       flexDirection: "row",
       backgroundColor: "#FFFFFF",
       borderRadius: 20,
       padding: 5,
       borderWidth: 1.5,
       borderColor: "#C7B7F5",
       alignItems: "center",
       marginBottom: 20,
     },
     weekInfo: {
       marginLeft: 20,
     },
     weekTitle: {
       fontSize: 30,
       fontWeight: "700",
       color: "#8B5CF6",
       marginBottom: 6,
     },
     subText: {
       fontSize: 20,
       color: "#64748B",
       marginBottom: 4,
     },
     timeText: {
       fontSize: 40,
       fontWeight: "700",
       color: "#8B5CF6",
     },
     infoRow: {
       flexDirection: "row",
       justifyContent: "space-between",
       marginBottom: 10,
     },
     infoBox: {
       flex: 1,
       backgroundColor: "#FFFFFF",
       borderRadius: 16,
       padding: 16,
       alignItems: "center",
       marginHorizontal: 4,
       borderWidth: 1,
       borderColor: "#C7B7F5",
     },
     infoIcon: {
       width: 28,
       height: 28,
       marginBottom: 6,
     },
     infoText: {
       fontSize: 16,
       fontWeight: "700",
       color: "#1E293B",
     },
     infoLabel: {
       fontSize: 13,
       color: "#64748B",
       marginTop: 4,
     },
     symptomContainer: {
       marginBottom: 20,
     },
     sectionTitle: {
       fontSize: 18,
       fontWeight: "700",
       color: "#1E293B",
       marginBottom: 12,
     },
     symptomBox: {
       backgroundColor: "#C7B7F5",
       borderWidth: 1,
       borderColor: "#C7B7F5",
       borderRadius: 20,
       paddingVertical: 12,
       paddingHorizontal: 16,
       marginBottom: 10,
     },
     symptomText: {
       fontSize: 15,
       color: "#475569",
     },
     nextButtonContainer: {
       padding: 20,
       backgroundColor: "#F6F5FF",
     },
     nextButton: {
       backgroundColor: "#7C3AED",
       paddingVertical: 16,
       borderRadius: 16,
       alignItems: "center",
     },
     nextButtonText: {
       color: "#FFFFFF",
       fontSize: 18,
       fontWeight: "700",
     },
 timeTextWeek:{
     fontSize: 24,
     fontWeight: "700",
     color: "#7C3AED",},
     actionContainer: {
       flexDirection: "row",
       backgroundColor: "#FEF2F2",
       borderWidth: 1,
       borderColor: "#FCA5A5",
       borderRadius: 16,
       padding: 16,
       marginBottom: 10,
       alignItems: "flex-start",
     },
     actionTitle: {
       fontSize: 16,
       fontWeight: "700",
       color: "#B91C1C",
       marginBottom: 10,
     },
     actionText: {
       fontSize: 14,
       color: "#1E293B",
       lineHeight: 20,
     },

  });

const getTrimester = (week: number, language: string): string => {
  if (week >= 1 && week <= 12) {
    return language === "ur" ? "پہلا " : "First";
  } else if (week >= 13 && week <= 27) {
    return language === "ur" ? "دوسرا " : "Second";
  } else if (week >= 28 && week <= 40) {
    return language === "ur" ? "تیسرا " : "Third";
  } else {
    return language === "ur" ? "غلط ہفتہ" : "Invalid Week";
  }
};

let weekKey = "week_1";
let symptoms: string[] = [];

if (data?.currentWeek) {
  weekKey = `week_${data.currentWeek}`;
  symptoms =
    pregnancySymptoms.pregnancy_symptoms[weekKey]?.[
      language === "ur" ? "urdu" : "english"
    ] || [];
}
console.log("symptopms",symptoms )


return (
  <View style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

    {loading ? (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    ) : data ? (
      <View style={styles.dashboardContent}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.scrollContainer}>
            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>
                {i18n.t("welcome", )} {userName}
              </Text>
          </View>

            {data?.recommendedActions ? (
                        <View style={styles.actionContainer}>
                          <Ionicons name="alert-circle" size={22} color="#DC2626" style={{ marginRight: 8 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.actionTitle}>
                              {language === "ur" ? "اہم ہدایت" : "Important Action"}
                            </Text>
                            <Text style={styles.actionText}>{data.recommendedActions}</Text>
                          </View>
                        </View>
                      ) : null}

            {/* Week Card */}
            <View style={styles.weekCard}>
              <MotherImage width={150} height={200} />
              <View style={styles.weekInfo}>
<Text style={styles.weekTitle}>{i18n.t("week")} {data.currentWeek}</Text>
<Text style={styles.subText}>{i18n.t("timeToBaby")}</Text>
                <View style={{flexDirection:"row", alignItems:"center"}}>
                <Text style={styles.timeText}>{40-data.currentWeek} </Text>
<Text style={styles.timeTextWeek}>{i18n.t("weeks")}</Text>
                </View>
              </View>
            </View>

         <View style={styles.infoRow}>
           <View style={styles.infoBox}>
             <Image source={assets.bg} style={styles.infoIcon} resizeMode="contain" />
             <Text style={styles.infoText}>{data.bloodGroup}</Text>
             <Text style={styles.infoLabel}>{i18n.t("bloodGroup")}</Text>
           </View>

           <View style={styles.infoBox}>
             <Image source={assets.water} style={styles.infoIcon} resizeMode="contain" />
             <Text style={styles.infoText}>{data.amountInMl}</Text>
             <Text style={styles.infoLabel}>{i18n.t("waterInLtr")}</Text>
           </View>

           <View style={styles.infoBox}>
             <Image source={assets.trimester} style={styles.infoIcon} resizeMode="contain" />
             <Text style={styles.infoText}>{getTrimester(data.currentWeek, language)}</Text>
             <Text style={styles.infoLabel}>{i18n.t("trimester")}</Text>
           </View>
         </View>


            {/* Symptoms */}
            <View style={styles.symptomContainer}>
<Text style={styles.sectionTitle}>{i18n.t("symptoms")}</Text>
             {symptoms.length > 0 ? (
                            symptoms.map((symptom: string, index: number) => (
                              <View key={index} style={styles.symptomBox}>
                                              <Text style={styles.symptomText}>{symptom}</Text>
                                            </View>
                            ))
                          ) : (
                            <Text style={styles.noSymptomsText}>
                              {language === "ur" ? "کوئی علامات دستیاب نہیں" : "No symptoms available"}
                            </Text>
                          )}
            </View>


            {/* Continue Button */}
            <View style={styles.nextButtonContainer}>
              <TouchableOpacity style={styles.nextButton} onPress={safeNavigateNext}>
                <Text style={styles.nextButtonText}>{i18n.t("continue")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    ) : (
      <View>
        <Text>No Data Available</Text>
      </View>
    )}
  </View>
)

}
