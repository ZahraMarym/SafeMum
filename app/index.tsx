import React from "react";
import { View, StyleSheet } from "react-native";
import SplashScreen from "@/screens/SplashScreen";
import '@react-native-firebase/app';

export default function App() {
  return (
      <View style={styles.container}>
        <SplashScreen />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
