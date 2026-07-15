import * as SecureStore from "expo-secure-store";
import { Paths, File } from "expo-file-system";

export type PrimaryGoal = "catalog" | "resell" | "deal_check";

const ONBOARDING_COMPLETE_KEY = "has_completed_onboarding";
const PRIMARY_GOAL_KEY = "primary_goal";
const canary = new File(Paths.document, "launch-canary");

export async function hasCompletedOnboarding() {
  if (!canary.exists) {
    await SecureStore.deleteItemAsync(ONBOARDING_COMPLETE_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(PRIMARY_GOAL_KEY).catch(() => {});
    try { canary.write("1"); } catch {}
    return false;
  }
  try {
    return (await SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function setCompletedOnboarding() {
  try {
    await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, "true");
  } catch (error) {
    console.warn("Failed to save onboarding completion", error);
  }
}

export async function setPrimaryGoal(goal: PrimaryGoal) {
  try {
    await SecureStore.setItemAsync(PRIMARY_GOAL_KEY, goal);
  } catch (error) {
    console.warn("Failed to save onboarding goal", error);
  }
}
