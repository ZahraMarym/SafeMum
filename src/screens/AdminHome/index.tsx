import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import i18n from '@/i18n';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;
const isRTL = I18nManager.isRTL;

export default function LoginScreen() {
  const router = useRouter();
  const [locale, setLocale] = useState(i18n.locale);
  const [email, setEmail] = useState("")

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

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="black" />
      </TouchableOpacity>
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

});
