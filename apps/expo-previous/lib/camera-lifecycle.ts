export type CameraAppState = "active" | "background" | "inactive" | "unknown" | "extension";

export function shouldRunCamera(input: {
  enabled: boolean;
  screenFocused: boolean;
  appState: CameraAppState;
}): boolean {
  return input.enabled && input.screenFocused && input.appState === "active";
}
