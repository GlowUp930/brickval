import { useEffect, useRef, useState } from "react";
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

const ACCENT = "#62c79a";
const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.64)";
const SOFT = "rgba(247,244,234,0.38)";
const SURFACE = "#121715";
const PANEL = "#0b0e0d";
const LINE = "rgba(153,231,189,0.14)";
const { height: SCREEN_H } = Dimensions.get("window");

const PRIVACY_URL = "https://brickvalue.live/privacy";
const TERMS_URL = "https://brickvalue.live/terms";

interface Props {
  visible: boolean;
  onContinue: () => void;
  onDismiss: () => void;
}

export function PrePurchaseDisclosure({ visible, onContinue, onDismiss }: Props) {
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
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slide }] }]}
        >
          <Pressable onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>BrickVal Pro</Text>
            <Text style={styles.body}>
              Unlock unlimited scans and save as many LEGO sets and minifigures as
              you want in your collection.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Before you subscribe</Text>

            <Pressable
              style={styles.linkRow}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(PRIVACY_URL)}
            >
              <Text style={styles.linkText}>Privacy Policy</Text>
              <Text style={styles.linkArrow}>→</Text>
            </Pressable>

            <Pressable
              style={styles.linkRow}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(TERMS_URL)}
            >
              <Text style={styles.linkText}>Terms of Use</Text>
              <Text style={styles.linkArrow}>→</Text>
            </Pressable>

            <Text style={styles.eulaNote}>
              Apple's standard End User License Agreement (EULA) applies to this
              app.{"\n"}
              <Text
                style={styles.eulaLink}
                onPress={() =>
                  void Linking.openURL(
                    "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                  )
                }
              >
                View Apple EULA
              </Text>
            </Text>

            <View style={styles.divider} />

            <Pressable
              accessibilityRole="button"
              style={styles.continueButton}
              onPress={onContinue}
            >
              <Text style={styles.continueText}>Continue to Subscribe</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: PANEL,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: LINE,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: SOFT,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: ACCENT,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  body: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 20,
  },
  sectionLabel: {
    color: SOFT,
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
    borderColor: LINE,
  },
  linkText: {
    color: INK,
    fontSize: 16,
    fontWeight: "500",
  },
  linkArrow: {
    color: SOFT,
    fontSize: 16,
  },
  eulaNote: {
    color: SOFT,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },
  eulaLink: {
    color: ACCENT,
    textDecorationLine: "underline",
  },
  continueButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueText: {
    color: PANEL,
    fontSize: 16,
    fontWeight: "700",
  },
});
