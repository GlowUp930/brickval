import * as SecureStore from "expo-secure-store";

export type PrimaryGoal = "catalog" | "resell" | "deal_check";

const ONBOARDING_COMPLETE_KEY = "has_completed_onboarding";
const PRIMARY_GOAL_KEY = "primary_goal";

export async function hasCompletedOnboarding() {
  return (await SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY)) === "true";
}

export async function setCompletedOnboarding() {
  await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, "true");
}

export async function setPrimaryGoal(goal: PrimaryGoal) {
  await SecureStore.setItemAsync(PRIMARY_GOAL_KEY, goal);
}
