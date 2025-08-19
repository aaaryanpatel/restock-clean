
import "react-native-gesture-handler"; // must be first
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Drawer } from "expo-router/drawer";
import SplashScreen from "./SplashScreen"; 

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerStyle: { width: 300 },
          drawerLabelStyle: { fontSize: 18 },
          swipeEnabled: true,
          swipeEdgeWidth: 40,
        }}
      >
        {/* Your tab navigator lives inside (tabs) */}
        <Drawer.Screen name="(tabs)" options={{ drawerLabel: "Home" }} />
        <Drawer.Screen name="about" options={{ drawerLabel: "About" }} />
        <Drawer.Screen name="privacy"  options={{ drawerLabel: "Privacy" }} />
        
      </Drawer>
      
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}


