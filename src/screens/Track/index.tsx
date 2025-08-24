import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  I18nManager,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useSelector, useDispatch } from 'react-redux'; // Import hooks for redux
import i18n from '@/i18n';
import { Text } from '@/components/Text';
import { TextBold } from '@/components/TextBold';
import { Video, ResizeMode } from 'expo-av'; // Use the Video component from expo-av
import { setLanguage } from '@/redux/slice/languageSlice'; // Import action from your language slice
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

// Import video assets for both languages and trimetsters
import t1en from '../../../assets/videos/eng/trimester1.mp4';
import t2en from '../../../assets/videos/eng/trimester2.mp4';
import t3en from '../../../assets/videos/eng/trimester3.mp4';
import t1ur from '../../../assets/videos/ur/trimester1.mp4';
import t2ur from '../../../assets/videos/ur/trimester2.mp4';
import t3ur from '../../../assets/videos/ur/trimester3.mp4';

// Map video assets based on language and trimester
const VIDEO_ASSETS: Record<'en' | 'ur', Record<'1' | '2' | '3', any[]>> = {
  en: {
    '1': [t1en, t2en], // Multiple videos for trimester 1
    '2': [t2en],
    '3': [t3en]
  },
  ur: {
    '1': [t1ur, t2ur], // Multiple videos for trimester 1
    '2': [t2ur],
    '3': [t3ur]
  },
};

export default function HomeScreen() {
  const dispatch = useDispatch();
    const router = useRouter();


  // Get the language from the redux store
  const locale = useSelector((state) => state.language.language); // Access the language slice

  const [tri, setTri] = useState<'1' | '2' | '3'>('1');

  // Select the correct video asset based on language and trimester
  const currentAssets = useMemo(() => {
    const lang: 'en' | 'ur' = locale === 'ur' ? 'ur' : 'en';
    return VIDEO_ASSETS[lang][tri];
  }, [locale, tri]);

  // Language change function
  const changeLanguage = async (lang: 'en' | 'ur') => {
    // Dispatch the action to change language in redux store
    dispatch(setLanguage(lang));
    i18n.locale = lang;
    const rtl = lang === 'ur';
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
      await Updates.reloadAsync();
    }
  };

  // Labels for language-specific text
  const L = useMemo(() => {
    const ur = locale === 'ur';
    return {
      back: ur ? 'واپس' : 'Back',
      choose: ur ? 'ٹرائمسٹر منتخب کریں' : 'Select Trimester',
      t1: ur ? 'پہلا ٹرائمسٹر' : 'Trimester 1',
      t2: ur ? 'دوسرا ٹرائمسٹر' : 'Trimester 2',
      t3: ur ? 'تیسرا ٹرائمسٹر' : 'Trimester 3',
      langToggle: ur ? 'English' : 'اردو',
    };
  }, [locale]);

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons
          name="chevron-forward"
          size={24}
          color="black"
          style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
        />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingTop: 100, paddingBottom: 40 }}>
        {/* Header */}
        <TextBold style={styles.title}>{L.choose}</TextBold>

        {/* Language toggle */}
        <TouchableOpacity onPress={() => changeLanguage(locale === 'ur' ? 'en' : 'ur')} style={styles.langBtn}>
          <Ionicons name="language" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.langBtnText}>{L.langToggle}</Text>
        </TouchableOpacity>

        {/* Trimester Dropdown */}
        <View style={[styles.pickerWrap, isRTL && styles.pickerWrapRtl]}>
          <Picker
            selectedValue={tri}
            onValueChange={(v) => setTri(v)}
            mode="dropdown"
            style={[styles.picker, isRTL && styles.pickerRtl]}
            dropdownIconColor="#6B7280"
          >
            <Picker.Item label={L.t1} value="1" />
            <Picker.Item label={L.t2} value="2" />
            <Picker.Item label={L.t3} value="3" />
          </Picker>
        </View>

        {/* Video */}
        <View style={styles.videoCard}>
          {currentAssets.map((asset, index) => (
              <Video
                          key={index}
                          style={styles.video}
                          source={asset} // Dynamic video based on language and trimester
                          useNativeControls
                          shouldPlay={index === 0} // Only play the first video by default
                          resizeMode={ResizeMode.CONTAIN} // Adjust video to fit screen while preserving aspect ratio
                        />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6FF',
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: isRTL ? undefined : 24,
    right: isRTL ? 24 : undefined,
    zIndex: 10,
  },

  title: {
    fontSize: 22,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },

  langBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#A78BFA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  langBtnText: {
    color: '#fff',
    fontSize: 14,
  },

  pickerWrap: {
      height:60,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  pickerWrapRtl: {
    transform: [{ scaleX: -1 }],
  },
  picker: {
    height: 58,
    color: '#111827',
  },
  pickerRtl: {
    transform: [{ scaleX: -1 }],
  },

  videoCard: {
    marginTop: 18,
    borderRadius: 16,
    padding:20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  video: {
    width: screenWidth - 48,
    aspectRatio: 16 / 9,
    margin:10,
    backgroundColor: '#000',
  },
});
