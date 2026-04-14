import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { setCompletedOnboarding, setPrimaryGoal, type PrimaryGoal } from "../lib/onboarding";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PROGRESS_WIDTH = SCREEN_WIDTH - 48;
const BACKGROUND = "#f4f2eb";
const SURFACE = "#fcfbf7";
const SURFACE_SOFT = "#ece8df";
const BORDER = "rgba(16, 16, 18, 0.08)";
const TEXT = "#111111";
const MUTED = "rgba(17, 17, 17, 0.58)";
const ACCENT = "#ddb448";
const ACCENT_SOFT = "#f5e8bf";

type ScreenId = "value" | "how" | "goal" | "trust" | "start";

const SCREENS: ScreenId[] = ["value", "how", "goal", "trust", "start"];

const goals: { id: PrimaryGoal; title: string; description: string }[] = [
  {
    id: "catalog",
    title: "I collect LEGO and want to catalog my collection",
    description: "Track what I own and see what it is worth today.",
  },
  {
    id: "resell",
    title: "I buy and sell LEGO",
    description: "Check value fast before I list, buy, or negotiate.",
  },
  {
    id: "deal_check",
    title: "I want to spot hidden gems at flea markets or in stores",
    description: "Scan quickly on the go and avoid overpaying.",
  },
];

const trustRows = [
  {
    title: "BrickLink market activity",
    description: "Use real LEGO marketplace pricing instead of rough guesses.",
  },
  {
    title: "eBay market checks",
    description: "Cross-check current demand across broader resale listings.",
  },
  {
    title: "Scan confirmation first",
    description: "Confirm what you are looking at before showing the value.",
  },
];

const howRows = [
  {
    step: "1",
    title: "Scan the set or minifigure",
    description: "Use the camera first, or type a set number when needed.",
  },
  {
    step: "2",
    title: "Confirm the match",
    description: "If the scan is uncertain, pick the closest result yourself.",
  },
  {
    step: "3",
    title: "See the market value",
    description: "Get the pricing view instantly and save it to your collection.",
  },
];

export default function OnboardingScreen() {
  const [screenIndex, setScreenIndex] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<PrimaryGoal | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;
  const goalAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const screen = SCREENS[screenIndex];
  const isLastScreen = screen === "start";
  const progressRatio = (screenIndex + 1) / SCREENS.length;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: progressRatio,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    content.setValue(0);
    Animated.timing(content, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [content, progress, progressRatio, screenIndex]);

  useEffect(() => {
    return () => {
      if (goalAdvanceRef.current) {
        clearTimeout(goalAdvanceRef.current);
      }
    };
  }, []);

  const contentStyle = useMemo(
    () => ({
      opacity: content,
      transform: [
        {
          translateY: content.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 0],
          }),
        },
      ],
    }),
    [content]
  );

  const completeOnboarding = async () => {
    await setCompletedOnboarding();
    router.replace("/scan");
  };

  const handleContinue = async () => {
    if (screen === "goal") return;

    if (isLastScreen) {
      await completeOnboarding();
      return;
    }

    setScreenIndex((value) => Math.min(value + 1, SCREENS.length - 1));
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const handleGoalPick = async (goal: PrimaryGoal) => {
    setSelectedGoal(goal);
    await setPrimaryGoal(goal);

    if (goalAdvanceRef.current) {
      clearTimeout(goalAdvanceRef.current);
    }

    goalAdvanceRef.current = setTimeout(() => {
      setScreenIndex((value) => Math.min(value + 1, SCREENS.length - 1));
    }, 260);
  };

  const progressBarWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PROGRESS_WIDTH],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <View style={styles.topRow}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressBarWidth }]} />
          </View>
          {!isLastScreen ? (
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.skipSpacer} />
          )}
        </View>

        <Animated.View style={[styles.content, contentStyle]}>
          {screen === "value" ? <ValueScreen /> : null}
          {screen === "how" ? <HowScreen /> : null}
          {screen === "goal" ? (
            <GoalScreen selectedGoal={selectedGoal} onSelect={handleGoalPick} />
          ) : null}
          {screen === "trust" ? <TrustScreen /> : null}
          {screen === "start" ? <StartScreen /> : null}
        </Animated.View>

        <View style={styles.footer}>
          {screen !== "goal" ? (
            <Pressable onPress={handleContinue} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {isLastScreen ? "Start scanning" : "Continue"}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.goalHint}>Choose the one that sounds most like you.</Text>
          )}
          <Text style={styles.stepText}>
            {screenIndex + 1} of {SCREENS.length}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ValueScreen() {
  return (
    <>
      <View style={styles.heroBlock}>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipText}>BrickVal</Text>
        </View>
        <Text style={styles.kicker}>Trusted LEGO valuation</Text>
        <Text style={styles.title}>Know what your LEGO is worth in seconds.</Text>
        <Text style={styles.body}>
          Scan a set or minifigure, confirm the match, and get a market value view built for collectors and resellers.
        </Text>
      </View>

      <View style={styles.imageStage}>
        <View style={styles.imageHalo} />
        <Image
          source={{ uri: "https://img.bricklink.com/ItemImage/SN/0/75192-1.png" }}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>USD</Text>
          <Text style={styles.metricLabel}>market pricing</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>Fast</Text>
          <Text style={styles.metricLabel}>first scan flow</Text>
        </View>
      </View>
    </>
  );
}

