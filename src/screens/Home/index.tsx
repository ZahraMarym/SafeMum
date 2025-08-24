import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '../../components/Text';
import i18n from '../../i18n';
import { setLanguage } from '../../redux/slice/languageSlice';

const EXPO_PUBLIC_URL = process.env.EXPO_PUBLIC_URL;

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { language, textDirection } = useSelector((state: any) => state.language);
  const isRTL = textDirection === 'rtl';
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Safe navigation function
  const safeNavigateBack = useCallback(() => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(signin)');
      }
    } catch (error) {
      console.warn('Navigation error:', error);
      // Ultimate fallback
      router.replace('/(signin)');
    }
  }, [router]);

  const safeNavigateNext = useCallback(() => {
    try {
      router.push('/(tabs)/(home)/pregnancy-tracker');
    } catch (error) {
      console.warn('Navigation error:', error);
      // You could show an alert or try alternative navigation
      Alert.alert('Navigation Error', 'Unable to navigate to the next screen.');
    }
  }, [router]);

  // Change language handler
  const changeLanguage = async (lang: string) => {
    dispatch(setLanguage(lang)); // Dispatch action to update language
    i18n.locale = lang;
  };

  useEffect(() => {
    const init = async () => {
      try {
        // Load local data for instant display
        const fileInfo = await FileSystem.getInfoAsync(LOCAL_FILE_PATH);
        if (fileInfo.exists) {
          await loadLocalData();
        } else {
          await copyAssetToFileSystem();
        }

        // Check internet connection
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
        Alert.alert('Error', 'Failed to initialize the app.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Copy fallback data from assets to file system
  const copyAssetToFileSystem = async () => {
    if (assetCopied) return;
    assetCopied = true;

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

  // Load local data from file system
  const loadLocalData = async () => {
    try {
      const file = await FileSystem.readAsStringAsync(LOCAL_FILE_PATH);
      const parsed = JSON.parse(file);
      console.log('✅ Loaded from local file.', parsed);

      const normalizedData = Array.isArray(parsed)
        ? parsed
        : parsed.data || [];

      setData(normalizedData);
    } catch (e) {
      console.log('❌ No local file. Copying from fallback asset...');
      Alert.alert('Error', 'Failed to load data from local file. Using fallback data.');
      await copyAssetToFileSystem();
    }
  };

  // Fetch data from the API and cache it locally
  const fetchFromAPI = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');

      const res = await axios.get(`${EXPO_PUBLIC_URL}/content/get-all-content-item?Language=en`, {
        headers: {
          Accept: '*/*',
          Authorization: `Bearer ${token}`,
        },
      });

      const apiData = res.data.data || res.data;
      console.log('apiData', res.data);
      setData(apiData);

      await FileSystem.writeAsStringAsync(LOCAL_FILE_PATH, JSON.stringify(apiData));
      console.log('🌐 Data fetched from API and cached.');
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
      backgroundColor: '#F6F6FF',
      paddingHorizontal: 24,
      paddingTop: 60,
      direction: isRTL ? 'rtl' : 'ltr'
    },
    backButton: {
      position: 'absolute',
      top: 60,
      left: isRTL ? undefined : 24,
      right: isRTL ? 24 : undefined,
      zIndex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: '#6B7280',
    },
    noDataContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    noDataText: {
      fontSize: 16,
      color: '#6B7280',
      textAlign: 'center',
    },
    cardList: {
      paddingTop: 80,
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
      textAlign: isRTL ? 'right' : 'left',
    },
    summary: {
      fontSize: 14,
      color: '#374151',
      marginBottom: 10,
      textAlign: isRTL ? 'right' : 'left',
    },
    subsummary: {
      fontSize: 13,
      color: '#6B7280',
      marginBottom: 6,
      textAlign: isRTL ? 'right' : 'left',
    },
    meta: {
      fontSize: 12,
      color: '#6B7280',
      textAlign: isRTL ? 'right' : 'left',
    },
    tagsContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    tag: {
      backgroundColor: '#E0E7FF',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: isRTL ? 0 : 6,
      marginLeft: isRTL ? 6 : 0,
      marginTop: 6,
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

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={safeNavigateBack}>
        <Ionicons 
          name={isRTL ? "chevron-back" : "chevron-forward"} 
          size={24} 
          color="black" 
        />
      </TouchableOpacity>

      {/* Content List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
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
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No data available.</Text>
            </View>
          )}

          <View style={styles.nextButtonContainer}>
            <TouchableOpacity style={styles.button} onPress={safeNavigateNext}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const screenWidth = Dimensions.get('window').width;