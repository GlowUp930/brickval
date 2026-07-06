import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as StoreReview from "expo-store-review";
import { useVideoPlayer, VideoView } from "expo-video";
import { MotiView } from "moti";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { setCompletedOnboarding, setPrimaryGoal, type PrimaryGoal } from "../lib/onboarding";
import { useTheme, type ThemeColors } from "../lib/ThemeProvider";

type ScreenId = "value" | "demo" | "goal" | "trust" | "review";

const SCREENS: ScreenId[] = ["value", "demo", "goal", "trust", "review"];

const r2d2Image = { uri: "https://img.bricklink.com/ItemImage/SN/0/75308-1.png" };
const demoVideo = require("../assets/onboarding-demo.mp4");
const shieldIcon = require("../assets/onboarding-shield.png");
const bricklinkLogo = require("../assets/onboarding-bricklink.png");
const bricksetLogo = require("../assets/onboarding-brickset.webp");
const appLogo = require("../assets/brickval-loader-logo.png");

const goals: { id: PrimaryGoal; title: string; description: string }[] = [
  {
    id: "catalog",
    title: "Catalog my collection",
    description: "Track what I own and what it is worth today.",
  },
  {
    id: "resell",
    title: "Buy and sell LEGO",
    description: "Check value before I list, buy, or negotiate.",
  },
  {
    id: "deal_check",
    title: "Spot hidden gems",
    description: "Scan quickly in stores, markets, or bulk lots.",
  },
];

