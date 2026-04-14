import Constants from "expo-constants";

const SUPERWALL_UPGRADE_PLACEMENT = "brickval_upgrade";
const isExpoGo = Constants.appOwnership === "expo";
const shouldInitNativePaywall = Constants.expoConfig?.extra?.enableNativePaywall === true;

function loadSuperwallSdk() {
  if (isExpoGo || !shouldInitNativePaywall) return null;

  try {
    const sdk = require("@superwall/react-native-superwall");
    return {
      Superwall: sdk.default,
      PaywallPresentationHandler: sdk.PaywallPresentationHandler,
    };
  } catch (error) {
    console.warn("Superwall SDK unavailable", error);
    return null;
  }
}

export async function syncSuperwallIdentity(userId: string | null): Promise<void> {
  const sdk = loadSuperwallSdk();
  if (!sdk?.Superwall?.identify) return;

  try {
    if (userId) {
      await sdk.Superwall.identify({ userId });
      return;
    }

    if (sdk.Superwall.reset) {
      await sdk.Superwall.reset();
    }
  } catch (error) {
    console.warn("Failed to sync Superwall identity", error);
  }
}

export async function syncSuperwallSubscriptionState(isPro: boolean): Promise<void> {
  const sdk = loadSuperwallSdk();
  if (!sdk?.Superwall?.setUserAttributes) return;

  try {
    await sdk.Superwall.setUserAttributes({ is_pro: isPro });
  } catch (error) {
    console.warn("Failed to sync Superwall user attributes", error);
  }
}

export async function presentSuperwallUpgrade(fallback: () => void): Promise<void> {
  const sdk = loadSuperwallSdk();
  if (!sdk?.Superwall?.register || !sdk?.PaywallPresentationHandler) {
    fallback();
    return;
  }

  const handler = new sdk.PaywallPresentationHandler();
  handler.onSkip((reason: { name?: string }) => {
    const reasonName = reason?.name ?? "";
    if (
      reasonName === "PaywallSkippedReasonPlacementNotFound" ||
      reasonName === "PaywallSkippedReasonNoAudienceMatch"
    ) {
      fallback();
    }
  });
  handler.onError(() => {
    fallback();
  });

  try {
    await sdk.Superwall.register({
      placement: SUPERWALL_UPGRADE_PLACEMENT,
      handler,
    });
  } catch (error) {
    console.warn("Superwall register failed", error);
    fallback();
  }
}
