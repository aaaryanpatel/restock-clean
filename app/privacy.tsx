// app/privacy.tsx

import React from "react";
import { View, Text, StyleSheet, ScrollView, Linking, Alert, Pressable, useColorScheme } from "react-native";
import { Colors } from '../constants/Colors';

export default function PrivacyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleEmailPress = () => {
    Linking.openURL("mailto:restock.app.official@gmail.com").catch(() =>
      Alert.alert("Error", "Could not open your mail app.")
    );
  };

  const styles = StyleSheet.create({
    container: {
      paddingTop: 56,
      paddingBottom: 32,
      paddingHorizontal: 26,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    heading: {
      fontSize: 28,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 4,
      color: colors.text,
    },
    subheading: {
      fontSize: 14,
      color: colors.tabIconDefault,
      textAlign: "center",
      marginBottom: 30,
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "600",
      marginBottom: 7,
      color: colors.primary,
      letterSpacing: 0.1,
    },
    text: {
      fontSize: 15.3,
      color: colors.text,
      lineHeight: 23,
      marginLeft: 0,
      marginBottom: 0,
    },
    bold: {
      fontWeight: "bold",
      color: colors.text,
    },
    bullet: {
      fontWeight: "bold",
      color: colors.primary,
      fontSize: 16,
    },
    email: {
      fontWeight: "500",
      color: colors.primary,
    },
    footer: {
      textAlign: "center",
      color: colors.tabIconDefault,
      fontSize: 13,
      marginTop: 18,
      fontStyle: "italic",
      letterSpacing: 0.1,
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Privacy Policy</Text>
      <Text style={styles.subheading}>Last updated: August 2025</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What We Collect</Text>
        <Text style={styles.text}>
          <Text style={styles.bold}>• Scanned text & images:</Text> Everything you scan or enter stays on your device only.{"\n"}
          <Text style={styles.bold}>• App info:</Text> We might use anonymous info like device type or app usage to improve Restock.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How We Use It</Text>
        <Text style={styles.text}>
          <Text style={styles.bullet}>•</Text> To scan and list product tags for you.{"\n"}
          <Text style={styles.bullet}>•</Text> To make the app better and fix bugs.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security & Storage</Text>
        <Text style={styles.text}>
          <Text style={styles.bold}>• Local only:</Text> Your list, scans, and inputs are never sent to us—they stay on your phone.{"\n"}
          <Text style={styles.bold}>• OCR:</Text> Images may be sent securely to our OCR provider (like Google Cloud Vision) to get the text. No personal data is ever sold or shared.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Choices</Text>
        <Text style={styles.text}>
          <Text style={styles.bullet}>•</Text> Delete the app to erase your data.{"\n"}
          <Text style={styles.bullet}>•</Text> Manage permissions anytime in device settings.
        </Text>
      </View>

      {/* 4. Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Questions?</Text>
        <Pressable onPress={handleEmailPress}>
          <Text style={[styles.text, styles.email]}>
            restock.app.official175@gmail.com
          </Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>By using Restock, you agree to this policy.</Text>
    </ScrollView>
  );
}

