import { useRef, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";

const GOLD = "#f5c518";

export interface ManualEntryHandle {
  open: () => void;
  close: () => void;
}

interface Props {
  onSubmit: (setNumber: string) => void;
}

export const ManualEntrySheet = forwardRef<ManualEntryHandle, Props>(({ onSubmit }, ref) => {
  const sheetRef = useRef<BottomSheet>(null);
  const [value, setValue] = useState("");
  const snapPoints = useMemo(() => ["38%"], []);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.snapToIndex(0),
    close: () => sheetRef.current?.close(),
  }));

  const submit = () => {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (cleaned.length < 4) return;
    sheetRef.current?.close();
    setValue("");
    onSubmit(cleaned);
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior="interactive"
    >
      <BottomSheetView style={styles.body}>
        <Text style={styles.title}>Enter set number</Text>
        <Text style={styles.subtitle}>Find it on the front lower-right of the box</Text>
        <BottomSheetTextInput
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
          style={[styles.btn, value.replace(/[^0-9]/g, "").length < 4 && styles.btnDisabled]}
          onPress={submit}
        >
          <Text style={styles.btnText}>Look up</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  bg: { backgroundColor: "#15151a" },
  handle: { backgroundColor: GOLD, width: 40 },
  body: { padding: 24, gap: 14 },
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
  btn: { backgroundColor: GOLD, borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#0d0d0f", fontWeight: "800", fontSize: 15 },
});
