import { View, Image, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import assets from '@/lib/utils/assets';
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
const { width } = Dimensions.get('window');
const screenWidth = Dimensions.get("window").width;
import { TextBold } from "@/components/TextBold";
import i18n from '@/i18n';
import { useState } from 'react';



export default function WelcomeScreen() {
  const router = useRouter();
    const [locale, setLocale] = useState(i18n.locale); // state to trigger re-render

    const changeLanguage = (lang: string) => {
      i18n.locale = lang;
      setLocale(lang); // this triggers a re-render
    };

  return (
    <View style={styles.container}>
      <Image source={assets.appLogo} style={styles.logo} />

      <TextBold style={styles.title}>{i18n.t('appName')}</TextBold>
      <Text style={styles.subtitle}>{i18n.t('subtitle')}</Text>

      <Text style={styles.description}>{i18n.t('description')}</Text>

    <TouchableOpacity
      style={styles.button}
      onPress={() => {
        changeLanguage('ur');
        router.push('/(signin)'); // Navigate to login after language change
      }}
    >
      <TextBold style={styles.buttonText}>{i18n.t('getStarted')}</TextBold>
      <Ionicons name="arrow-forward" size={25} color="#fff" style={styles.icon} />
    </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: width * 0.35,
    height: width * 0.35,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    fontSize: 35,
    color: '#A78BFA',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 19,
    fontWeight: '500',
    color: '#C4B5FD',
    textAlign: 'center',
  },
  description: {
    marginTop: 90,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 24,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  button: {
       flexDirection: "row",
          width: screenWidth * 0.6,
    marginTop: 16,
    width: screenWidth * 0.8,
    backgroundColor: '#A78BFA',
    paddingVertical: 14,
    justifyContent:"center",
    alignItems:"center",
    paddingHorizontal: 40,
    borderRadius: 14,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  icon: {
      marginLeft: 10,
    },
});
