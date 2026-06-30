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
import { useTheme, type ThemeColors } from "../lib/ThemeProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PROGRESS_WIDTH = SCREEN_WIDTH - 48;

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
  const { colors: c } = useTheme();
  const s = useMemo(() => getStyles(c), [c]);
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
    <SafeAreaView style={s.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={s.root}>
        <View style={s.topRow}>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: progressBarWidth }]} />
          </View>
          {!isLastScreen ? (
            <Pressable onPress={handleSkip} style={s.skipButton}>
              <Text style={s.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={s.skipSpacer} />
          )}
        </View>

        <Animated.View style={[s.content, contentStyle]}>
          {screen === "value" ? <ValueScreen s={s} /> : null}
          {screen === "how" ? <HowScreen s={s} /> : null}
          {screen === "goal" ? (
            <GoalScreen s={s} selectedGoal={selectedGoal} onSelect={handleGoalPick} />
          ) : null}
          {screen === "trust" ? <TrustScreen s={s} /> : null}
          {screen === "start" ? <StartScreen s={s} /> : null}
        </Animated.View>

        <View style={s.footer}>
          {screen !== "goal" ? (
            <Pressable onPress={handleContinue} style={s.primaryButton}>
              <Text style={s.primaryButtonText}>
                {isLastScreen ? "Start scanning" : "Continue"}
              </Text>
            </Pressable>
          ) : (
            <Text style={s.goalHint}>Choose the one that sounds most like you.</Text>
          )}
          <Text style={s.stepText}>
            {screenIndex + 1} of {SCREENS.length}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ValueScreen({ s }: { s: any }) {
  return (
    <>
      <View style={s.heroBlock}>
        <View style={s.heroChip}>
          <Text style={s.heroChipText}>BrickVal</Text>
        </View>
        <Text style={s.kicker}>Trusted LEGO valuation</Text>
        <Text style={s.title}>Know what your LEGO is worth in seconds.</Text>
        <Text style={s.body}>
          Scan a set or minifigure, confirm the match, and get a market value view built for collectors and resellers.
        </Text>
      </View>

      <View style={s.imageStage}>
        <View style={s.imageHalo} />
        <Image
          source={{ uri: "https://img.bricklink.com/ItemImage/SN/0/75192-1.png" }}
          style={s.heroImage}
          resizeMode="contain"
        />
      </View>

      <View style={s.metricRow}>
        <View style={s.metricItem}>
          <Text style={s.metricValue}>USD</Text>
          <Text style={s.metricLabel}>market pricing</Text>
        </View>
        <View style={s.metricDivider} />
        <View style={s.metricItem}>
          <Text style={s.metricValue}>Fast</Text>
          <Text style={s.metricLabel}>first scan flow</Text>
        </View>
      </View>
    </>
  );
}

function HowScreen({ s }: { s: any }) {
  return (
    <>
      <View style={s.heroBlock}>
        <Text style={s.kicker}>How it works</Text>
        <Text style={s.title}>Fast enough to use in the aisle, at home, or on the way out.</Text>
        <Text style={s.body}>
          One action per step. No setup wall before you get to the value check.
        </Text>
      </View>

      <View style={s.phoneFrame}>
        <View style={s.phoneBar} />
        {howRows.map((row) => (
          <View key={row.step} style={s.flowRow}>
            <View style={s.flowStep}>
              <Text style={s.flowStepText}>{row.step}</Text>
            </View>
            <View style={s.flowCopy}>
              <Text style={s.flowTitle}>{row.title}</Text>
              <Text style={s.flowBody}>{row.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function GoalScreen({
  s,
  selectedGoal,
  onSelect,
}: {
  s: any;
  selectedGoal: PrimaryGoal | null;
  onSelect: (goal: PrimaryGoal) => void;
}) {
  return (
    <>
      <View style={s.heroBlock}>
        <Text style={s.kicker}>Tailor the app</Text>
        <Text style={s.title}>What are you mainly here to do?</Text>
        <Text style={s.body}>Pick one. This helps shape the way BrickVal guides you next.</Text>
      </View>

      <ScrollView
        style={s.goalListScroll}
        contentContainerStyle={s.goalList}
        showsVerticalScrollIndicator={false}
      >
        {goals.map((goal) => {
          const selected = selectedGoal === goal.id;
          return (
            <Pressable
              key={goal.id}
              onPress={() => onSelect(goal.id)}
              style={[s.goalRow, selected && s.goalRowSelected]}
            >
              <Text style={[s.goalTitle, selected && s.goalTitleSelected]}>
                {goal.title}
              </Text>
              <Text style={s.goalDescription}>{goal.description}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

function TrustScreen({ s }: { s: any }) {
  return (
    <>
      <View style={s.heroBlock}>
        <Text style={s.kicker}>Why trust it</Text>
        <Text style={s.title}>Built to give you a market answer you can actually use.</Text>
        <Text style={s.body}>
          BrickVal is designed around real LEGO resale signals, not a made-up estimate.
        </Text>
      </View>

      <View style={s.trustList}>
        {trustRows.map((row) => (
          <View key={row.title} style={s.trustRow}>
            <View style={s.trustDot} />
            <View style={s.trustCopy}>
              <Text style={s.trustTitle}>{row.title}</Text>
              <Text style={s.trustBody}>{row.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function StartScreen({ s }: { s: any }) {
  return (
    <>
      <View style={s.heroBlock}>
        <Text style={s.kicker}>Ready</Text>
        <Text style={s.title}>Start with the camera and get to the answer fast.</Text>
        <Text style={s.body}>
          Your first lookups stay lightweight. Sign-in can wait until after you have seen the product work.
        </Text>
      </View>

      <View style={s.startStage}>
        <View style={s.startPhone}>
          <View style={s.startViewfinder}>
            <View style={[s.corner, s.cornerTopLeft]} />
            <View style={[s.corner, s.cornerTopRight]} />
            <View style={[s.corner, s.cornerBottomLeft]} />
            <View style={[s.corner, s.cornerBottomRight]} />
          </View>
          <View style={s.startPillRow}>
            <View style={s.startPill}>
              <Text style={s.startPillText}>Set</Text>
            </View>
            <View style={s.startPillMuted}>
              <Text style={s.startPillMutedText}>Minifigure</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.light.background,
    },
    root: {
      flex: 1,
      backgroundColor: c.light.background,
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
      backgroundColor: c.light.border,
      overflow: "hidden",
    },
    progressFill: {
      height: 4,
      borderRadius: 4,
      backgroundColor: c.lego.yellow,
    },
    skipButton: {
      position: "absolute",
      right: 0,
      minHeight: 32,
      paddingHorizontal: 10,
      justifyContent: "center",
    },
    skipText: {
      color: c.light.textMuted,
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
      borderColor: c.lego.yellow + "33",
      backgroundColor: c.light.backgroundMuted,
      justifyContent: "center",
    },
    heroChipText: {
      color: c.light.text,
      fontSize: 12,
      fontWeight: "800",
    },
    kicker: {
      color: c.light.textMuted,
      fontSize: 13,
      fontWeight: "800",
    },
    title: {
      color: c.light.text,
      fontSize: 34,
      lineHeight: 38,
      fontWeight: "900",
      letterSpacing: 0,
    },
    body: {
      color: c.light.textMuted,
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
      color: c.light.text,
      fontSize: 20,
      fontWeight: "900",
    },
    metricLabel: {
      color: c.light.textMuted,
      fontSize: 13,
      fontWeight: "700",
    },
    metricDivider: {
      width: 1,
      height: 28,
      backgroundColor: c.light.border,
    },
    phoneFrame: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.light.border,
      backgroundColor: c.light.background,
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
      backgroundColor: c.light.border,
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
      backgroundColor: c.light.backgroundMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    flowStepText: {
      color: c.light.text,
      fontSize: 13,
      fontWeight: "900",
    },
    flowCopy: {
      flex: 1,
      gap: 4,
    },
    flowTitle: {
      color: c.light.text,
      fontSize: 15,
      fontWeight: "800",
    },
    flowBody: {
      color: c.light.textMuted,
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
      borderColor: c.light.border,
      backgroundColor: c.light.background,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 6,
    },
    goalRowSelected: {
      borderColor: c.lego.yellow,
      backgroundColor: c.light.backgroundMuted,
    },
    goalTitle: {
      color: c.light.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
    },
    goalTitleSelected: {
      color: c.light.text,
    },
    goalDescription: {
      color: c.light.textMuted,
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
      backgroundColor: c.lego.yellow,
      marginTop: 7,
    },
    trustCopy: {
      flex: 1,
      gap: 4,
    },
    trustTitle: {
      color: c.light.text,
      fontSize: 16,
      fontWeight: "800",
    },
    trustBody: {
      color: c.light.textMuted,
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
      borderColor: c.light.border,
      backgroundColor: c.light.background,
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
      backgroundColor: c.light.backgroundMuted,
      position: "relative",
      overflow: "hidden",
    },
    corner: {
      position: "absolute",
      width: 28,
      height: 28,
      borderColor: c.lego.yellow,
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
      backgroundColor: c.lego.yellow,
      alignItems: "center",
      justifyContent: "center",
    },
    startPillMuted: {
      flex: 1,
      minHeight: 36,
      borderRadius: 8,
      backgroundColor: c.light.backgroundMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    startPillText: {
      color: c.light.text,
      fontSize: 12,
      fontWeight: "900",
    },
    startPillMutedText: {
      color: c.light.textMuted,
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
      backgroundColor: c.light.text,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      color: c.light.background,
      fontSize: 16,
      fontWeight: "900",
    },
    goalHint: {
      color: c.light.textMuted,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "700",
      textAlign: "center",
      minHeight: 56,
      textAlignVertical: "center",
    },
    stepText: {
      color: c.light.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
    },
  });
}
