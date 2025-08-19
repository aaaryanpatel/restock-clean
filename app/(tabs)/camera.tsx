import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

// Public Vision API key is read from env at build/runtime
const VISION_KEY = process.env.EXPO_PUBLIC_VISION_KEY ?? "";

// Pull a product-looking name out of raw OCR text.
// Heuristics: drop money/units/UPC-ish lines, favor lines with more letters than digits.
function extractProductName(raw: string) {
  const lines = (raw || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const BAD = ["retail price","unit price","per ounce","price","oz","ounce","g","kg","lb","ct","pk","barcode","upc"];
  const MONEY = /[$€£₹]|\b\d+\.\d{2}\b/; const UPC = /\b\d{8,13}\b/;
  const cleaned = lines
    .filter(l => {
      const lc = l.toLowerCase();
      if (BAD.some(w => lc.includes(w))) return false;
      if (MONEY.test(l)) return false;
      if (UPC.test(l)) return false;
      const letters = (l.match(/[a-z]/gi) || []).length;
      const digits = (l.match(/\d/g) || []).length;
      return letters > digits;
    })
    .map(l => l.replace(/\b\d+(\.\d+)?\s?(oz|ounce|ounces|g|kg|lb|lbs|ct|pk)\b/gi, "")
               .replace(/\$?\d+(\.\d{2})?/g, "")
               .replace(/[^a-z0-9 &\-'/]/gi, " ")
               .replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);
  if (!cleaned.length) return "";
  cleaned.sort((a,b)=> b.replace(/[^a-z]/gi,"").length - a.replace(/[^a-z]/gi,"").length);
  return cleaned[0].replace(/\b([a-z])/g, m => m.toUpperCase());
}

type Item = { id: string; text: string; input: string };

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isBusy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionTitle}>Camera permission needed</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryTxt}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takeAndOcr = async () => {
    if (isBusy || !cameraRef.current) return;
    try {
      setBusy(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // subtle haptic so the shutter feels responsive

      // 1) Capture a quick photo
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.01, // tiny file for speed; accuracy is improved later by resize
                       // Note: quality should not be this much low 
                       // TODO: look for better solution
        skipProcessing: true,
      });

      // 2) Crop to the on-screen orange frame (convert relative box → absolute px)
      //    The frame is centered: width 86% × height 42% of the captured image.
      const rw = 0.86, rh = 0.42, rx = (1 - rw) / 2, ry = (1 - rh) / 2;
      const width = photo.width ?? 0;
      const height = photo.height ?? 0;

      const crop = {
        originX: Math.round(width * rx),
        originY: Math.round(height * ry),
        width:   Math.round(width * rw),
        height:  Math.round(height * rh),
      };

      // 3) Crop, downscale, and produce base64 for the OCR request
      const cropped = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          { crop },
          { resize: { width: 1200 } }, // smaller upload with good-enough detail
        ],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // Dev safety: if no API key configured, stop here with a friendly message.
      if (!VISION_KEY) {
        Alert.alert("Captured", "Add EXPO_PUBLIC_VISION_KEY to run OCR.");
        setBusy(false);
        return;
      }

      // 4) Send OCR request (TEXT_DETECTION is the fast path)
      const body = {
        requests: [{ image: { content: cropped.base64 }, features: [{ type: "TEXT_DETECTION" }] }],
      };
      const res = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const data = await res.json();

      // Prefer fullTextAnnotation; fall back to the first textAnnotation if needed.
      let parsed = data?.responses?.[0]?.fullTextAnnotation?.text
        ?? data?.responses?.[0]?.textAnnotations?.[0]?.description
        ?? "";

      const nameOnly = extractProductName(parsed) || parsed.trim();

      if (nameOnly) {
        setItems(prev => [...prev, { id: Date.now().toString(), text: nameOnly, input: "" }]);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // success haptic
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("No text found", "Try aligning the name inside the frame.");
      }
    } catch (e) {
      console.log("takeAndOcr error:", e);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Could not capture/recognize.");
    } finally {
      setBusy(false); // always release the busy flag
    }
  };

  return (
    <View style={styles.container}>
      {/* Live camera preview as the background */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={"back" as CameraType}
        isActive
      />

      {/* Dimmed overlay with the orange scan frame */}
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.frame} />
      </View>

      {/* Top bar */}
      <View style={styles.header}>
        <Text style={styles.title}>Restock</Text>
        <TouchableOpacity onPress={() => router.push("/about")} style={styles.circleBtn}>
          <Ionicons name="help-circle-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom controls: open list + shutter */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push({ pathname: "/list", params: { items: JSON.stringify(items) } })}
        >
          <Ionicons name="list" size={16} color="#fff" />
          <Text style={styles.secondaryTxt}>Show List</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shutter} onPress={takeAndOcr} disabled={isBusy}>
          {isBusy ? <ActivityIndicator color="#111" /> : null}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ---------------- Styles ---------------- */
// TODO: move the styles into a separate file later.

const ORANGE = "#ff7a00";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  permissionTitle: { color: "#fff", fontSize: 18, marginBottom: 16 },
  primaryBtn: { backgroundColor: "#2563eb", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  primaryTxt: { color: "#fff", fontWeight: "600" },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: "86%",
    height: "42%",
    borderRadius: 20,
    borderWidth: 3,
    borderColor: ORANGE,
    backgroundColor: "rgba(0,0,0,0.12)",
  },

  header: {
    position: "absolute",
    top: 56, left: 20, right: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  circleBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  bottom: { position: "absolute", bottom: 40, left: 20, right: 20, alignItems: "center", gap: 16 },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, backgroundColor: "rgba(0,0,0,0.55)",
  },
  secondaryTxt: { color: "#fff", fontSize: 14, fontWeight: "600" },

  shutter: {
    width: 73, height: 72, borderRadius: 36,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
});
