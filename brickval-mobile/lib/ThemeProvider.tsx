import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { colors as allColors, getThemeColors, type ColorMode, type ThemeColors } from "./theme";

type ModeColors = ThemeColors[ColorMode];

interface ThemeContextValue {
  mode: ColorMode;
  colors: ThemeColors;
  c: ModeColors;
  setMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initial = "light",
  children,
}: {
  initial?: ColorMode;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<ColorMode>(initial);

  const value = useMemo(() => {
    const modeColors = getThemeColors(mode);
    return { mode, colors: allColors, c: modeColors, setMode };
  }, [mode]);

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