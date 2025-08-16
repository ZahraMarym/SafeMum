import React, { useState, useEffect } from "react";
import { AppState, View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import {
  House,
  Users,
  Database,  // Use Database icon for User Data
} from "lucide-react-native";

const Layout = () => {
  const [loading, setLoading] = useState(true);

  // Check token when the app state changes (e.g., resumes from background)
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      checkAuth();
    }
  });

  return (
    <Tabs
      initialRouteName="(admin-home)"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBarStyle,
      }}
    >
      {/* Home Icon (Centered) */}
      <Tabs.Screen
        name="(admin-home)"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <House size={30} color={focused ? "#825DEF" : color}  />
          ),
        }}
      />

      {/* User Data Tab with Database Icon */}
      <Tabs.Screen
        name="(user-data)"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Database size={30} color={focused ? "#825DEF" : color} />
          ),
        }}
      />

      {/* Admin Community Tab with Users Icon */}
      <Tabs.Screen
        name="(admin-community)"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Users size={30} color={focused ? "#825DEF" : color} />
          ),
        }}
      />
    </Tabs>
  );
};

// Define styles for the tab bar and icons
const styles = StyleSheet.create({
  tabBarStyle: {
    height: 120,
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    backgroundColor: "white",
    borderTopWidth: 2,
    borderColor: "#d8d8d8",
    position: "relative",
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  centeredIconContainer: {
    position: "absolute",
    backgroundColor: "#825DEF",
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 100,
    top: -60, // Adjust the vertical positioning to center it
    zIndex: 100,
  },
});

export default Layout;
