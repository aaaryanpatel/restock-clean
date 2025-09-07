import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { GestureHandlerRootView, RectButton, Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";

type Item = { id: string; text: string; qty: string };

/* ---------------- Helpers (readable and tiny) ---------------- */

function parseIncoming(raw: unknown): Item[] {
  try {
    if (!raw) return [];
    const parsed = JSON.parse(String(raw)) as { id?: string; text?: string; input?: string }[];
    return (parsed || []).map((p) => ({
      id: String(p.id ?? Date.now()),
      text: String(p.text ?? "").trim(),
      qty: String(p.input ?? ""),
    }));
  } catch {
    return [];
  }
}

function mergeDedup(prev: Item[], incoming: Item[]) {
  const seen = new Set(prev.map((i) => i.text.toLowerCase()));
  const add = incoming.filter((i) => {
    const key = i.text.toLowerCase();
    if (!i.text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...prev, ...add];
}

export default function ListScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const incoming = useMemo(() => parseIncoming(params.items), [params.items]);

  const [items, setItems] = useState<Item[]>([]);
  const [showScanButton, setShowScanButton] = useState(true);

  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const nameRefs = useRef<Record<string, TextInput | null>>({});

  // styles at the end; memoize here so it updates when theme changes
  const styles = useMemo(() => createStyles(colors), [colors]);

  /* ---------------- Effects ---------------- */

  // Merge new incoming items (dedup by name). Hide scan button if any were added.
  useEffect(() => {
    if (!incoming.length) return;
    setItems((prev) => mergeDedup(prev, incoming));
    if (incoming.length > 0) setShowScanButton(false);
  }, [incoming]);

  /* ---------------- Actions ---------------- */

  const addManual = () => {
    const id = String(Date.now());
    const newItem: Item = { id, text: "", qty: "" };
    setItems((p) => [newItem, ...p]);
    setTimeout(() => nameRefs.current[id]?.focus(), 50);
  };

  const deleteItem = (id: string) => {
    setItems((p) => p.filter((i) => i.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onChangeQty = (id: string, v: string) => {
    if (!/^\d*$/.test(v)) return;
    setItems((p) => p.map((i) => (i.id === id ? { ...i, qty: v } : i)));
  };

  const onChangeName = (id: string, v: string) => {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, text: v } : i)));
  };

  const copyName = async (t: string) => {
    const copy = t.trim();
    if (!copy) {
      Alert.alert("Nothing to copy");
      return;
    }
    await Clipboard.setStringAsync(copy);
    Haptics.selectionAsync();
    Alert.alert("Copied", "Item name copied to clipboard");
  };

  const goToCamera = () => router.push("/camera");

  const clearAll = () => {
    Alert.alert("Clear All Items", "Are you sure you want to remove all items from your list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setItems([]);
          setShowScanButton(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  /* ---------------- Render helpers ---------------- */

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    id: string
  ) => {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
    return (
      <RectButton style={styles.deleteWrap} onPress={() => deleteItem(id)}>
        <Animated.View style={[styles.deleteInner, { transform: [{ scale }] }]}>
          <Ionicons name="trash-outline" size={26} color={colors.card} />
          <Text style={styles.deleteTxt}>Delete</Text>
        </Animated.View>
      </RectButton>
    );
  };

  const renderItem = ({ item, index }: { item: Item; index: number }) => (
    <Swipeable overshootRight={false} renderRightActions={(p) => renderRightActions(p, item.id)}>
      <View style={styles.rowCard}>
        <Text style={styles.indexTxt}>{index + 1}.</Text>

        <TextInput
          ref={(r) => (nameRefs.current[item.id] = r)}
          style={styles.nameBox}
          value={item.text}
          placeholder="Product name"
          placeholderTextColor={colors.tabIconDefault}
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
          placeholderTextColor={colors.tabIconDefault}
          keyboardType="number-pad"
          maxLength={4}
          onChangeText={(t) => onChangeQty(item.id, t)}
        />

        <TouchableOpacity style={styles.copyBtn} onPress={() => copyName(item.text)}>
          <Ionicons name="copy-outline" size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>
    </Swipeable>
  );

  /* ---------------- UI ---------------- */

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.plusWrap} onPress={addManual}>
            <Ionicons name="add" size={20} color={colors.card} />
          </TouchableOpacity>
          <Text style={styles.title}>Shopping List</Text>
          {items.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
              <Ionicons name="trash-outline" size={24} color={colors.notification} />
            </TouchableOpacity>
          )}
        </View>

        {/* Item count */}
        {items.length > 0 && (
          <Text style={styles.itemCount}>
            {items.length} {items.length === 1 ? "item" : "items"}
          </Text>
        )}

        {/* Scan button for empty state */}
        {showScanButton && items.length === 0 && (
          <TouchableOpacity style={styles.scanButton} onPress={goToCamera}>
            <Ionicons name="scan-outline" size={24} color="white" />
            <Text style={styles.scanButtonText}>Scan Items</Text>
          </TouchableOpacity>
        )}

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28 }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 50 }}>
              <Ionicons name="cart-outline" size={60} color={colors.tabIconDefault} />
              <Text style={styles.empty}>No items yet — scan products or tap +</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </GestureHandlerRootView>
  );
}

/* ---------------- Styles (moved to the end) ---------------- */

const createStyles = (colors: (typeof Colors)["light"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

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
      backgroundColor: colors.primary,
      marginRight: 8,
    },
    title: {
      flex: 1,
      fontSize: 32,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.5,
    },
    clearBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },

    rowCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 22,
      paddingLeft: 18,
      paddingRight: 12,
      height: 88,
      shadowColor: colors.text,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
    },
    indexTxt: { fontSize: 22, fontWeight: "800", color: colors.text, marginRight: 12 },

    nameBox: { flex: 1, fontSize: 20, color: colors.text, marginRight: 12 },

    qty: {
      width: 110,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.border,
      textAlign: "center",
      fontSize: 18,
      color: colors.text,
      marginRight: 10,
    },

    copyBtn: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    deleteWrap: {
      width: 116,
      marginVertical: 2,
      backgroundColor: colors.notification,
      alignItems: "center",
      justifyContent: "center",
      borderTopRightRadius: 22,
      borderBottomRightRadius: 22,
      shadowColor: colors.text,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      marginLeft: -12,
    },
    deleteInner: { alignItems: "center", justifyContent: "center", gap: 6 },
    deleteTxt: { color: colors.card, fontWeight: "700", fontSize: 14 },

    empty: { textAlign: "center", color: colors.tabIconDefault, marginTop: 24, fontSize: 16 },

    scanButton: {
      marginHorizontal: 18,
      marginBottom: 20,
      paddingVertical: 16,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    scanButtonText: {
      color: colors.card,
      fontSize: 18,
      fontWeight: "700",
      marginLeft: 10,
    },
    itemCount: {
      fontSize: 16,
      color: colors.tabIconDefault,
      textAlign: "center",
      marginTop: 10,
      marginBottom: 20,
    },
  });