function HowScreen() {
  return (
    <>
      <View style={styles.heroBlock}>
        <Text style={styles.kicker}>How it works</Text>
        <Text style={styles.title}>Fast enough to use in the aisle, at home, or on the way out.</Text>
        <Text style={styles.body}>
          One action per step. No setup wall before you get to the value check.
        </Text>
      </View>

      <View style={styles.phoneFrame}>
        <View style={styles.phoneBar} />
        {howRows.map((row) => (
          <View key={row.step} style={styles.flowRow}>
            <View style={styles.flowStep}>
              <Text style={styles.flowStepText}>{row.step}</Text>
            </View>
            <View style={styles.flowCopy}>
              <Text style={styles.flowTitle}>{row.title}</Text>
              <Text style={styles.flowBody}>{row.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function GoalScreen({
  selectedGoal,
  onSelect,
}: {
  selectedGoal: PrimaryGoal | null;
  onSelect: (goal: PrimaryGoal) => void;
}) {
  return (
    <>
      <View style={styles.heroBlock}>
        <Text style={styles.kicker}>Tailor the app</Text>
        <Text style={styles.title}>What are you mainly here to do?</Text>
        <Text style={styles.body}>Pick one. This helps shape the way BrickVal guides you next.</Text>
      </View>

      <ScrollView
        style={styles.goalListScroll}
        contentContainerStyle={styles.goalList}
        showsVerticalScrollIndicator={false}
      >
        {goals.map((goal) => {
          const selected = selectedGoal === goal.id;
          return (
            <Pressable
              key={goal.id}
              onPress={() => onSelect(goal.id)}
              style={[styles.goalRow, selected && styles.goalRowSelected]}
            >
              <Text style={[styles.goalTitle, selected && styles.goalTitleSelected]}>
                {goal.title}
              </Text>
              <Text style={styles.goalDescription}>{goal.description}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

function TrustScreen() {
  return (
    <>
      <View style={styles.heroBlock}>
        <Text style={styles.kicker}>Why trust it</Text>
        <Text style={styles.title}>Built to give you a market answer you can actually use.</Text>
        <Text style={styles.body}>
          BrickVal is designed around real LEGO resale signals, not a made-up estimate.
        </Text>
      </View>

      <View style={styles.trustList}>
        {trustRows.map((row) => (
          <View key={row.title} style={styles.trustRow}>
            <View style={styles.trustDot} />
            <View style={styles.trustCopy}>
              <Text style={styles.trustTitle}>{row.title}</Text>
              <Text style={styles.trustBody}>{row.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function StartScreen() {
  return (
    <>
      <View style={styles.heroBlock}>
        <Text style={styles.kicker}>Ready</Text>
        <Text style={styles.title}>Start with the camera and get to the answer fast.</Text>
        <Text style={styles.body}>
          Your first lookups stay lightweight. Sign-in can wait until after you have seen the product work.
        </Text>
      </View>

      <View style={styles.startStage}>
        <View style={styles.startPhone}>
          <View style={styles.startViewfinder}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <View style={styles.startPillRow}>
            <View style={styles.startPill}>
              <Text style={styles.startPillText}>Set</Text>
            </View>
            <View style={styles.startPillMuted}>
              <Text style={styles.startPillMutedText}>Minifigure</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  root: {
    flex: 1,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 24,
  },
  topRow: {
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
  },
  progressTrack: {
    width: PROGRESS_WIDTH,
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(17,17,17,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  skipButton: {
    position: "absolute",
    right: 0,
    minHeight: 32,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  skipText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },
  skipSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingTop: 18,
    gap: 28,
  },
  heroBlock: {
    gap: 12,
  },
  heroChip: {
    alignSelf: "flex-start",
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(221,180,72,0.2)",
    backgroundColor: ACCENT_SOFT,
    justifyContent: "center",
  },
  heroChipText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },
  kicker: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: TEXT,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: 0,
  },
  body: {
    color: MUTED,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    maxWidth: 340,
  },
  imageStage: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  imageHalo: {
    position: "absolute",
    width: 270,
    height: 270,
    borderRadius: 270,
    backgroundColor: "#efe7d3",
  },
  heroImage: {
    width: 280,
    height: 280,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 4,
  },
  metricItem: {
    flex: 1,
    gap: 4,
  },
  metricValue: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
  },
  metricLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: BORDER,
  },
  phoneFrame: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  phoneBar: {
    alignSelf: "center",
    width: 56,
    height: 5,
    borderRadius: 5,
    backgroundColor: "rgba(17,17,17,0.1)",
    marginBottom: 4,
  },
  flowRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  flowStep: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ACCENT_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  flowStepText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  flowCopy: {
    flex: 1,
    gap: 4,
  },
  flowTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },
  flowBody: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  goalListScroll: {
    flex: 1,
  },
  goalList: {
    gap: 12,
    paddingBottom: 12,
  },
  goalRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  goalRowSelected: {
    borderColor: "rgba(221,180,72,0.5)",
    backgroundColor: "#f9f2dc",
  },
  goalTitle: {
    color: TEXT,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
  },
  goalTitleSelected: {
    color: TEXT,
  },
  goalDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  trustList: {
    gap: 18,
    paddingTop: 12,
  },
  trustRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  trustDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
    marginTop: 7,
  },
  trustCopy: {
    flex: 1,
    gap: 4,
  },
  trustTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
  },
  trustBody: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  startStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  startPhone: {
    width: 230,
    height: 410,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.1)",
    backgroundColor: SURFACE,
    padding: 18,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  startViewfinder: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: SURFACE_SOFT,
    position: "relative",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: ACCENT,
  },
  cornerTopLeft: {
    top: 18,
    left: 18,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 18,
    right: 18,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 18,
    left: 18,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 18,
    right: 18,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  startPillRow: {
    flexDirection: "row",
    gap: 8,
  },
  startPill: {
    flex: 1,
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  startPillMuted: {
    flex: 1,
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: SURFACE_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  startPillText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
  },
  startPillMutedText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  footer: {
    paddingBottom: 12,
    gap: 12,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: TEXT,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 16,
    fontWeight: "900",
  },
  goalHint: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
    minHeight: 56,
    textAlignVertical: "center",
  },
  stepText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
});
