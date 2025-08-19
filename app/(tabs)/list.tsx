import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Keyboard,
  Alert,
  Animated,
} from "react-native";
import { GestureHandlerRootView, Swipeable, RectButton } from "react-native-gesture-handler";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

type Item = { id: string; text: string; qty: string };

export default function ListScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // Parse any items passed via route params (from the camera screen).
  // Keep it defensive so a bad payload just results in an empty list.
  const incoming: Item[] = useMemo(() => {
    try {
      if (!params.items) return [];
      const parsed = JSON.parse(params.items as string) as {
        id: string;
        text: string;
        input?: string;
      }[];
      return (parsed || []).map((p) => ({
        id: String(p.id ?? Date.now()),
        text: String(p.text ?? "").trim(),
        qty: String(p.input ?? ""),
      }));
    } catch {
      return [];
    }
  }, [params.items]);

  const [items, setItems] = useState<Item[]>([]);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const nameRefs = useRef<Record<string, TextInput | null>>({});

  // Merge new items into state while de-duping by lowercased text.
  useEffect(() => {
    if (!incoming.length) return;
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.text.toLowerCase()));
      const add = incoming.filter((i) => {
        const key = i.text.toLowerCase();
        if (!i.text || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return [...prev, ...add];
    });
  }, [incoming]);

  // Insert a blank row at the top and focus its name field.
  const addManual = () => {
    const id = String(Date.now());
    const newItem: Item = { id, text: "", qty: "" };
    setItems((p) => [newItem, ...p]);
    setTimeout(() => nameRefs.current[id]?.focus(), 50);
  };

  const deleteItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const onChangeQty = (id: string, v: string) => /^\d*$/.test(v) && setItems((p) => p.map((i) => (i.id === id ? { ...i, qty: v } : i)));
  const onChangeName = (id: string, v: string) => setItems((p) => p.map((i) => (i.id === id ? { ...i, text: v } : i)));
  const copyName = async (t: string) => (t.trim() ? Clipboard.setStringAsync(t.trim()) : Alert.alert("Nothing to copy"));

  // Right-swipe action: animated "Delete" button that feels native on iOS.
  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, id: string) => {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
    return (
      <RectButton style={styles.deleteWrap} onPress={() => deleteItem(id)}>
        <Animated.View style={[styles.deleteInner, { transform: [{ scale }] }]}>
          <Ionicons name="trash-outline" size={26} color="#fff" />
          <Text style={styles.deleteTxt}>Delete</Text>
        </Animated.View>
      </RectButton>
    );
  };

  // Single row renderer: index number, editable name, qty field, and quick copy button.
  const renderItem = ({ item, index }: { item: Item; index: number }) => (
    <Swipeable
      overshootRight={false}
      renderRightActions={(progress) => renderRightActions(progress, item.id)}
    >
      <View style={styles.rowCard}>
        <Text style={styles.indexTxt}>{index + 1}.</Text>

        <TextInput
          ref={(r) => (nameRefs.current[item.id] = r)}
          style={styles.nameBox}
          value={item.text}
          placeholder="Product name"
          placeholderTextColor="#a0a0a0"
          onChangeText={(t) => onChangeName(item.id, t)}
          numberOfLines={1}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        <TextInput
          ref={(r) => (inputRefs.current[item.id] = r)}
          style={styles.qty}
          value={item.qty}
          placeholder="Qty"
          placeholderTextColor="#cfcfd3"
          keyboardType="number-pad"
          maxLength={4}
          onChangeText={(t) => onChangeQty(item.id, t)}
        />

        <TouchableOpacity style={styles.copyBtn} onPress={() => copyName(item.text)}>
          <Ionicons name="copy-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* Top bar: add item, title, spacer for symmetry */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.plusWrap} onPress={addManual}>
            <Ionicons name="add" size={20} color="#2b6be6" />
          </TouchableOpacity>
          <Text style={styles.title}>Scanned Items</Text>
          <View style={{ width: 44 }} />
        </View>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28 }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListEmptyComponent={<Text style={styles.empty}>No items yet — scan or tap +</Text>}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </GestureHandlerRootView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  plusWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef3ff",
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 32,
    fontWeight: "800",
    color: "#000",
    letterSpacing: 0.5,
  },

  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d9d9dc",
    borderRadius: 22,
    paddingLeft: 18,
    paddingRight: 12,
    height: 88,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
  },
  indexTxt: { fontSize: 22, fontWeight: "800", color: "#0b0c10", marginRight: 12 },

  nameBox: { flex: 1, fontSize: 20, color: "#0f172a", marginRight: 12 },

  qty: {
    width: 110,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f4f5f7",
    textAlign: "center",
    fontSize: 18,
    color: "#111827",
    marginRight: 10,
  },

  copyBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f1f2f4",
    alignItems: "center",
    justifyContent: "center",
  },

  // iOS-style swipe-to-delete: rounded red pill with a little elevation.
  deleteWrap: {
    width: 116,
    marginVertical: 2,
    backgroundColor: "#ff3b30", // iOS system red
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    // slight shadow for depth
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    marginLeft:-12
  },
  deleteInner: { alignItems: "center", justifyContent: "center", gap: 6 },
  deleteTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  empty: { textAlign: "center", color: "#8b8d93", marginTop: 24, fontSize: 16 },
});
