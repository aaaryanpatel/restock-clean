import React, { useEffect } from "react";
import { View,Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2000); // 2 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Feather name="box" style={styles.title} size={30} color="#111" />
      <Text style={styles.title}>Restock</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white", // Uber-like black
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 16,
  },
  title: {
    color: "#000",
    fontSize: 50,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
