import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";

const BRAND_MARK = require("../assets/brickval-loader-logo.png");
const STAGE_HOLD_MS = 2000;
const STAGE_FADE_OUT_MS = 170;
const STAGE_FADE_IN_MS = 250;
const STAGE_START_DELAY_MS = 850;
const STAGE_STEP_MS = STAGE_HOLD_MS;

export function LegoLoaderNative({ message = "Looking up..." }: { message?: string }) {
  const [stageIndex, setStageIndex] = useState(0);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkY = useRef(new Animated.Value(10)).current;
  const ringScale = useRef(new Animated.Value(0.9)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.96)).current;
  const glowOpacity = useRef(new Animated.Value(0.14)).current;
  const stageOpacity = useRef(new Animated.Value(0)).current;
  const stageY = useRef(new Animated.Value(10)).current;

  let stages = ["Preparing the reveal", "Checking sold prices", "Building your value"];

  if (message.includes("Reading set number")) {
    stages = ["Reading the box", "Matching the set", "Preparing the reveal"];
  } else if (message.includes("Looking up set")) {
    stages = ["Checking the number", "Fetching market prices", "Preparing the reveal"];
  } else if (message.includes("Fetching market prices")) {
    stages = ["Checking sold prices", "Comparing live listings", "Preparing the reveal"];
  } else if (message.includes("Found minifigure")) {
    stages = ["Found the figure", "Checking demand", "Preparing the reveal"];
  } else if (message.includes("Found part")) {
    stages = ["Found the part", "Checking color data", "Preparing the reveal"];
  } else if (message.includes("Finding minifigures")) {
    stages = ["Finding the figure", "Checking demand", "Preparing the reveal"];
  } else if (message.includes("Loading part colors")) {
    stages = ["Loading part colors", "Matching the color", "Preparing the reveal"];
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wordmarkY, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.timing(stageOpacity, {
            toValue: 1,
            duration: STAGE_FADE_IN_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(stageY, {
            toValue: 0,
            duration: STAGE_FADE_IN_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [logoOpacity, logoScale, stageOpacity, stageY, wordmarkOpacity, wordmarkY]);

  useEffect(() => {
    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.05,
            duration: 1600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.5,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(ringOpacity, {
          toValue: 0.18,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 0.9,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(120),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.04,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.22,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 0.96,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.14,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const logoLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.01,
          duration: 1700,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    ringLoop.start();
    glowLoop.start();
    const logoLoopTimer = setTimeout(() => {
      logoLoop.start();
    }, 520);

    return () => {
      clearTimeout(logoLoopTimer);
      ringLoop.stop();
      glowLoop.stop();
      logoLoop.stop();
    };
  }, [glowOpacity, glowScale, logoScale, ringOpacity, ringScale]);

  useEffect(() => {
    setStageIndex(0);
    let interval: ReturnType<typeof setInterval> | null = null;
    const intervalDelay = setTimeout(() => {
      interval = setInterval(() => {
        Animated.parallel([
          Animated.timing(stageOpacity, {
            toValue: 0,
            duration: STAGE_FADE_OUT_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(stageY, {
            toValue: -6,
            duration: STAGE_FADE_OUT_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setStageIndex((current) => (current + 1) % stages.length);
          stageY.setValue(10);
          Animated.parallel([
            Animated.timing(stageOpacity, {
              toValue: 1,
              duration: STAGE_FADE_IN_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(stageY, {
              toValue: 0,
              duration: STAGE_FADE_IN_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, STAGE_STEP_MS);
    }, STAGE_START_DELAY_MS);

    return () => {
      clearTimeout(intervalDelay);
      if (interval) {
        clearInterval(interval);
      }
      Animated.parallel([
        Animated.timing(stageOpacity, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(stageY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start();
    };
  }, [message, stageOpacity, stageY, stages.length]);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 50,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#060709",
        paddingHorizontal: 28,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: -40,
          left: -34,
          width: 240,
          height: 240,
          borderRadius: 999,
          backgroundColor: "rgba(244,191,22,0.12)",
          opacity: 0.75,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -64,
          right: -54,
          width: 320,
          height: 320,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.04)",
          opacity: 0.8,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: "46%",
          width: 252,
          height: 252,
          borderRadius: 999,
          backgroundColor: "rgba(244,191,22,0.05)",
        }}
      />

      <Animated.View
        style={{
          opacity: stageOpacity,
          transform: [{ translateY: stageY }],
          width: "100%",
          maxWidth: 286,
          marginBottom: 18,
          paddingHorizontal: 15,
          paddingVertical: 14,
          borderRadius: 24,
          borderCurve: "continuous",
          backgroundColor: "rgba(255,255,255,0.055)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          boxShadow: "0 16px 42px rgba(0, 0, 0, 0.26)",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 26,
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: "rgba(244,191,22,0.12)",
            borderWidth: 1,
            borderColor: "rgba(244,191,22,0.2)",
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: "#F4BF16",
            }}
          />
          <Text
            selectable
            style={{
              color: "#F4BF16",
              fontSize: 10,
              lineHeight: 12,
              fontWeight: "800",
              letterSpacing: 0.9,
              textTransform: "uppercase",
            }}
          >
            Live analysis
          </Text>
        </View>

        <Text
          selectable
          style={{
            color: "#F7F2E8",
            fontSize: 16,
            lineHeight: 21,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {stages[stageIndex]}
        </Text>

        <Text
          selectable
          style={{
            color: "rgba(247,242,232,0.68)",
            fontSize: 12,
            lineHeight: 17,
            textAlign: "center",
          }}
        >
          {message}
        </Text>

        <View style={{ flexDirection: "row", gap: 7, marginTop: 2 }}>
          {stages.map((_, index) => (
            <View
              key={index}
              style={{
                width: index === stageIndex ? 16 : 6,
                height: 6,
                borderRadius: 999,
                backgroundColor:
                  index === stageIndex ? "rgba(244,191,22,0.92)" : "rgba(247,242,232,0.18)",
              }}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: wordmarkOpacity,
          transform: [{ translateY: wordmarkY }],
          width: "100%",
          maxWidth: 306,
          marginBottom: 12,
          paddingHorizontal: 14,
          paddingVertical: 14,
          borderRadius: 30,
          borderCurve: "continuous",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          boxShadow: "0 16px 38px rgba(0, 0, 0, 0.18)",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 14,
          overflow: "hidden",
        }}
      >
        <Animated.Image
          source={BRAND_MARK}
          resizeMode="cover"
          accessible
          accessibilityLabel="BrickVal logo"
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        />
        <View style={{ flex: 1, gap: 2, alignItems: "flex-start", paddingRight: 4 }}>
          <Text
            selectable
            style={{
              color: "#F7F2E8",
              fontSize: 18,
              lineHeight: 22,
              fontWeight: "800",
              letterSpacing: 0.2,
            }}
          >
            BrickVal
          </Text>
          <Text
            selectable
            style={{
              color: "rgba(247,242,232,0.72)",
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            Premium LEGO value scans
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          width: 252,
          height: 252,
          borderRadius: 999,
          backgroundColor: "rgba(244,191,22,0.14)",
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
        }}
      />

      <Animated.View
        style={{
          position: "absolute",
          width: 228,
          height: 228,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "rgba(244,191,22,0.36)",
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />
    </View>
  );
}
