import { Text } from '@/components/Text';
import i18n from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';

const EXPO_PUBLIC_URL = process.env.EXPO_PUBLIC_URL;
const LOCAL_FILE_PATH = FileSystem.documentDirectory + 'pregnancy-track.json';

export default function HomeScreen() {
  const router = useRouter();
  const { language, textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';
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
          await fetchFromAPI(); // Only fetch if authenticated
        }
      } else {
        console.log("📴 Offline mode: showing cached data.");
      }
    };

    init();
  }, []);

  // Update renderCard to handle RTL
  const renderCard = (title: string, content: string, icon: string) => (
    <View style={styles.card}>
      <Ionicons name={icon} size={32} color="#A78BFA" style={styles.cardIcon} />
      <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
        {title}
      </Text>
      <Text style={[styles.cardContent, { textAlign: isRTL ? 'right' : 'left' }]}>
        {content}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons 
          name={isRTL ? "chevron-back" : "chevron-forward"} 
          size={24} 
          color="black" 
        />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={[
        styles.cardList,
        { alignItems: isRTL ? 'flex-end' : 'flex-start' }
      ]}>
        {data ? (
          <>
            {renderCard(
              i18n.t('babyDevelopment'), 
              data.babyDevelopment, 
              'person'
            )}
            {renderCard(
              i18n.t('dangerSigns'), 
              data.dangerSigns, 
              'warning'
            )}
            {renderCard(
              i18n.t('motherChanges'), 
              data.motherChanges, 
              'woman'
            )}
            {renderCard(
              i18n.t('nutritionTips'), 
              data.nutritionTips, 
              'leaf'
            )}
            {renderCard(
              i18n.t('recommendedActions'), 
              data.recommendedActions, 
              'checkmark-circle'
            )}
          </>
        ) : (
          <Text style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {i18n.t('loadingData')}
          </Text>
        )}
      </ScrollView>

      <View style={styles.nextButtonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push("/(tabs)/(home)/nutrition-tracking")}
        >
          <Text style={styles.buttonText}>
            {i18n.t('trackNutrition')}
          </Text>
        </TouchableOpacity>
      </View>
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
    left: undefined ? undefined : 24,
    right: 24,
  },
  cardList: {
    paddingBottom: 80,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
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
    width: '100%',
  },
  cardIcon: {
    marginBottom: 16,
    alignSelf: undefined ? 'flex-end' : 'flex-start',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cardContent: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
  },
  nextButtonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#A78BFA',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
