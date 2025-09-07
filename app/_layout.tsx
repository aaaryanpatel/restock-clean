
import "react-native-gesture-handler"; // must be first
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Drawer } from "expo-router/drawer";
import SplashScreen from "./SplashScreen"; // adjust path if yours differs
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) {
    return (
      <SafeAreaProvider style={{ backgroundColor: colors.background }}>
        <SplashScreen />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerStyle: { width: 300, backgroundColor: colors.background },
          drawerLabelStyle: { fontSize: 18, color: colors.text },
          swipeEnabled: true,
          swipeEdgeWidth: 40,
        }}
      >
        {/* Your tab navigator lives inside (tabs) */}
        <Drawer.Screen name="(tabs)" options={{ drawerLabel: "Home" }} />
        <Drawer.Screen name="about" options={{ drawerLabel: "About" }} />
        <Drawer.Screen name="privacy"  options={{ drawerLabel: "Privacy" }} />
        
      </Drawer>
      
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}


