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

const GOLD = "#f5c518";
const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_H = 320;

export interface ManualEntryHandle {
  open: () => void;
  close: () => void;
}

interface Props {
  onSubmit: (setNumber: string) => void;
}

export const ManualEntrySheet = forwardRef<ManualEntryHandle, Props>(
  ({ onSubmit }, ref) => {
    const [visible, setVisible] = useState(false);
    const [value, setValue] = useState("");
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
      const cleaned = value.replace(/[^0-9]/g, "");
      if (cleaned.length < 4) return;
      setVisible(false);
      setValue("");
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
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            <Text style={styles.title}>Enter set number</Text>
            <Text style={styles.subtitle}>
              Find it on the front lower-right of the box
            </Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="75192"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="number-pad"
              maxLength={8}
              style={styles.input}
              autoFocus
            />
            <Pressable
              style={[
                styles.btn,
                value.replace(/[^0-9]/g, "").length < 4 && styles.btnDisabled,
              ]}
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  kav: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#15151a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
    minHeight: SHEET_H,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    alignSelf: "center",
    marginBottom: 6,
  },
  title: { color: "white", fontSize: 22, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.55)", fontSize: 13 },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  btn: {
    backgroundColor: GOLD,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#0d0d0f", fontWeight: "800", fontSize: 15 },
});
