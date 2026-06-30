/**
 * BrickValue Theme
 * ------------------------------------------------------------
 * Direction:
 * - Apple / Cal AI inspired: soft grey base, glassy cards, clean black text.
 * - LEGO collector signal: one sharp brick-red accent used sparingly.
 * - The UI should feel like a premium scanner / pricing tool, not a toy app.
 *
 * Usage rule:
 * 80% neutral surfaces
 * 15% text / borders / depth
 * 5% sharp accent for scan CTA, value movement, Pro moments
 */

export const colors = {
  /**
   * Brand accents
   * Use brickRed as the main brand action colour.
   * Use brickYellow only as a small LEGO-world supporting colour.
   */
  brand: {
    brickRed: '#C91A09',
    brickRedDark: '#A81608',
    brickRedSoft: '#FCECEA',

    brickYellow: '#F2CD37',
    brickYellowSoft: '#FFF7D6',

    collectorGreen: '#00A86B',
    collectorGreenSoft: '#E8F8F1',

    scanBlue: '#007AFF',
    scanBlueSoft: '#EAF3FF',
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

    primary: '#C91A09',
    primaryPressed: '#A81608',
    primarySoft: '#FCECEA',

    tabActive: '#111111',
    tabInactive: '#8E8E93',

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

    primary: '#FF3B30',
    primaryPressed: '#D92D20',
    primarySoft: 'rgba(255, 59, 48, 0.14)',

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
    success: '#00A86B',
    successSoft: '#E8F8F1',

    warning: '#FFB020',
    warningSoft: '#FFF4DA',

    danger: '#FF3B30',
    dangerSoft: '#FFE8E6',

    info: '#007AFF',
    infoSoft: '#EAF3FF',

    rare: '#7C3AED',
    rareSoft: '#F1EAFE',
  },

  /**
   * LEGO-inspired category colours.
   * Use these for small chips/tags only, never as full-screen backgrounds.
   */
  lego: {
    red: '#C91A09',
    yellow: '#F2CD37',
    blue: '#0055BF',
    green: '#237841',
    black: '#05131D',
    white: '#FFFFFF',
    lightBluishGray: '#A0A5A9',
    darkBluishGray: '#6C6E68',
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
  proHero: ['#111111', '#2A1A1A'],

  /**
   * Subtle brand lift.
   * Use only for small highlights, not the full app.
   */
  brandAccent: ['#C91A09', '#FF3B30'],
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
export type ThemeColors = typeof colors;
export type ModeColors = ThemeColors['light'] | ThemeColors['dark'];
export type ColorMode = 'light' | 'dark';

export const getThemeColors = (mode: ColorMode = 'light') => {
  return colors[mode];
};
