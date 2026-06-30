import * as SecureStore from "expo-secure-store";

export type PrimaryGoal = "catalog" | "resell" | "deal_check";

const ONBOARDING_COMPLETE_KEY = "has_completed_onboarding";
const PRIMARY_GOAL_KEY = "primary_goal";

export async function hasCompletedOnboarding() {
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
