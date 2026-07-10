import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import {
  getAccentPreference,
  getThemePreference,
  setStoredAccentPreference,
  setStoredThemePreference,
  type AccentPreference,
  type ThemePreference,
} from "./preferences";
import { accents, colors as allColors, getThemeColors, type ColorMode, type ModeColors, type ThemeColors } from "./theme";

interface ThemeContextValue {
  mode: ColorMode;
  preference: ThemePreference;
  accentPreference: AccentPreference;
  accent: (typeof accents)[AccentPreference];
  colors: ThemeColors;
  c: ModeColors;
  setMode: (mode: ColorMode) => void;
  setPreference: (preference: ThemePreference) => void;
  setAccentPreference: (preference: AccentPreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initial = "dark",
  children,
}: {
  initial?: ColorMode;
  children: ReactNode;
}) {
  const systemScheme = useColorScheme();
  const [preference, setThemePreference] = useState<ThemePreference>(initial);
  const [accentPreference, setAccentPreferenceState] = useState<AccentPreference>("yellow");

  useEffect(() => {
    let active = true;
    Promise.all([getThemePreference(), getAccentPreference()]).then(([savedTheme, savedAccent]) => {
      if (!active) return;
      setThemePreference(savedTheme);
      setAccentPreferenceState(savedAccent);
    });
    return () => {
      active = false;
    };
  }, []);

  const mode: ColorMode =
    preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference;

  const setPreference = (nextPreference: ThemePreference) => {
    setThemePreference(nextPreference);
    void setStoredThemePreference(nextPreference);
  };

  const setAccentPreference = (nextPreference: AccentPreference) => {
    setAccentPreferenceState(nextPreference);
    void setStoredAccentPreference(nextPreference);
  };

  const value = useMemo(() => {
    const modeColors = getThemeColors(mode, accentPreference);
    return {
      mode,
      preference,
      accentPreference,
      accent: accents[accentPreference],
      colors: allColors,
      c: modeColors,
      setMode: (nextMode: ColorMode) => setPreference(nextMode),
      setPreference,
      setAccentPreference,
    };
  }, [accentPreference, mode, preference]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export { type ThemeColors, type ColorMode } from "./theme";
export type { ModeColors } from "./theme";
