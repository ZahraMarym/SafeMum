import assets from "@/lib/utils/assets"; // make sure this has your logo path
import React, { useEffect, useRef } from "react";
import { Image, Animated, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import i18n from '@/i18n';


const SplashScreen = () => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current; // for up/down movement
  const router = useRouter();

  useEffect(() => {
    // Looping up/down animation
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

    // Navigate after 5.5 seconds
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        router.push("/(intro)");
      });
    }, 5500);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.Image
        source={assets.appLogo} // 👈 your logo path in assets
        resizeMode="contain"
        style={[
          styles.logo,
          {
            transform: [{ translateY: floatAnim }],
          },
        ]}
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
