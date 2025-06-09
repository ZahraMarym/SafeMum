import React from "react";
import { View, StyleSheet } from "react-native";
import SplashScreen from "@/screens/SplashScreen";


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
