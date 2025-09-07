import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

/* ========= Config ========= */
const VISION_KEY = process.env.EXPO_PUBLIC_VISION_KEY ?? ""; // add this in your app config
const ORANGE = "#ff7a00";

/* ========= Types ========= */
type Item = { id: string; text: string; input: string };



/** Pick the centered scan frame (86% width × 42% height) in absolute pixels. */
function getCropBox(imgW: number, imgH: number) {
  const rw = 0.86, rh = 0.42;
  const rx = (1 - rw) / 2, ry = (1 - rh) / 2;
  return {
    originX: Math.round(imgW * rx),
    originY: Math.round(imgH * ry),
    width:   Math.round(imgW * rw),
    height:  Math.round(imgH * rh),
  };
}

/** Resize + crop + return a base64 JPEG that’s friendly for OCR. */
async function manipulateForOcr(uri: string, crop: ImageManipulator.Crop) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      { crop },
      { resize: { width: 1200 } }, // good balance of size/detail
    ],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return result.base64 ?? "";
}

/** Call Google Vision’s TEXT_DETECTION and return the raw recognized text. */
async function callVisionOcr(base64: string, apiKey: string) {
  const body = {
    requests: [{ image: { content: base64 }, features: [{ type: "TEXT_DETECTION" }] }],
  };
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  return (
    data?.responses?.[0]?.fullTextAnnotation?.text ||
    data?.responses?.[0]?.textAnnotations?.[0]?.description ||
    ""
  );
}

/**
 * Extract a product-looking name from raw OCR text with simple, readable rules:
 * - drop money/units/UPC-ish lines
 * - prefer lines with letters over digits
 * - clean up extra symbols
 */
function pickProductName(raw: string) {
  const lines = (raw || "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const BAD_WORDS = [
    "retail price","unit price","per ounce","price",
    "oz","ounce","g","kg","lb","ct","pk","barcode","upc"
  ];
  const MONEY = /[$€£₹]|(?:\b\d+\.\d{2}\b)/;
  const UPC   = /\b\d{8,13}\b/;

  const candidates = lines
    .filter(l => {
      const lc = l.toLowerCase();
      if (BAD_WORDS.some(w => lc.includes(w))) return false;
      if (MONEY.test(l)) return false;
      if (UPC.test(l))   return false;
      const letters = (l.match(/[a-z]/gi) || []).length;
      const digits  = (l.match(/\d/g) || []).length;
      return letters > digits; // favor label-like text
    })
    .map(l =>
      l
        // remove common size units and prices
        .replace(/\b\d+(\.\d+)?\s?(oz|ounce|ounces|g|kg|lb|lbs|ct|pk)\b/gi, "")
        .replace(/\$?\d+(\.\d{2})?/g, "")
        // keep simple punctuation
        .replace(/[^a-z0-9 &\-'/]/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter(Boolean);

  if (!candidates.length) return "";

  // Simple “most letters wins” sorting
  candidates.sort((a, b) =>
    b.replace(/[^a-z]/gi, "").length - a.replace(/[^a-z]/gi, "").length
  );

  // Title-case the winner
  const best = candidates[0];
  return best.replace(/\b([a-z])/g, m => m.toUpperCase());
}

/* ========= Screen ========= */

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isBusy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  // Ask for permission on mount
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

  const handleScan = async () => {
    if (isBusy || !cameraRef.current) return;

    try {
      setBusy(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 1) Take a quick photo
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        // Slightly higher than 0.01 so beginners get reliable results first
        quality: 0.3,
        skipProcessing: true,
      });

      const w = photo.width ?? 0;
      const h = photo.height ?? 0;
      const crop = getCropBox(w, h);

      // 2) Prepare the image for OCR
      const base64 = await manipulateForOcr(photo.uri, crop);

      // 3) If there’s no API key, stop early with a friendly message
      if (!VISION_KEY) {
        Alert.alert("Captured", "Add EXPO_PUBLIC_VISION_KEY to run OCR.");
        return;
      }

      // 4) Call Vision OCR
      const rawText = await callVisionOcr(base64, VISION_KEY);

      // 5) Pick a product-like name (fallback: raw text)
      const name = pickProductName(rawText) || rawText.trim();

      if (name) {
        setItems(prev => [...prev, { id: Date.now().toString(), text: name, input: "" }]);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("No text found", "Try aligning the name inside the frame.");
      }
    } catch (err) {
      console.log("handleScan error:", err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Could not capture/recognize.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Live camera preview as the background */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={"back" as CameraType}
        active
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
          onPress={() =>
            router.push({ pathname: "/list", params: { items: JSON.stringify(items) } })
          }
        >
          <Ionicons name="list" size={16} color="#fff" />
          <Text style={styles.secondaryTxt}>Show List</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shutter} onPress={handleScan} disabled={isBusy}>
          {isBusy ? <ActivityIndicator color="#111" /> : null}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ========= Styles ========= */
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
