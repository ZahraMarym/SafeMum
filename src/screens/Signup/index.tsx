import { View, Image, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import assets from '@/lib/utils/assets';
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
const { width } = Dimensions.get('window');
const screenWidth = Dimensions.get("window").width;
import { TextBold } from "@/components/TextBold";

export default function Signup() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image source={assets.appLogo} style={styles.logo} />

      <TextBold style={styles.title}>Signup</TextBold>
    =
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
    fontSize: 32,
    color: '#A78BFA',
    marginTop: 8,
    letterSpacing: 0.3,
  },

});
