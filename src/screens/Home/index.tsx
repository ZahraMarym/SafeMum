import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  I18nManager,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import * as Updates from 'expo-updates';
import { useRouter } from 'expo-router';
import i18n from '@/i18n';
import fallbackData from '../../../assets/data/fallBackData.json';
import fallbackData2 from '../../../assets/data/fallBackData2.json';
import { Text } from '@/components/Text';

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

const LOCAL_FILE_PATH = FileSystem.documentDirectory + 'app-data.json';

export default function LoginScreen() {
  const router = useRouter();
  const [locale, setLocale] = useState(i18n.locale);
  const [data, setData] = useState(null);

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

  // 🧠 Load data from local file
  const loadLocalData = async () => {
    try {
      const file = await FileSystem.readAsStringAsync(LOCAL_FILE_PATH);
      setData(JSON.parse(file));
      console.log("✅ Loaded from local storage.");
    } catch {
      setData(fallbackData);
      console.log("📦 Using fallback JSON.");
    }
  };

  // 🔁 Fetch + replace local file
//   const fetchAndCacheData = async () => {
//     try {
//       const res = await fetch('https://your-api-endpoint.com/data');
//       const json = await res.json();
//       await FileSystem.writeAsStringAsync(LOCAL_FILE_PATH, JSON.stringify(json));
//       setData(json);
//       console.log("🌐 Fetched and saved new data.");
//     } catch (e) {
//       console.warn("⚠️ Failed to fetch online data:", e);
//       await loadLocalData();
//     }
//   };


const fetchAndCacheData = async () => {
  try {
    // Simulate fetch with file2
    const json = fallbackData2;
    await FileSystem.writeAsStringAsync(LOCAL_FILE_PATH, JSON.stringify(json));
    setData(json);
    console.log("📁 Simulated 'download' from file2.json and cached.");
  } catch (e) {
    console.warn("⚠️ Failed to simulate fetch:", e);
    await loadLocalData();
  }
};



  useEffect(() => {
    const init = async () => {
      const netState = await NetInfo.fetch();
      if (netState.isConnected && netState.isInternetReachable) {
        await fetchAndCacheData();
      } else {
        await loadLocalData();
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
       {data ? (
         data.map((item, index) => (
           <View key={index} style={styles.card}>
             {/* Image */}
             {item.imageUrl && (
               <Image
                 source={{ uri: item.imageUrl }}
                 style={styles.cardImage}
                 resizeMode="cover"
               />
             )}

             {/* Title */}
             <Text style={styles.title}>{item.title}</Text>

             {/* Summary */}
             <Text style={styles.summary}>{item.summary}</Text>

             {/* Category & Audience */}
             <View style={styles.metaRow}>
               <Text style={styles.meta}>📂 {item.category}</Text>
               <Text style={styles.meta}>👶 {item.audience}</Text>
             </View>

             {/* Tags */}
             <View style={styles.tagsContainer}>
               {item.tags?.map((tag, tagIndex) => (
                 <View key={tagIndex} style={styles.tag}>
                   <Text style={styles.tagText}>#{tag}</Text>
                 </View>
               ))}
             </View>
           </View>
         ))
       ) : (
         <Text>Loading data...</Text>
       )}
     </ScrollView>
    </View>
  );
}

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
    padding: 20,
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

  summary: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 10,
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

});
