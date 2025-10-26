import { Text } from '@/components/Text';
import i18n from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import React, { useEffect, useState, useRef } from 'react';
import {
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
  I18nManager,
  Animated,
  ScrollView,
  PanResponder,
} from 'react-native';
import { useSelector } from 'react-redux';
import fallbackData from '../../../assets/fallBackData.json';
import {
  calcPercentageHeight,
  calcPercentageWidth,
} from "@/lib/utils/dimensions";


const EXPO_PUBLIC_URL = process.env.EXPO_PUBLIC_URL;
const LOCAL_FILE_PATH = FileSystem.documentDirectory + 'pregnancy-track.json';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { language, textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';
  const [data, setData] = useState<any | null>(null);
  const params = useLocalSearchParams();
  console.log("weekNumber",weekNumber);
  const dashboardData = useSelector(state => state.dashboard.dashboardData);

  console.log("User Dashboard Data:", dashboardData);
  const weekNumber = params?.weekNumber || dashboardData?.currentWeek;

  // Animation refs
  const animatedValues = useRef<Animated.Value[]>([]).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const floatingElements = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  // Floating background elements animation
  useEffect(() => {
    const animateFloatingElements = () => {
      floatingElements.forEach((element, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(element, {
              toValue: 1,
              duration: 3000 + (index * 500),
              useNativeDriver: true,
            }),
            Animated.timing(element, {
              toValue: 0,
              duration: 3000 + (index * 500),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    };

    animateFloatingElements();
  }, []);

  // Header entrance animation
  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for timeline dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const animateCards = (count: number) => {
    animatedValues.length = count;
    animatedValues.forEach((val, index) => {
      if (!val) {
        animatedValues[index] = new Animated.Value(0);
      }
      Animated.spring(animatedValues[index], {
        toValue: 1,
        delay: index * 150,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    });
  };

  const changeLanguage = async (lang: string) => {
    i18n.locale = lang;
    const rtl = lang === 'ur';
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
      await Updates.reloadAsync();
    }
  };

   useEffect(() => {
      const initializePregnancyData = async () => {
        try {
          const fileInfo = await FileSystem.getInfoAsync(LOCAL_FILE_PATH);
          const fileExists = fileInfo.exists;
          const netState = await NetInfo.fetch();
          const online = netState.isConnected && netState.isInternetReachable;

          // ✅ Online → fetch from API + update fallback
          if (online) {
            console.log("Internet available. Fetching pregnancy data...");
            const token = await SecureStore.getItemAsync("accessToken");
            if (!token) {
              console.warn(" No token found. Using cached data.");
              if (fileExists) await loadLocalData();
              else await copyAssetToFileSystem();
              return;
            }
            await fetchFromAPI();
          }
          // 🔴 Offline → load cached or fallback
          else {
            console.log("📴 Offline mode: loading cached data...");
            if (fileExists) await loadLocalData();
            else await copyAssetToFileSystem();
          }
        } catch (err) {
          console.error(" Initialization failed:", err);
          await copyAssetToFileSystem();
        }
      };
      initializePregnancyData();
    }, [language]);

    // 🔁 Copy default fallback (asset → file system)
    const copyAssetToFileSystem = async () => {
      try {
        console.log("Copying fallback pregnancy data...");
        const asset = Asset.fromModule(require('../../../assets/fallBackData.json'));
        await asset.downloadAsync();
        const sourceUri = asset.localUri || asset.uri;
        await FileSystem.copyAsync({ from: sourceUri, to: LOCAL_FILE_PATH });
        const content = await FileSystem.readAsStringAsync(LOCAL_FILE_PATH);
        setData(JSON.parse(content));
      } catch (e) {
        console.log(" Failed to copy fallback asset:", e);
      }
    };

    // 📂 Load locally saved fallback file
    const loadLocalData = async () => {
      try {
        console.log("Loading cached pregnancy data...");
        const file = await FileSystem.readAsStringAsync(LOCAL_FILE_PATH);
        const parsed = JSON.parse(file);
        setData(parsed);
      } catch (e) {
        console.log("Failed to load local data, using default fallback...");
        await copyAssetToFileSystem();
      }
    };

    // 🌍 Fetch API + store fallback
    const fetchFromAPI = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        const res = await axios.get(
          `${EXPO_PUBLIC_URL}/pregnancy-tracker/weekly-pregnancy-profile?Language=${language}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const apiData = res.data?.data || res.data;
        console.log("✅ API pregnancy data fetched");
        setData(apiData);
        await FileSystem.writeAsStringAsync(LOCAL_FILE_PATH, JSON.stringify(apiData));
        console.log("💾 Pregnancy fallback updated");
      } catch (err) {
        console.log("⚠️ API fetch failed, loading fallback:", err.message);
        await loadLocalData();
      }
    };


  // 🍼 Determine baby size based on week ranges
  const currentWeek = Number(params?.weekNumber || 1);

  const babySizeRanges = [
    { range: [1, 3], size: "Poppy Seed", length: "0.1 cm", weight: "< 1g" },
    { range: [4, 7], size: "Blueberry", length: "0.5 – 1.2 cm", weight: "1g" },
    { range: [8, 11], size: "Lime", length: "1.6 – 4.5 cm", weight: "4 – 10g" },
    { range: [12, 15], size: "Plum", length: "5 – 10 cm", weight: "20 – 70g" },
    { range: [16, 19], size: "Avocado", length: "11 – 15 cm", weight: "100 – 200g" },
    { range: [20, 23], size: "Banana", length: "25 – 28 cm", weight: "300 – 500g" },
    { range: [24, 27], size: "Corn", length: "30 – 34 cm", weight: "600 – 900g" },
    { range: [28, 31], size: "Eggplant", length: "35 – 39 cm", weight: "1.1 – 1.5 kg" },
    { range: [32, 35], size: "Squash", length: "40 – 45 cm", weight: "1.8 – 2.4 kg" },
    { range: [36, 39], size: "Papaya", length: "46 – 49 cm", weight: "2.5 – 3.1 kg" },
    { range: [40, 42], size: "Watermelon", length: "50 – 52 cm", weight: "3.3 – 3.8 kg" },
  ];

  // Find the correct size based on current week range
  const babySize =
    babySizeRanges.find(
      (b) => currentWeek >= b.range[0] && currentWeek <= b.range[1]
    ) || babySizeRanges[babySizeRanges.length - 1];


  const getCardStyle = (type: string) => {
    const cardStyles = {
      babyDevelopment: {
        backgroundColor: '#FFE5F1',
        iconColor: '#FF69B4',
        gradient: ['#FFE5F1', '#FFD1E3']
      },
      dangerSigns: {
        backgroundColor: '#FFE5E5',
        iconColor: '#FF4757',
        gradient: ['#FFE5E5', '#FFD1D1']
      },
      motherChanges: {
        backgroundColor: '#E8F4FD',
        iconColor: '#4A90E2',
        gradient: ['#E8F4FD', '#D1E7FC']
      },
      nutritionTips: {
        backgroundColor: '#E8F5E8',
        iconColor: '#2ECC71',
        gradient: ['#E8F5E8', '#D1F2D1']
      },
      recommendedActions: {
        backgroundColor: '#FFF4E6',
        iconColor: '#F39C12',
        gradient: ['#FFF4E6', '#FFECD1']
      },
    };
    return cardStyles[type] || cardStyles.babyDevelopment;
  };

  const renderFloatingElements = () => {
    return floatingElements.map((element, index) => {
      const translateY = element.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -20],
      });

      const opacity = element.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 0.8, 0.3],
      });

      return (
        <Animated.View
          key={index}
          style={[
            styles.floatingElement,
            {
              left: `${(index * 15) + 10}%`,
              top: `${(index * 12) + 20}%`,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <Ionicons
            name="heart"
            size={12 + (index % 3) * 4}
            color="rgba(124, 58, 237, 0.2)"
          />
        </Animated.View>
      );
    });
  };

  const renderCard = (title: string, content: string, icon: string, type: string, index: number) => {
    if (!animatedValues[index]) {
      animatedValues[index] = new Animated.Value(0);
    }
    const cardStyle = getCardStyle(type);

    const translateY = animatedValues[index].interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    const opacity = animatedValues[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const scale = animatedValues[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    const rotateY = animatedValues[index].interpolate({
      inputRange: [0, 1],
      outputRange: ['15deg', '0deg'],
    });

    const isLeft = index % 2 === 0;

    // Create pan responder for interactive cards
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Animated.spring(animatedValues[index], {
          toValue: 0.95,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderRelease: () => {
        Animated.spring(animatedValues[index], {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      },
    });

    return (
      <View style={styles.timelineRow} key={index}>
        {/* Left side */}
        {isLeft && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.card,
              {
                backgroundColor: cardStyle.backgroundColor,
                transform: [{ translateY }, { scale }, { rotateY }],
                opacity,
                alignSelf: "flex-end",
              },
            ]}
          >
            <View style={styles.cardGlow} />
            <View style={styles.cardHeader}>
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: cardStyle.iconColor + "20",
                    transform: [{ scale: pulseAnimation }]
                  }
                ]}
              >
                <Ionicons name={icon} size={28} color={cardStyle.iconColor} />
              </Animated.View>
              <Text style={[styles.cardTitle, { textAlign: isRTL ? "right" : "left" }]}>
                {title}
              </Text>
            </View>
            <Text style={[styles.cardContent, { textAlign: isRTL ? "right" : "left" }]}>
              {content}
            </Text>
            <View style={[styles.cardAccent, { backgroundColor: cardStyle.iconColor }]} />
          </Animated.View>
        )}

        {/* Enhanced Timeline Dot */}
        <View style={styles.timelineDotContainer}>
          <Animated.View
            style={[
              styles.timelineDot,
              { transform: [{ scale: pulseAnimation }] }
            ]}
          />
          <View style={styles.timelineLine} />
          <Animated.View style={[styles.timelineDotGlow, { opacity: pulseAnimation }]} />
        </View>

        {/* Right side */}
        {!isLeft && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.card,
              {
                backgroundColor: cardStyle.backgroundColor,
                transform: [{ translateY }, { scale }, { rotateY }],
                opacity,
                alignSelf: "flex-start",
              },
            ]}
          >
            <View style={styles.cardGlow} />
            <View style={styles.cardHeader}>
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: cardStyle.iconColor + "20",
                    transform: [{ scale: pulseAnimation }]
                  }
                ]}
              >
                <Ionicons name={icon} size={28} color={cardStyle.iconColor} />
              </Animated.View>
              <Text style={[styles.cardTitle, { textAlign: isRTL ? "right" : "left" }]}>
                {title}
              </Text>
            </View>
            <Text style={[styles.cardContent, { textAlign: isRTL ? "right" : "left" }]}>
              {content}
            </Text>
            <View style={[styles.cardAccent, { backgroundColor: cardStyle.iconColor }]} />
          </Animated.View>
        )}
      </View>
    );
  };

  const cards = data
    ? [
        {
          title: i18n.t('babySize') || 'Baby Size',
          content: `${i18n.t("dashboard.content", {
            currentWeek,
            babySize: babySize.size
          })} - ${i18n.t("dashboard.length", { length: babySize.length })} - ${i18n.t("dashboard.weight", { weight: babySize.weight })}`,
          icon: "body-outline",
          type: "babySize",
        },

        { title: i18n.t('babyDevelopment'), content: data.babyDevelopment, icon: 'happy-outline', type: 'babyDevelopment' },
        { title: i18n.t('dangerSigns'), content: data.dangerSigns, icon: 'alert-circle-outline', type: 'dangerSigns' },
        { title: i18n.t('motherChanges'), content: data.motherChanges, icon: 'female-outline', type: 'motherChanges' },
        { title: i18n.t('nutritionTips'), content: data.nutritionTips, icon: 'nutrition-outline', type: 'nutritionTips' },
        { title: i18n.t('recommendedActions'), content: data.recommendedActions, icon: 'checkmark-circle-outline', type: 'recommendedActions' },
      ]
    : [];

  useEffect(() => {
    if (cards.length > 0) {
      animateCards(cards.length);
    }
  }, [cards.length]);

  // Parallax effect for header
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Floating Background Elements */}
      {renderFloatingElements()}

      {/* Enhanced Header with Parallax */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [
              { translateY: headerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              })},
              { translateY: headerTranslateY }
            ],
            opacity: headerOpacity,
          }
        ]}
      >
        <View style={styles.headerGradientOverlay} />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/(home)")}
          activeOpacity={0.8}
        >
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="white" />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.headerContent,
            {
              transform: [{
                scale: headerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                })
              }]
            }
          ]}
        >
          <View style={styles.weekBadge}>
              <Text style={styles.headerTitle}>{i18n.t("dashboard.header_title")}</Text>
          </View>
          <Text style={styles.headerSubtitle}> {i18n.t("dashboard.week")} {weekNumber || '...'}</Text>
        </Animated.View>

        {/* Header decorative elements */}
        <View style={styles.headerDecoration1} />
        <View style={styles.headerDecoration2} />
      </Animated.View>

      {/* Enhanced Animated Zig-Zag Cards with Parallax Scroll */}
      <Animated.ScrollView
        contentContainerStyle={styles.cardList}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {cards.map((c, idx) =>
          renderCard(c.title, c.content, c.icon, c.type, idx)
        )}
      </Animated.ScrollView>

      {/* Enhanced Bottom Button */}
      <Animated.View
        style={[
          styles.nextButtonContainer,
          {
            transform: [{
              translateY: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [0, 100],
                extrapolate: 'clamp',
              })
            }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/(tabs)/(home)/nutrition-tracking")}
          activeOpacity={0.9}
        >
          <Animated.View style={[styles.buttonGlow, { opacity: pulseAnimation }]} />
          <Ionicons name="leaf-outline" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>{i18n.t('trackNutrition')}</Text>
          <Ionicons name="arrow-forward" size={16} color="white" style={styles.buttonArrow} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
 container: {
     flex: 1,
     backgroundColor: "#FFF8F8",
   },

   // Floating elements
   floatingElement: {
     position: "absolute",
     zIndex: 1,
   },

   // Enhanced Header
   header: {
     paddingTop: calcPercentageHeight(7),
     paddingBottom: calcPercentageHeight(3.5),
     paddingHorizontal: calcPercentageWidth(6),
     backgroundColor: "#7C3AED",
     borderBottomLeftRadius: calcPercentageWidth(8),
     borderBottomRightRadius: calcPercentageWidth(8),
     overflow: "hidden",
     position: "relative",
     zIndex: 10,
   },

   headerGradientOverlay: {
     position: "absolute",
     top: 0,
     left: 0,
     right: 0,
     bottom: 0,
     backgroundColor: "rgba(124, 58, 237, 0.1)",
   },

   headerDecoration1: {
     position: "absolute",
     top: calcPercentageHeight(-6),
     right: calcPercentageWidth(-12),
     width: calcPercentageWidth(40),
     height: calcPercentageWidth(40),
     borderRadius: calcPercentageWidth(20),
     backgroundColor: "rgba(255, 255, 255, 0.1)",
   },

   headerDecoration2: {
     position: "absolute",
     bottom: calcPercentageHeight(-3),
     left: calcPercentageWidth(-8),
     width: calcPercentageWidth(26),
     height: calcPercentageWidth(26),
     borderRadius: calcPercentageWidth(13),
     backgroundColor: "rgba(255, 255, 255, 0.05)",
   },

   backButton: {
     position: "absolute",
     top: calcPercentageHeight(7),
     left: calcPercentageWidth(6),
     width: calcPercentageWidth(11),
     height: calcPercentageWidth(11),
     borderRadius: calcPercentageWidth(5.5),
     backgroundColor: "rgba(255, 255, 255, 0.2)",
     alignItems: "center",
     justifyContent: "center",
     borderWidth: 1,
     borderColor: "rgba(255, 255, 255, 0.3)",
   },

   headerContent: {
     alignItems: "center",
     marginTop: calcPercentageHeight(2.2),
     zIndex: 2,
   },

   weekBadge: {
     backgroundColor: "rgba(255, 255, 255, 0.2)",
     paddingHorizontal: calcPercentageWidth(5),
     paddingVertical: calcPercentageHeight(1),
     borderRadius: calcPercentageWidth(6),
     marginBottom: calcPercentageHeight(1.2),
   },

   headerTitle: {
     fontSize: calcPercentageWidth(7.2),
     fontWeight: "bold",
     color: "white",
     textShadowColor: "rgba(0, 0, 0, 0.3)",
     textShadowOffset: { width: 1, height: 1 },
     textShadowRadius: 3,
   },

   headerSubtitle: {
     fontSize: calcPercentageWidth(4.5),
     color: "rgba(255,255,255,0.9)",
     fontWeight: "600",
   },

   // Enhanced Cards
   cardList: {
     paddingHorizontal: calcPercentageWidth(5),
     paddingTop: calcPercentageHeight(5),
     paddingBottom: calcPercentageHeight(16),
   },

   timelineRow: {
     flexDirection: "row",
     alignItems: "center",
     marginVertical: calcPercentageHeight(3),
     position: "relative",
   },

   timelineDotContainer: {
     width: calcPercentageWidth(14),
     alignItems: "center",
     position: "relative",
   },

   timelineDot: {
     width: calcPercentageWidth(4.5),
     height: calcPercentageWidth(4.5),
     borderRadius: calcPercentageWidth(2.3),
     backgroundColor: "#7C3AED",
     marginBottom: calcPercentageHeight(0.5),
     borderWidth: 3,
     borderColor: "#FFF",
     shadowColor: "#7C3AED",
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.5,
     shadowRadius: 4,
     elevation: 5,
   },

   timelineDotGlow: {
     position: "absolute",
     top: calcPercentageHeight(-0.6),
     width: calcPercentageWidth(7),
     height: calcPercentageWidth(7),
     borderRadius: calcPercentageWidth(3.5),
     backgroundColor: "#7C3AED",
     opacity: 0.3,
   },

   timelineLine: {
     flex: 1,
     width: calcPercentageWidth(0.8),
     backgroundColor: "#E0E0E0",
     borderRadius: calcPercentageWidth(0.4),
   },

   card: {
     width: calcPercentageWidth(75),
     borderRadius: calcPercentageWidth(6.5),
     padding: calcPercentageWidth(6),
     shadowColor: "#000",
     shadowOffset: { width: 0, height: 8 },
     shadowOpacity: 0.2,
     shadowRadius: 16,
     elevation: 12,
     position: "relative",
     overflow: "hidden",
     borderWidth: 1,
     borderColor: "rgba(255, 255, 255, 0.5)",
   },

   cardGlow: {
     position: "absolute",
     top: 0,
     left: 0,
     right: 0,
     height: calcPercentageHeight(5),
     backgroundColor: "rgba(255, 255, 255, 0.3)",
     borderRadius: calcPercentageWidth(6.5),
   },

   cardAccent: {
     position: "absolute",
     top: 0,
     right: 0,
     width: calcPercentageWidth(1),
     height: "100%",
     borderTopRightRadius: calcPercentageWidth(6.5),
     borderBottomRightRadius: calcPercentageWidth(6.5),
   },

   cardHeader: {
     flexDirection: "row",
     alignItems: "center",
     marginBottom: calcPercentageHeight(2),
   },

   iconContainer: {
     width: calcPercentageWidth(14),
     height: calcPercentageWidth(14),
     borderRadius: calcPercentageWidth(7),
     alignItems: "center",
     justifyContent: "center",
     marginRight: calcPercentageWidth(4),
     borderWidth: 2,
     borderColor: "rgba(255, 255, 255, 0.5)",
   },

   cardTitle: {
     fontSize: calcPercentageWidth(5),
     fontWeight: "700",
     color: "#2C3E50",
     flex: 1,
     lineHeight: calcPercentageHeight(3),
   },

   cardContent: {
     fontSize: calcPercentageWidth(4),
     color: "#5A6C7D",
     lineHeight: calcPercentageHeight(3.2),
     fontWeight: "400",
   },

   // Enhanced Bottom Button
   nextButtonContainer: {
     position: "absolute",
     bottom: 0,
     left: 0,
     right: 0,
     backgroundColor: "white",
     paddingVertical: calcPercentageHeight(3),
     paddingHorizontal: calcPercentageWidth(5),
     borderTopLeftRadius: calcPercentageWidth(8),
     borderTopRightRadius: calcPercentageWidth(8),
     shadowColor: "#000",
     shadowOffset: { width: 0, height: -4 },
     shadowOpacity: 0.15,
     shadowRadius: 12,
     elevation: 10,
   },

   button: {
     backgroundColor: "#7C3AED",
     borderRadius: calcPercentageWidth(7),
     flexDirection: "row",
     paddingVertical: calcPercentageHeight(2),
     paddingHorizontal: calcPercentageWidth(8),
     alignItems: "center",
     justifyContent: "center",
     position: "relative",
     overflow: "hidden",
     shadowColor: "#7C3AED",
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.3,
     shadowRadius: 8,
     elevation: 6,
   },

   buttonGlow: {
     position: "absolute",
     top: 0,
     left: 0,
     right: 0,
     bottom: 0,
     backgroundColor: "rgba(255, 255, 255, 0.2)",
     borderRadius: calcPercentageWidth(7),
   },

   buttonIcon: {
     marginRight: calcPercentageWidth(2.5),
   },

   buttonText: {
     color: "white",
     fontSize: calcPercentageWidth(4.5),
     fontWeight: "600",
     letterSpacing: 0.5,
     flex: 1,
     textAlign: "center",
   },

   buttonArrow: {
     marginLeft: calcPercentageWidth(2),
     opacity: 0.8,
   },

   babySize: {
     backgroundColor: "#FFF9E6",
     iconColor: "#F4B400",
     gradient: ["#FFF9E6", "#FFEFC1"],
   },
});