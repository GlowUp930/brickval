/**
 * BrickValue Theme
 * ------------------------------------------------------------
 * Direction:
 * - Robinhood-inspired collection surface: white canvas, clean black text.
 * - Robinhood green is the active/value accent for portfolio UI.
 * - The UI should feel like a premium scanner / pricing tool, not a toy app.
 *
 * Usage rule:
 * 90% neutral grey / white surfaces
 * 5-8% green for CTA, selected state, progress, scanner active state, Pro moments
 * Functional green/red only when the UI needs success or error meaning
 */

export const colors = {
  /**
   * Brand accent
   * Yellow is the only brand accent. Avoid competing LEGO primary colours.
   */
  brand: {
    yellow: '#F2CD37',
    yellowPressed: '#D9B52F',
    yellowSoft: '#FFF7D6',
    yellowBorder: '#F5D85C',
  },

  /**
   * Light mode — recommended main theme
   * This should be the default look for BrickValue.
   */
  light: {
    background: '#F5F5F7',
    backgroundElevated: '#FFFFFF',
    backgroundMuted: '#EFEFF4',

    surface: '#FFFFFF',
    surfaceGlass: 'rgba(255, 255, 255, 0.72)',
    surfaceGlassStrong: 'rgba(255, 255, 255, 0.88)',
    surfaceSubtle: '#F9FAFB',

    border: '#E5E5EA',
    borderStrong: '#D1D1D6',

    text: '#111111',
    textSecondary: '#3A3A3C',
    textMuted: '#6E6E73',
    textDisabled: '#A1A1AA',
    textInverse: '#FFFFFF',

    primary: '#F2CD37',
    primaryPressed: '#D9B52F',
    primarySoft: '#FFF7D6',

    tabActive: '#111111',
    tabInactive: '#6E6E73',

    shadow: 'rgba(17, 17, 17, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.32)',
  },

  /**
   * Dark mode / Pro mode
   * Use this for scanner camera overlays, Pro paywall, or optional dark theme.
   */
  dark: {
    background: '#0E0F11',
    backgroundElevated: '#17181C',
    backgroundMuted: '#1F2026',

    surface: '#17181C',
    surfaceGlass: 'rgba(31, 32, 38, 0.72)',
    surfaceGlassStrong: 'rgba(31, 32, 38, 0.88)',
    surfaceSubtle: '#202127',

    border: '#2C2D33',
    borderStrong: '#3A3B42',

    text: '#F5F5F7',
    textSecondary: '#D1D1D6',
    textMuted: '#A1A1AA',
    textDisabled: '#6E6E73',
    textInverse: '#111111',

    primary: '#F2CD37',
    primaryPressed: '#D9B52F',
    primarySoft: 'rgba(242, 205, 55, 0.14)',

    tabActive: '#F5F5F7',
    tabInactive: '#8E8E93',

    shadow: 'rgba(0, 0, 0, 0.42)',
    overlay: 'rgba(0, 0, 0, 0.56)',
  },

  /**
   * Functional states
   * These are for scan results, value movement, collection state, and errors.
   */
  semantic: {
    success: '#2F8F63',
    successSoft: '#EAF6F0',

    warning: '#FFB020',
    warningSoft: '#FFF4DA',

    danger: '#C94A3A',
    dangerSoft: '#FCEDEA',

    info: '#6E6E73',
    infoSoft: '#EFEFF4',

    rare: '#3A3A3C',
    rareSoft: '#EFEFF4',
  },

  /**
   * LEGO signal colour.
   * Keep this narrow so the app does not become a multi-colour toy UI.
   */
  lego: {
    yellow: '#F2CD37',
    yellowPressed: '#D9B52F',
    yellowSoft: '#FFF7D6',
    yellowBorder: '#F5D85C',
    black: '#05131D',
    white: '#FFFFFF',
    lightBluishGray: '#A0A5A9',
    darkBluishGray: '#6C6E68',
  },
} as const;

export const accents = {
  green: {
    primary: '#00C805',
    pressed: '#00A904',
    softLight: '#E6F9E0',
    softDark: 'rgba(0, 200, 5, 0.16)',
    contrast: '#FFFFFF',
  },
  yellow: {
    primary: '#F2CD37',
    pressed: '#D9B52F',
    softLight: '#FFF7D6',
    softDark: 'rgba(242, 205, 55, 0.14)',
    contrast: '#101012',
  },
  blue: {
    primary: '#42DAD1',
    pressed: '#2DBCB4',
    softLight: '#DDF8F6',
    softDark: 'rgba(66, 218, 209, 0.14)',
    contrast: '#071817',
  },
} as const;

export const gradients = {
  /**
   * Main app background.
   * Works well behind glass cards.
   */
  appBackground: ['#F8F8FA', '#F1F2F6'],

  /**
   * Use for scan screen hero / camera entry cards.
   */
  scanHero: ['#FFFFFF', '#F2F4F8'],

  /**
   * Use for Pro/paywall moments.
   */
  proHero: ['#111111', '#2B2B2D'],

  /**
   * Subtle brand lift.
   * Use only for small highlights, not the full app.
   */
  brandAccent: ['#F2CD37', '#F5D85C'],
} as const;

export const opacity = {
  glassLight: 0.72,
  glassStrong: 0.88,
  disabled: 0.42,
  pressed: 0.72,
  overlayLight: 0.32,
  overlayDark: 0.56,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  /**
   * Keep this simple for React Native / Expo.
   * If you use custom fonts later, update fontFamily here.
   */
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  size: {
    caption: 12,
    footnote: 13,
    body: 16,
    bodyLarge: 17,
    title3: 20,
    title2: 24,
    title1: 32,
    hero: 40,
  },

  lineHeight: {
    caption: 16,
    footnote: 18,
    body: 22,
    bodyLarge: 24,
    title3: 26,
    title2: 30,
    title1: 38,
    hero: 46,
  },

  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const shadows = {
  /**
   * React Native shadow tokens.
   * Use soft depth to support the glassy Apple-style look.
   */
  soft: {
    shadowColor: '#111111',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  medium: {
    shadowColor: '#111111',
    shadowOpacity: 0.10,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  strong: {
    shadowColor: '#111111',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
} as const;

export const theme = {
  colors,
  gradients,
  opacity,
  radius,
  spacing,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;
export type ColorMode = 'light' | 'dark';
export type AccentName = keyof typeof accents;
export type ThemeColors = typeof colors;

export const getThemeColors = (mode: ColorMode = 'light', accentName: AccentName = 'green') => {
  const accent = accents[accentName];
  return {
    ...colors[mode],
    primary: accent.primary,
    primaryPressed: accent.pressed,
    primarySoft: mode === 'light' ? accent.softLight : accent.softDark,
  };
};

export type ModeColors = ReturnType<typeof getThemeColors>;
