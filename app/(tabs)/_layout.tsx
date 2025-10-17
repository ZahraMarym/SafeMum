import React, { useState, useEffect, useContext } from "react";
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
import { NotificationContext } from "../../src/context/NotificationContext"; // adjust path if needed



const Layout = () => {
  const [loading, setLoading] = useState(true);
  const { unreadCount } = useContext(NotificationContext);
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
          <View style={{ position: "relative" }}>
            <AlertCircle size={30} color={focused ? "#825DEF" : color} />
            {unreadCount?.count > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -5,
                  right: -10,
                  backgroundColor: "#FF3B30",
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>
                  {unreadCount.count > 99 ? "99+" : unreadCount.count}
                </Text>
              </View>
            )}
          </View>
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
