// ✅ HomeScreen that fetches from API when online
// ✅ Falls back to asset-based JSON when offline

import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  I18nManager,
  ScrollView,
  Image,
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
const EXPO_PUBLIC_URL = process.env.EXPO_PUBLIC_URL;

const isRTL = I18nManager.isRTL;
const LOCAL_FILE_PATH = FileSystem.documentDirectory + 'app-data.json';

export default function LoginScreen() {
  const router = useRouter();
  const [locale, setLocale] = useState(i18n.locale);
  const [data, setData] = useState<any[] | null>(null);

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

    const normalizedData = Array.isArray(parsed)
      ? parsed
      : parsed.data || []; // ensure it's always an array

    setData(normalizedData);
  } catch (e) {
    console.log('❌ No local file. Copying from fallback asset...');
    await copyAssetToFileSystem();
  }
};


 const fetchFromAPI = async () => {
   try {
     const token = await SecureStore.getItemAsync("accessToken");

     const res = await axios.get(
       `${EXPO_PUBLIC_URL}/content/get-all-content-item?Language=en`,
       {
         headers: {
           Accept: '*/*',
           Authorization: `Bearer ${token}`,
         },
       }
     );

     const apiData = res.data.data || res.data;
     console.log("apiData", res.data)
     setData(apiData);

    await FileSystem.writeAsStringAsync(
      LOCAL_FILE_PATH,
      JSON.stringify(apiData)
    );


     console.log('🌐 Data fetched from API and cached.');
   } catch (err) {
     console.warn('⚠️ Failed to fetch from API, loading local data.', err.message);
     await loadLocalData();
   }
 };

useEffect(() => {
  const init = async () => {
    // Load local data for instant display
    const fileInfo = await FileSystem.getInfoAsync(LOCAL_FILE_PATH);
    if (fileInfo.exists) {
      await loadLocalData();
    } else {
      await copyAssetToFileSystem();
    }

    // Check internet
    const netState = await NetInfo.fetch();
    if (netState.isConnected && netState.isInternetReachable) {
      const token = await SecureStore.getItemAsync("accessToken");

      if (token) {
        await fetchFromAPI(); // Only fetch if authenticated
      } else {
        console.warn("🔐 No token found. Skipping API fetch.");
      }
    } else {
      console.log("📴 Offline mode: showing cached data.");
    }
  };

  init();
}, []);



  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="black" />
      </TouchableOpacity>

    <ScrollView contentContainerStyle={styles.cardList}>
      {Array.isArray(data) && data.length > 0 ? (
        data.map((item, index) => (
          <View key={item.id || index} style={styles.card}>
            {item.imageUrl && (
              <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
            )}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.summary}>{item.summary}</Text>
            <Text style={styles.subsummary}>{item.text}</Text>
            <Text style={styles.meta}>🎯 {item.audience}</Text>
            <View style={styles.tagsContainer}>
              {item.tags?.map((tag, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ))
      ) : (
        <Text>Loading data...</Text>
      )}
    <View>
      <TouchableOpacity
        style={styles.button}  // Optional: Add custom styles if you want to style the button
        onPress={() => router.push("/(tabs)/(home)/pregnancy-tracker")}  // Replace "/nextScreen" with your desired route
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
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
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  summary: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 10,
  },
  subsummary: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  meta: {
    fontSize: 12,
    color: '#6B7280',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginTop: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#4338CA',
    fontWeight: '500',
  },
   button: {
      backgroundColor: '#A78BFA', // Button background color
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
});
