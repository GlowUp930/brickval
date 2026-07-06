import * as SecureStore from "expo-secure-store";

export type ThemePreference = "system" | "dark" | "light";

const SMART_AUTO_SCAN_KEY = "brickval_smart_auto_scan";
const THEME_PREFERENCE_KEY = "brickval_theme_preference";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "dark" || value === "light";
}

export async function getSmartAutoScanPreference(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(SMART_AUTO_SCAN_KEY);
    return value !== "0";
  } catch {
    return true;
  }
}

export async function setSmartAutoScanPreference(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(SMART_AUTO_SCAN_KEY, enabled ? "1" : "0");
  } catch {
    // Preference storage is non-critical; keep the in-memory UI responsive.
  }
}

export async function getThemePreference(): Promise<ThemePreference> {
  try {
    const value = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);
    return isThemePreference(value) ? value : "dark";
  } catch {
    return "dark";
  }
}

export async function setStoredThemePreference(preference: ThemePreference): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, preference);
  } catch {
    // Preference storage is non-critical; keep the in-memory UI responsive.
  }
}
