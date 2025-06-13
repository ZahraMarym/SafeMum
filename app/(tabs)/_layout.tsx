import React, { useState, useEffect } from "react";
import { AppState, Image, View } from "react-native";
import { Tabs } from "expo-router";
import { Redirect } from "expo-router";
import {
  Baby,
  AlertCircle,
  House,
  Users,
  Settings,
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
      initialRouteName="(home)"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 100,
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
          borderColor:"#d8d8d8",
          position: "relative",
          zIndex: 100,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        },
        tabBarActiveTintColor: "#825DEF",
        tabBarInactiveTintColor: "#484C52",
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="(track)"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Baby size={32} color={focused ? "#825DEF" : color} />
          ),
        }}
      />

      {/* Bookings Tab */}
      <Tabs.Screen
        name="(alerts)"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AlertCircle size={30} color={focused ? "#825DEF" : color} />
          ),
        }}
      />

      {/* Map Icon (Centered) */}
      <Tabs.Screen
        name="(home)"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                position: "absolute",
                backgroundColor: "#825DEF",
                width: 80,
                height: 80,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 100,
                top: -60,
              }}
            >
               <House size={36} color={focused ? "#fff" : "#fff"} />
            </View>
          ),
        }}
      />

      {/* Alerts Tab */}
      <Tabs.Screen
        name="(community)"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Users size={30} color={focused ? "#825DEF" : color} />
          ),
        }}
      />

      {/* Settings Tab */}
      <Tabs.Screen
        name="(setting)"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Settings size={30} color={focused ? "#825DEF" : color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default Layout;
