import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  I18nManager,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import * as Updates from 'expo-updates';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import i18n from '@/i18n';
import { Text } from '@/components/Text';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { TextBold } from '@/components/TextBold';

const EXPO_PUBLIC_URL = process.env.EXPO_PUBLIC_URL;
const isRTL = I18nManager.isRTL;
const LOCAL_FILE_PATH = FileSystem.documentDirectory + 'pregnancy-track.json';

export default function HomeScreen() {
  const router = useRouter();
  const [locale, setLocale] = useState(i18n.locale);
  const [data, setData] = useState<any | null>(null);

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

  const copyAssetToFileSystem = async () => {
    try {
      const asset = Asset.fromModule(require('../../../assets/fallBackData.json'));
      await asset.downloadAsync();
      const sourceUri = asset.localUri || asset.uri;
      await FileSystem.copyAsync({ from: sourceUri, to: LOCAL_FILE_PATH });
      const content = await FileSystem.readAsStringAsync(LOCAL_FILE_PATH);
      console.log('✅ Copied and loaded fallback from asset.');
      setData(JSON.parse(content));
    } catch (e) {
      console.log('⚠️ Failed to load fallback asset:', e);
    }
  };

  const loadLocalData = async () => {
    try {
      const file = await FileSystem.readAsStringAsync(LOCAL_FILE_PATH);
      const parsed = JSON.parse(file);
      console.log('✅ Loaded from local file.', parsed);

      setData(parsed);
    } catch (e) {
      console.log('❌ No local file. Copying from fallback asset...');
      await copyAssetToFileSystem();
    }
  };

  const fetchFromAPI = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");

      const response = await axios.get(
        'https://safemum-app-5f503b88629c.herokuapp.com/api/pregnancy-tracker/weekly-pregnancy-profile',
        {
          headers: {
            'Accept': '*/*',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const apiData = response.data.data || response.data;
      setData(apiData);

      await FileSystem.writeAsStringAsync(LOCAL_FILE_PATH, JSON.stringify(apiData));
      console.log('🌐 Data fetched from API and cached.');
    } catch (err) {
      console.error('⚠️ Error fetching from API:', err.response?.data || err.message);
      await loadLocalData();
    }
  };

  useEffect(() => {
    const init = async () => {
      const fileInfo = await FileSystem.getInfoAsync(LOCAL_FILE_PATH);
      if (fileInfo.exists) {
        await loadLocalData();
      } else {
        await copyAssetToFileSystem();
      }

      const netState = await NetInfo.fetch();
      if (netState.isConnected && netState.isInternetReachable) {
        const token = await SecureStore.getItemAsync("accessToken");

        if (token) {
          await fetchFromAPI();
        }
      } else {
        console.log("📴 Offline mode: showing cached data.");
      }
    };

    init();
  }, []);

  const renderCard = (title: string, content: string, icon: string) => (
    <View style={styles.card}>
      <Ionicons name={icon} size={32} color="#A78BFA" style={styles.cardIcon} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardContent}>{content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="black" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.cardList}>
        {data ? (
          <>
            {renderCard('Baby Development', data.babyDevelopment, 'person')}
            {renderCard('Danger Signs', data.dangerSigns, 'warning')}
            {renderCard('Mother Changes', data.motherChanges, 'woman')}
            {renderCard('Nutrition Tips', data.nutritionTips, 'leaf')}
            {renderCard('Recommended Actions', data.recommendedActions, 'checkmark-circle')}
          </>
        ) : (
          <Text>Loading data...</Text>
        )}
    <TouchableOpacity style={styles.nutritionButton} onPress={() => router.push("/(tabs)/(track)/nutrition-tracking")}>
           <TextBold>
           Track Nutrition
           </TextBold>
          </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const screenWidth = Dimensions.get('window').width;

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
  cardList: {
    paddingBottom: 80,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    width: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardContent: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  nutritionButton:{
      padding:20,
      backgroundColor:"#A78BFA",
      flexDirection:"row",
      color:"white",
      justifyContent:"center",
      alignItems:"center",}
});