export default function OnboardingScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => getStyles(c), [c]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<PrimaryGoal | null>(null);
  const reviewPromptRequested = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;

  const screen = SCREENS[screenIndex];
  const isLastScreen = screen === "review";
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

    if (screen === "review" && !reviewPromptRequested.current) {
      const timer = setTimeout(() => {
        reviewPromptRequested.current = true;
        void requestNativeReview();
      }, 1300);
      return () => clearTimeout(timer);
    }
  }, [content, progress, progressRatio, screenIndex]);

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
    if (isLastScreen) {
      await completeOnboarding();
      return;
    }

    setScreenIndex((value) => Math.min(value + 1, SCREENS.length - 1));
  };

  const handleGoalPick = async (goal: PrimaryGoal) => {
    setSelectedGoal(goal);
    await setPrimaryGoal(goal);
  };

  const requestNativeReview = async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
    } catch (error) {
      console.warn("Failed to request App Store review", error);
    }
  };

  return (
    <SafeAreaView style={s.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={s.root}>
        <View style={s.progressRow}>
          {SCREENS.map((item, index) => (
            <View
              key={item}
              style={[s.progressSegment, index <= screenIndex && s.progressSegmentActive]}
            />
          ))}
        </View>

        <Animated.View style={[s.screen, contentStyle]}>
          {screen === "value" ? <ValueScreen s={s} c={c} /> : null}
          {screen === "demo" ? <DemoScreen s={s} /> : null}
          {screen === "goal" ? (
            <GoalScreen s={s} selectedGoal={selectedGoal} onSelect={handleGoalPick} />
          ) : null}
          {screen === "trust" ? <TrustScreen s={s} /> : null}
          {screen === "review" ? <ReviewScreen s={s} /> : null}
        </Animated.View>

        <View style={s.footer}>
          <Pressable onPress={handleContinue} style={s.primaryButton}>
            <Text style={s.primaryButtonText}>
              {screenIndex === 0 ? "Get started" : "Continue"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function HeroText({
  s,
  title,
  subtitle,
}: {
  s: ReturnType<typeof getStyles>;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={s.heroBlock}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
    </View>
  );
}

function ValueScreen({ s, c }: { s: ReturnType<typeof getStyles>; c: ThemeColors }) {
  return (
    <>
      <HeroText
        s={s}
        title="Know what your LEGO is worth"
        subtitle="Scan sets and minifigures, check value, and track your collection."
      />

      <MotiView
        from={{ opacity: 0, scale: 0.96, translateY: 18 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 420 }}
        style={s.valueCard}
      >
        <Image source={r2d2Image} style={s.setImage} resizeMode="contain" />
        <View>
          <Text style={s.label}>Set</Text>
          <Text style={s.setName}>75308{"\n"}R2-D2</Text>
          <Text style={s.setTheme}>Star Wars</Text>
        </View>
        <View style={s.priceRow}>
          <View>
            <Text style={s.label}>Estimated value</Text>
            <Text style={s.price}>$214</Text>
          </View>
          <Text style={s.gain}>+24%</Text>
        </View>
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 520, delay: 160 }}
          style={s.chartBox}
        >
          <Svg width="100%" height="100%" viewBox="0 0 260 92">
            <Defs>
              <LinearGradient id="chartFill" x1="0" x2="0" y1="16" y2="92">
                <Stop offset="0" stopColor={c.lego.yellow} stopOpacity="0.34" />
                <Stop offset="0.62" stopColor={c.lego.yellow} stopOpacity="0.13" />
                <Stop offset="1" stopColor={c.lego.yellow} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Path
              d="M4 58 C16 61 27 52 38 59 C51 68 61 73 73 64 C85 55 94 78 104 61 C116 42 124 47 134 36 C146 24 159 39 170 28 C181 17 194 26 205 18 C218 8 231 19 242 10 C250 4 255 7 258 5 L258 92 L4 92 Z"
              fill="url(#chartFill)"
            />
            <Path
              d="M4 58 C16 61 27 52 38 59 C51 68 61 73 73 64 C85 55 94 78 104 61 C116 42 124 47 134 36 C146 24 159 39 170 28 C181 17 194 26 205 18 C218 8 231 19 242 10 C250 4 255 7 258 5"
              fill="none"
              stroke={c.lego.yellow}
              strokeLinecap="round"
              strokeWidth={4}
            />
            <Circle cx={258} cy={5} r={4.5} fill={c.lego.yellow} stroke="#FFFFFF" strokeWidth={3} />
          </Svg>
        </MotiView>
      </MotiView>
    </>
  );
}

function DemoScreen({ s }: { s: ReturnType<typeof getStyles> }) {
  const player = useVideoPlayer(demoVideo, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <>
      <HeroText
        s={s}
        title="Scan. Confirm. Reveal."
        subtitle="Watch how BrickVal gets from camera to value."
      />

      <View style={s.demoStage}>
        <View style={s.demoPhoneFrame}>
          <View style={s.demoPhoneScreen}>
            <VideoView
              player={player}
              style={s.demoVideo}
              contentFit="cover"
              nativeControls={false}
            />
          </View>
        </View>
      </View>
    </>
  );
}

function GoalScreen({
  s,
  selectedGoal,
  onSelect,
}: {
  s: ReturnType<typeof getStyles>;
  selectedGoal: PrimaryGoal | null;
  onSelect: (goal: PrimaryGoal) => void;
}) {
  return (
    <>
      <HeroText
        s={s}
        title="What are you mainly here to do?"
        subtitle="Pick one. This helps BrickVal guide your first scan."
      />

      <View style={s.goalList}>
        {goals.map((goal) => {
          const selected = selectedGoal === goal.id;
          return (
            <Pressable
              key={goal.id}
              onPress={() => onSelect(goal.id)}
              style={[s.goalRow, selected && s.goalRowSelected]}
            >
              <Text style={s.goalTitle}>{goal.title}</Text>
              <Text style={s.goalDescription}>{goal.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function TrustScreen({ s }: { s: ReturnType<typeof getStyles> }) {
  return (
    <>
      <MotiView
        from={{ opacity: 0, scale: 0.94, rotate: "-3deg" }}
        animate={{ opacity: 1, scale: 1, rotate: "0deg" }}
        transition={{ type: "timing", duration: 460 }}
        style={s.trustVisual}
      >
        <View style={s.trustCanvas}>
          <View style={s.trustOrbit} />
          <View style={[s.sourceChip, s.bricklinkChip]}>
            <Image source={bricklinkLogo} style={s.bricklinkLogo} resizeMode="contain" />
          </View>
          <View style={[s.sourceChip, s.bricksetChip]}>
            <Image source={bricksetLogo} style={s.bricksetLogo} resizeMode="contain" />
          </View>
          <View style={[s.connector, s.connectorOne]} />
          <View style={[s.connector, s.connectorTwo]} />
          <View style={s.shieldNode}>
            <Image source={shieldIcon} style={s.shieldIcon} resizeMode="contain" />
          </View>
        </View>
      </MotiView>

      <HeroText
        s={s}
        title="Real Market Data"
        subtitle="BrickVal uses data from reliable sources"
      />
    </>
  );
}

function ReviewScreen({ s }: { s: ReturnType<typeof getStyles> }) {
  return (
    <View style={s.reviewScreen}>
      <HeroText
        s={s}
        title="Leave us a review"
        subtitle="BrickVal is a new indie LEGO app built by a LEGO fan."
      />

      <View style={s.reviewStack}>
        <View style={s.indieVisual}>
          <View style={s.indieGlow} />
          <View style={s.indieConnectorLeft} />
          <View style={s.indieConnectorRight} />
          <View style={[s.indiePill, s.indiePillLeft]}>
            <Text style={s.indiePillText}>Built for collectors</Text>
          </View>
          <View style={[s.indiePill, s.indiePillRight]}>
            <Text style={s.indiePillText}>Made by a fan</Text>
          </View>
          <MotiView
            from={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", delay: 120 }}
            style={s.indieLogoCircle}
          >
            <Image source={appLogo} style={s.indieLogo} resizeMode="contain" />
          </MotiView>
        </View>

        <View style={s.reviewCard}>
          <Text style={s.reviewMuted}>
            Your review helps more LEGO collectors find the app and helps us improve it.
          </Text>
        </View>

        <View style={s.testimonial}>
          <View style={s.testimonialHeader}>
            <Text style={s.testimonialName}>Daniel K.</Text>
            <RatingStars color="#D99D5A" />
          </View>
          <Text style={s.testimonialCopy}>Fastest way I have found to check a set before buying.</Text>
        </View>
      </View>
    </View>
  );
}

function RatingStars({
  color,
}: {
  color: string;
}) {
  return (
    <View style={stylesBase.filledStars}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Text
          key={index}
          style={[stylesBase.filledStar, { color }]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

const stylesBase = StyleSheet.create({
  filledStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  filledStar: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "900",
  },
});

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
    progressRow: {
      minHeight: 22,
      paddingTop: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    progressSegment: {
      flex: 1,
      height: 4,
      borderRadius: 999,
      backgroundColor: c.light.borderStrong,
    },
    progressSegmentActive: {
      backgroundColor: c.lego.yellow,
    },
    skipButton: {
      position: "absolute",
      right: 0,
      top: 0,
      minHeight: 44,
      minWidth: 44,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    skipText: {
      color: c.light.textMuted,
      fontSize: 13,
      fontWeight: "700",
    },
    screen: {
      flex: 1,
      paddingTop: 26,
      paddingBottom: 12,
      gap: 16,
    },
    heroBlock: {
      alignItems: "center",
      gap: 11,
      minHeight: 104,
      justifyContent: "center",
    },
    title: {
      color: c.light.text,
      fontSize: 27,
      lineHeight: 30,
      fontWeight: "900",
      letterSpacing: 0,
      textAlign: "center",
      maxWidth: 330,
    },
    subtitle: {
      color: c.light.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "600",
      textAlign: "center",
      maxWidth: 310,
    },
    valueCard: {
      flex: 1,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: "rgba(209, 209, 214, 0.82)",
      backgroundColor: c.light.surfaceGlass,
      padding: 16,
      gap: 11,
      shadowColor: "#111111",
      shadowOpacity: 0.1,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 18 },
      elevation: 4,
    },
    setImage: {
      width: 148,
      height: 148,
      borderRadius: 24,
      alignSelf: "center",
      backgroundColor: c.light.surface,
      borderWidth: 1,
      borderColor: c.light.border,
    },
    label: {
      color: c.light.textMuted,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    setName: {
      color: c.light.text,
      marginTop: 4,
      fontSize: 20,
      lineHeight: 22,
      fontWeight: "900",
    },
    setTheme: {
      color: c.light.textMuted,
      marginTop: 6,
      fontSize: 12,
      fontWeight: "700",
    },
    priceRow: {
      borderTopWidth: 1,
      borderTopColor: c.light.border,
      paddingTop: 12,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    price: {
      color: c.light.text,
      fontSize: 34,
      lineHeight: 36,
      fontWeight: "900",
    },
    gain: {
      color: c.semantic.success,
      fontSize: 14,
      fontWeight: "900",
    },
    chartBox: {
      height: 92,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(245, 216, 92, 0.36)",
      backgroundColor: c.lego.yellowSoft,
      overflow: "hidden",
    },
    demoStage: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: -8,
    },
    demoPhoneFrame: {
      width: 244,
      height: 506,
      borderRadius: 48,
      padding: 7,
      backgroundColor: "#08090A",
      shadowColor: "#111111",
      shadowOpacity: 0.18,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 18 },
      elevation: 5,
    },
    demoPhoneScreen: {
      flex: 1,
      borderRadius: 41,
      overflow: "hidden",
      backgroundColor: "#08090A",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.16)",
    },
    demoVideo: {
      width: "100%",
      height: "100%",
      backgroundColor: "#08090A",
    },
    goalList: {
      flex: 1,
      justifyContent: "center",
      gap: 10,
    },
    goalRow: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.light.border,
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      padding: 13,
      gap: 6,
    },
    goalRowSelected: {
      borderColor: c.lego.yellow,
      backgroundColor: c.lego.yellowSoft,
    },
    goalTitle: {
      color: c.light.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "900",
    },
    goalDescription: {
      color: c.light.textMuted,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    trustVisual: {
      height: 336,
      alignItems: "center",
      justifyContent: "center",
    },
    trustCanvas: {
      width: 236,
      height: 320,
      position: "relative",
    },
    trustOrbit: {
      position: "absolute",
      left: 28,
      top: 74,
      width: 176,
      height: 176,
      borderRadius: 999,
      backgroundColor: "rgba(242, 205, 55, 0.12)",
      borderWidth: 28,
      borderColor: "rgba(239, 239, 244, 0.82)",
    },
    sourceChip: {
      position: "absolute",
      minHeight: 56,
      borderRadius: 22,
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      borderWidth: 1,
      borderColor: "rgba(209, 209, 214, 0.66)",
      shadowColor: "#111111",
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 3,
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
    },
    bricklinkChip: {
      right: 2,
      top: 76,
      minWidth: 112,
    },
    bricksetChip: {
      left: 0,
      top: 220,
      minWidth: 126,
    },
    bricklinkLogo: {
      width: 94,
      height: 28,
    },
    bricksetLogo: {
      width: 106,
      height: 32,
    },
    connector: {
      position: "absolute",
      width: 54,
      height: 40,
      borderColor: "rgba(17, 17, 17, 0.72)",
      zIndex: 2,
    },
    connectorOne: {
      left: 128,
      top: 137,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderBottomRightRadius: 24,
    },
    connectorTwo: {
      left: 62,
      top: 190,
      borderLeftWidth: 2,
      borderTopWidth: 2,
      borderTopLeftRadius: 24,
    },
    shieldNode: {
      position: "absolute",
      left: 80,
      top: 136,
      width: 76,
      height: 76,
      borderRadius: 999,
      backgroundColor: "#1D1A23",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 3,
      shadowColor: "#111111",
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    shieldIcon: {
      width: 44,
      height: 44,
      tintColor: c.light.textInverse,
      opacity: 0.92,
    },
    reviewScreen: {
      flex: 1,
      position: "relative",
      gap: 14,
    },
    reviewStack: {
      flex: 1,
      justifyContent: "center",
      gap: 12,
    },
    indieVisual: {
      height: 172,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    indieGlow: {
      position: "absolute",
      width: 148,
      height: 148,
      borderRadius: 999,
      backgroundColor: "rgba(242, 205, 55, 0.14)",
      borderWidth: 24,
      borderColor: "rgba(239, 239, 244, 0.86)",
    },
    indieLogoCircle: {
      width: 82,
      height: 82,
      borderRadius: 999,
      backgroundColor: "#1D1A23",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#111111",
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 5,
      zIndex: 4,
    },
    indieLogo: {
      width: 52,
      height: 52,
    },
    indiePill: {
      position: "absolute",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(229, 229, 234, 0.88)",
      backgroundColor: "rgba(255, 255, 255, 0.92)",
      paddingHorizontal: 12,
      minHeight: 35,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#111111",
      shadowOpacity: 0.07,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 9 },
      elevation: 2,
      zIndex: 3,
    },
    indiePillLeft: {
      left: 2,
      top: 30,
    },
    indiePillRight: {
      right: 4,
      bottom: 28,
    },
    indiePillText: {
      color: c.light.textSecondary,
      fontSize: 12,
      fontWeight: "900",
    },
    indieConnectorLeft: {
      position: "absolute",
      left: 60,
      bottom: 48,
      width: 48,
      height: 32,
      borderLeftWidth: 2,
      borderBottomWidth: 2,
      borderColor: "rgba(17, 17, 17, 0.56)",
      borderBottomLeftRadius: 18,
      zIndex: 2,
    },
    indieConnectorRight: {
      position: "absolute",
      right: 62,
      top: 46,
      width: 44,
      height: 32,
      borderRightWidth: 2,
      borderTopWidth: 2,
      borderColor: "rgba(17, 17, 17, 0.56)",
      borderTopRightRadius: 18,
      zIndex: 2,
    },
    reviewCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.light.border,
      backgroundColor: "rgba(255, 255, 255, 0.72)",
      paddingVertical: 16,
      paddingHorizontal: 18,
    },
    reviewMuted: {
      color: c.light.textSecondary,
      textAlign: "center",
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
    },
    testimonial: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.light.border,
      backgroundColor: "rgba(255, 255, 255, 0.55)",
      padding: 14,
      gap: 7,
    },
    testimonialHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    testimonialName: {
      color: c.light.text,
      fontSize: 15,
      fontWeight: "900",
    },
    testimonialCopy: {
      color: c.light.textMuted,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    footer: {
      paddingBottom: 12,
    },
    primaryButton: {
      minHeight: 56,
      borderRadius: 999,
      backgroundColor: c.lego.yellow,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: c.lego.yellowPressed,
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    primaryButtonText: {
      color: c.light.text,
      fontSize: 16,
      fontWeight: "900",
    },
  });
}
