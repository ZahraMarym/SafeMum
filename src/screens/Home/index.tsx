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
import {
  calcPercentageHeight,
  calcPercentageWidth,
} from "@/lib/utils/dimensions";
import { setDashboardData } from "../../redux/slice/dashboardSlice";
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
        console.log(' Push notification permission not granted');
        return null;
      }

      const token = await messaging().getToken();
      console.log(' FCM Token generated:', token);
      return token;
    } catch (error) {
      console.error(' Error generating FCM token:', error);
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

      console.log(' Device token registered:', res.status);
      await SecureStore.setItemAsync('fcmToken', token);
    } catch (error) {
      console.error(' Error registering token:', error);
    }
  };

  // --------------------- 🚀 INIT HOOK ---------------------
  useEffect(() => {
    let hasRegistered = false;
    const registerFCM = async () => {
      try {
        const token = await generateDeviceFCMToken();
        if (token) {
          setFcmToken(token);
          await registerDeviceToken(token);
        }
      } catch (err) {
        console.error(" FCM registration failed:", err);
      }
    };

    const handleConnectionChange = (state) => {
      if (state.isConnected && !hasRegistered) {
        console.log("✅ Internet available. Registering FCM...");
        hasRegistered = true;
        registerFCM();
      } else if (!state.isConnected) {
        console.log("No internet connection. Skipping FCM registration.");
      }
    };

    NetInfo.fetch().then(handleConnectionChange);
    const unsubscribe = NetInfo.addEventListener(handleConnectionChange);
    return () => unsubscribe();
  }, []);

  // --------------------- RTL Setup ---------------------
  useEffect(() => {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
  }, [isRTL]);

  // --------------------- Navigation ---------------------
  const safeNavigateNext = useCallback(() => {
    try {
      router.push({
        pathname: "/(tabs)/(home)/pregnancy-tracker",
        params: { weekNumber: data?.currentWeek },
      });
    } catch (error) {
      Alert.alert('Navigation Error', 'Unable to navigate');
    }
  }, [router, data]);

  const changeLanguage = async (lang: string) => {
    dispatch(setLanguage(lang));
    i18n.locale = lang;
  };

  // --------------------- 🌐 INIT DATA ---------------------
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);

        const fileInfo = await FileSystem.getInfoAsync(LOCAL_FILE_PATH);
        const fileExists = fileInfo.exists;
        const netState = await NetInfo.fetch();

        const token = await SecureStore.getItemAsync("accessToken");
        const storedUser = await SecureStore.getItemAsync("user");
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        const senderId = currentUser?.userId;

        // Online Mode
        if (netState.isConnected && netState.isInternetReachable) {
          console.log(" Internet available. Fetching latest data...");

          if (!token || !senderId) {
            console.warn(" Missing auth. Loading fallback...");
            if (fileExists) await loadLocalData();
            else await copyAssetToFileSystem();
            return;
          }

          const [userRes, dashboardRes] = await Promise.all([
            axios.get(`${EXPO_PUBLIC_URL}/communication/get-user-by-id?Id=${senderId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`${EXPO_PUBLIC_URL}/content/dashboard-content?Id=${senderId}&Language=${language}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          const name = userRes.data?.name || "Unknown";
          setUserName(name);

          const apiData = dashboardRes.data?.data || dashboardRes.data;
          setData(apiData);
          dispatch(setDashboardData(apiData));

          await FileSystem.writeAsStringAsync(LOCAL_FILE_PATH, JSON.stringify(apiData));
          console.log(fileExists ? " Updated fallback file" : " Created fallback file");
        }
        // Offline Mode
        else {
          console.log(" Offline mode: Loading cached fallback data...");
          if (fileExists) await loadLocalData();
          else await copyAssetToFileSystem();
        }
      } catch (error) {
        console.error(" Error initializing dashboard:", error);
        Alert.alert("Error", "Failed to initialize data");
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [language]);

  // --------------------- File Helpers ---------------------
const copyAssetToFileSystem = async () => {
  try {
    const asset = Asset.fromModule(require('../../../assets/fallBackData.json'));
    await asset.downloadAsync();
    const sourceUri = asset.localUri || asset.uri;
    await FileSystem.copyAsync({ from: sourceUri, to: LOCAL_FILE_PATH });
    const content = await FileSystem.readAsStringAsync(LOCAL_FILE_PATH);
    const parsed = JSON.parse(content);
    setData(parsed);
    dispatch(setDashboardData(parsed)); // ✅ dispatch fallback data
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

  const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
      },

      header: {
        backgroundColor: "#FFFFFF",
        paddingTop: (StatusBar.currentHeight
          ? StatusBar.currentHeight + calcPercentageHeight(2.5)
          : calcPercentageHeight(7)),
        paddingBottom: calcPercentageHeight(2.5),
        paddingHorizontal: calcPercentageWidth(6),
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
      },

      loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      },

      loadingText: {
        fontSize: calcPercentageWidth(4.5),
        color: "#64748B",
        marginTop: calcPercentageHeight(2),
        fontWeight: "500",
      },

      dashboardContent: {
        flex: 1,
      },

      scrollContainer: {
        paddingHorizontal: calcPercentageWidth(6),
        paddingVertical: calcPercentageHeight(3),
        paddingBottom: calcPercentageHeight(12),
      },

      welcomeCard: {
        backgroundColor: "#8B5CF6",
        borderRadius: calcPercentageWidth(5),
        paddingHorizontal: calcPercentageWidth(5),
        paddingVertical: calcPercentageHeight(1),
        marginTop: calcPercentageHeight(3),
        marginBottom: calcPercentageHeight(1.2),
      },

      welcomeTitle: {
        fontSize: calcPercentageWidth(6),
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: calcPercentageHeight(1),
      },

      welcomeSubtitle: {
        fontSize: calcPercentageWidth(4),
        color: "#FFFFFF",
        opacity: 0.9,
      },

      weekCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: calcPercentageWidth(5),
        padding: calcPercentageHeight(0.8),
        borderWidth: 1.5,
        borderColor: "#C7B7F5",
        alignItems: "center",
        marginBottom: calcPercentageHeight(2.5),
      },

      weekInfo: {
        marginLeft: calcPercentageWidth(5),
      },

      weekTitle: {
        fontSize: calcPercentageWidth(7.5),
        fontWeight: "700",
        color: "#8B5CF6",
        marginBottom: calcPercentageHeight(0.8),
      },

      subText: {
        fontSize: calcPercentageWidth(5),
        color: "#64748B",
        marginBottom: calcPercentageHeight(0.5),
      },

      timeText: {
        fontSize: calcPercentageWidth(9.5),
        fontWeight: "700",
        color: "#8B5CF6",
      },

      timeTextWeek: {
        fontSize: calcPercentageWidth(6),
        fontWeight: "700",
        color: "#7C3AED",
      },

      infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: calcPercentageHeight(1.2),
      },

      infoBox: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: calcPercentageWidth(4),
        padding: calcPercentageHeight(2),
        alignItems: "center",
        marginHorizontal: calcPercentageWidth(1),
        borderWidth: 1,
        borderColor: "#C7B7F5",
      },

      infoIcon: {
        width: calcPercentageWidth(7),
        height: calcPercentageWidth(7),
        marginBottom: calcPercentageHeight(0.8),
      },

      infoText: {
        fontSize: calcPercentageWidth(4),
        fontWeight: "700",
        color: "#1E293B",
      },

      infoLabel: {
        fontSize: calcPercentageWidth(2.5),
        color: "#64748B",
        marginTop: calcPercentageHeight(0.5),
      },

      symptomContainer: {
        marginBottom: calcPercentageHeight(2.5),
      },

      sectionTitle: {
        fontSize: calcPercentageWidth(4.5),
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: calcPercentageHeight(1.2),
      },

      symptomBox: {
        backgroundColor: "#C7B7F5",
        borderWidth: 1,
        borderColor: "#C7B7F5",
        borderRadius: calcPercentageWidth(5),
        paddingVertical: calcPercentageHeight(1.5),
        paddingHorizontal: calcPercentageWidth(4),
        marginBottom: calcPercentageHeight(1.2),
      },

      symptomText: {
        fontSize: calcPercentageWidth(3.8),
        color: "#475569",
      },

      nextButtonContainer: {
        padding: calcPercentageHeight(2.5),
        backgroundColor: "#F6F5FF",
      },

      nextButton: {
        backgroundColor: "#7C3AED",
        paddingVertical: calcPercentageHeight(2),
        borderRadius: calcPercentageWidth(4),
        alignItems: "center",
      },

      nextButtonText: {
        color: "#FFFFFF",
        fontSize: calcPercentageWidth(4.8),
        fontWeight: "700",
      },

      actionContainer: {
        flexDirection: "row",
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FCA5A5",
        borderRadius: calcPercentageWidth(4),
        padding: calcPercentageHeight(2),
        marginBottom: calcPercentageHeight(1.2),
        alignItems: "flex-start",
      },

      actionTitle: {
        fontSize: calcPercentageWidth(4),
        fontWeight: "700",
        color: "#B91C1C",
        marginBottom: calcPercentageHeight(1.2),
      },

      actionText: {
        fontSize: calcPercentageWidth(3.6),
        color: "#1E293B",
        lineHeight: calcPercentageHeight(2.5),
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
