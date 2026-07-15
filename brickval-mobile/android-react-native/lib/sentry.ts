import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const SENTRY_DSN = String(Constants.expoConfig?.extra?.sentryDsn ?? "");

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: Constants.appOwnership === "expo" ? "development" : "production",
    tracesSampleRate: 0.2,
    enableNative: true,
    appHangTimeoutInterval: 5,
    debug: false,
  });
}

export function capturePaywallError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>
) {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error, {
    tags: { module: "paywall" },
    extra: { context, ...extra },
  });
}

export function captureScanError(
  stage: string,
  error: unknown,
  extra?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    tags: { module: "scan-session", stage },
    extra,
  });
}

export function recordScanTimings(extra: Record<string, number | string>) {
  Sentry.addBreadcrumb({
    category: "scan-session",
    level: "info",
    message: "Scan session completed",
    data: extra,
  });
}

export { Sentry };
