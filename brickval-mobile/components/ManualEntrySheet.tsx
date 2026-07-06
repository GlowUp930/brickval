import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { ScanMode } from "../lib/api";

const GOLD = "#F2CD37";
const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_H = Math.min(340, Math.round(SCREEN_H * 0.44));

export interface ManualEntryHandle {
  open: () => void;
  close: () => void;
}

interface Props {
  mode: ScanMode;
  onSubmit: (setNumber: string) => void;
}

export const ManualEntrySheet = forwardRef<ManualEntryHandle, Props>(
  ({ mode, onSubmit }, ref) => {
    const [visible, setVisible] = useState(false);
    const [value, setValue] = useState("");
    const [error, setError] = useState("");
    const slide = useRef(new Animated.Value(SHEET_H)).current;

    useImperativeHandle(ref, () => ({
      open: () => setVisible(true),
      close: () => setVisible(false),
    }));

    useEffect(() => {
      Animated.spring(slide, {
        toValue: visible ? 0 : SHEET_H,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }).start();
    }, [visible]);

    const submit = () => {
      const cleaned = mode === "minifig"
        ? value.trim().replace(/[^a-z0-9]/gi, "").toLowerCase()
        : value.replace(/[^0-9]/g, "");
      if (cleaned.length < (mode === "minifig" ? 3 : 4)) {
        setError(
          mode === "minifig"
            ? "Enter a valid minifigure ID, like sw0001."
            : "Enter a set number with at least 4 digits."
        );
        return;
      }
      setVisible(false);
      setValue("");
      setError("");
      onSubmit(cleaned);
    };

    return (
      <Modal
        transparent
        visible={visible}
        animationType="none"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setVisible(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: slide }] },
            ]}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>
              {mode === "minifig" ? "Enter minifigure ID" : "Enter set number"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "minifig"
                ? "Use the BrickLink ID, like sw0001"
                : "Find it on the front lower-right of the box"}
            </Text>
            <TextInput
              value={value}
              onChangeText={(text) => {
                setValue(text);
                if (error) setError("");
              }}
              placeholder={mode === "minifig" ? "sw0001" : "75192"}
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType={mode === "minifig" ? "default" : "number-pad"}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={mode === "minifig" ? 16 : 8}
              style={styles.input}
              autoFocus
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[
                styles.btn,
                value.trim().replace(mode === "minifig" ? /[^a-z0-9]/gi : /[^0-9]/g, "").length < (mode === "minifig" ? 3 : 4) && styles.btnDisabled,
              ]}
              disabled={value.trim().replace(mode === "minifig" ? /[^a-z0-9]/gi : /[^0-9]/g, "").length < (mode === "minifig" ? 3 : 4)}
              onPress={submit}
            >
              <Text style={styles.btnText}>Look up</Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.55)" },
  kav: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#15151a",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    alignSelf: "center",
    marginBottom: 10,
  },
  title: { color: "white", fontSize: 24, fontWeight: "900", lineHeight: 29 },
  subtitle: { color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 19 },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  error: {
    color: "#ffb4b4",
    fontSize: 12,
    fontWeight: "700",
    marginTop: -2,
  },
  btn: {
    backgroundColor: GOLD,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 2,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#0d0d0f", fontWeight: "800", fontSize: 15 },
});
