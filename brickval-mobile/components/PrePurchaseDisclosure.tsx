import { useEffect, useRef, useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Linking,
  Dimensions,
} from "react-native";
import { useTheme } from "../lib/ThemeProvider";
import { colors as c } from "../lib/theme";

const { height: SCREEN_H } = Dimensions.get("window");

const PRIVACY_URL = "https://brickvalue.live/privacy";
const TERMS_URL = "https://brickvalue.live/terms";

interface Props {
  visible: boolean;
  onContinue: () => void;
  onDismiss: () => void;
}

function getStyles() {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.dark.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.dark.backgroundElevated,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: c.dark.border,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.dark.textDisabled,
      alignSelf: "center",
      marginBottom: 20,
    },
    title: {
      color: c.semantic.success,
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 8,
    },
    body: {
      color: c.dark.textMuted,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 8,
    },
    divider: {
      height: 1,
      backgroundColor: c.dark.border,
      marginVertical: 20,
    },
    sectionLabel: {
      color: c.dark.textDisabled,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 12,
    },
    linkRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderColor: c.dark.border,
    },
    linkText: {
      color: c.dark.text,
      fontSize: 16,
      fontWeight: "500",
    },
    linkArrow: {
      color: c.dark.textDisabled,
      fontSize: 16,
    },
    eulaNote: {
      color: c.dark.textDisabled,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 14,
    },
    eulaLink: {
      color: c.semantic.success,
      textDecorationLine: "underline",
    },
    continueButton: {
      backgroundColor: c.semantic.success,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
    },
    continueText: {
      color: c.dark.backgroundElevated,
      fontSize: 16,
      fontWeight: "700",
    },
    cancelButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    cancelText: {
      color: c.dark.textMuted,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}

export function PrePurchaseDisclosure({ visible, onContinue, onDismiss }: Props) {
  const { mode } = useTheme();
  const s = useMemo(() => getStyles(), [mode]);
  const [renderSheet, setRenderSheet] = useState(false);
  const slide = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      setRenderSheet(true);
      Animated.spring(slide, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 240,
      }).start();
    } else if (renderSheet) {
      Animated.timing(slide, {
        toValue: SCREEN_H,
        duration: 240,
        useNativeDriver: true,
      }).start(() => {
        setRenderSheet(false);
      });
    }
  }, [visible, renderSheet, slide]);

  if (!renderSheet) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={s.backdrop} onPress={onDismiss}>
        <Animated.View
          style={[s.sheet, { transform: [{ translateY: slide }] }]}
        >
          <Pressable onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.title}>BrickVal Pro</Text>
            <Text style={s.body}>
              Unlock unlimited scans and save as many LEGO sets and minifigures as
              you want in your collection.
            </Text>

            <View style={s.divider} />

            <Text style={s.sectionLabel}>Before you subscribe</Text>

            <Pressable
              style={s.linkRow}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(PRIVACY_URL)}
            >
              <Text style={s.linkText}>Privacy Policy</Text>
              <Text style={s.linkArrow}>→</Text>
            </Pressable>

            <Pressable
              style={s.linkRow}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(TERMS_URL)}
            >
              <Text style={s.linkText}>Terms of Use</Text>
              <Text style={s.linkArrow}>→</Text>
            </Pressable>

            <Text style={s.eulaNote}>
              Apple's standard End User License Agreement (EULA) applies to this
              app.{"\n"}
              <Text
                style={s.eulaLink}
                onPress={() =>
                  void Linking.openURL(
                    "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                  )
                }
              >
                View Apple EULA
              </Text>
            </Text>

            <View style={s.divider} />

            <Pressable
              accessibilityRole="button"
              style={s.continueButton}
              onPress={onContinue}
            >
              <Text style={s.continueText}>Continue to Subscribe</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={s.cancelButton}
              onPress={onDismiss}
            >
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
