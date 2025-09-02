import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  I18nManager,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useDispatch, useSelector } from 'react-redux';
import { setLanguage } from "@/redux/slice/languageSlice";
import { TextBold } from '@/components/TextBold';
import { Text } from '@/components/Text';
import { useRouter } from 'expo-router';
import i18n from '@/i18n';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const isRTL = I18nManager.isRTL;

export default function SettingsScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentLanguage = useSelector((state) => state.language.language);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // Set the initial language based on Redux state
  useEffect(() => {
    i18n.locale = currentLanguage;
    const rtl = currentLanguage === 'ur';
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
    }
  }, [currentLanguage]);

  // Change language and update Redux state
  const changeLanguage = async (lang: string) => {
    setLanguageModalVisible(false); // close modal
    i18n.locale = lang;
    dispatch(setLanguage(lang));

    const rtl = lang === 'ur';
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
      await Updates.reloadAsync();
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_URL}/users/logout`,
        {},
        {
          headers: {
            accept: '/',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        await SecureStore.deleteItemAsync('accessToken');
        Alert.alert(i18n.t('logout'), i18n.t('loggedOutMessage'));
        router.push('/(signin)');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert(i18n.t('error'), i18n.t('failedToLogout'));
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-forward" size={24} color="black" />
      </TouchableOpacity>

      {/* Title */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        <TextBold style={styles.title}>{i18n.t('settings')}</TextBold>
      </View>

      {/* Language Preference Card */}
      <TouchableOpacity style={styles.cardButton} onPress={() => setLanguageModalVisible(true)}>
        <View style={styles.cardContent}>
          <View>
            <TextBold style={styles.cardTitle}>{i18n.t('language')}</TextBold>
            <Text style={styles.cardSubtitle}>
              {currentLanguage === 'en' ? i18n.t('english') : i18n.t('urdu')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#000" />
        </View>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.cardButton} onPress={logout}>
        <View style={styles.cardContent}>
          <TextBold style={styles.cardTitle}>{i18n.t('logout')}</TextBold>
          <Ionicons name="chevron-forward" size={20} color="#000" />
        </View>
      </TouchableOpacity>

      {/* Language Modal */}
      <Modal
        transparent={true}
        visible={languageModalVisible}
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TextBold style={styles.modalTitle}>{i18n.t('selectLanguage')}</TextBold>

            {/* English Option */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => changeLanguage('en')}
            >
              <Text style={styles.modalOptionText}>{i18n.t('english')}</Text>
            </TouchableOpacity>

            {/* Urdu Option */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => changeLanguage('ur')}
            >
              <Text style={styles.modalOptionText}>{i18n.t('urdu')}</Text>
            </TouchableOpacity>

            {/* Cancel Option */}
            <TouchableOpacity
              style={[styles.modalOption, { borderTopWidth: 1, borderColor: '#E0E0E0' }]}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={[styles.modalOptionText, { color: 'red' }]}>{i18n.t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    left: isRTL ? 24 : undefined,
    right: isRTL ? undefined : 24,
    transform: [{ scaleX: isRTL ? -1 : 1 }],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  cardButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000',
  },
});
