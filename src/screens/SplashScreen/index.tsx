import assets from "@/lib/utils/assets";
import React, { useEffect, useRef } from "react";
import { Image, Animated, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";

const SplashScreen = () => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // After 5.5s, fade out then check internet and navigate
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(async () => {
        const state = await NetInfo.fetch();
        const isConnected = state.isConnected && state.isInternetReachable;

        if (isConnected) {
          router.replace("/(signin)"); // ✅ Online: go to login
        } else {
          router.replace("/(tabs)/(home)"); // 🚫 Offline: go to home
        }
      });
    }, 5500);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.Image
        source={assets.appLogo}
        resizeMode="contain"
        style={[styles.logo, { transform: [{ translateY: floatAnim }] }]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 100,
  },
});

export default SplashScreen;
