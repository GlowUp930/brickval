import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { getThemePreference, setStoredThemePreference, type ThemePreference } from "./preferences";
import { colors as allColors, getThemeColors, type ColorMode, type ThemeColors } from "./theme";

type ModeColors = ThemeColors[ColorMode];

interface ThemeContextValue {
  mode: ColorMode;
  preference: ThemePreference;
  colors: ThemeColors;
  c: ModeColors;
  setMode: (mode: ColorMode) => void;
  setPreference: (preference: ThemePreference) => void;
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

  useEffect(() => {
    let active = true;
    getThemePreference().then((savedPreference) => {
      if (active) setThemePreference(savedPreference);
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

  const value = useMemo(() => {
    const modeColors = getThemeColors(mode);
    return {
      mode,
      preference,
      colors: allColors,
      c: modeColors,
      setMode: (nextMode: ColorMode) => setPreference(nextMode),
      setPreference,
    };
  }, [mode, preference]);

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
