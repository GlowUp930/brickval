import * as Sentry from "@sentry/nextjs";

type BulkScanErrorContext = {
  endpoint: string;
  statusCode: number;
  scanSource: "camera" | "photoLibrary";
  regionCount: number | null;
  appPlatform?: string | null;
  appVersion?: string | null;
  appBuild?: string | null;
};

export async function reportBulkScanError(error: unknown, context: BulkScanErrorContext): Promise<void> {
  const normalizedError = error instanceof Error
    ? error
    : new Error(typeof error === "string" ? error : "Bulk scan request failed.");
  const deployment = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
  const release = process.env.VERCEL_GIT_COMMIT_SHA
    ? `brickval-backend@${process.env.VERCEL_GIT_COMMIT_SHA}`
    : "brickval-backend@local";

  Sentry.withScope((scope) => {
    scope.setLevel(context.statusCode >= 500 ? "error" : "warning");
    scope.setTag("runtime", "backend");
    scope.setTag("endpoint", context.endpoint);
    scope.setTag("scan_source", context.scanSource);
    scope.setTag("http_status", String(context.statusCode));
    scope.setTag("region_count", String(context.regionCount ?? "unknown"));
    scope.setTag("deployment", deployment);
    scope.setTag("release", release);
    if (context.appPlatform) scope.setTag("app_platform", context.appPlatform);
    if (context.appVersion) scope.setTag("app_version", context.appVersion);
    if (context.appBuild) scope.setTag("app_build", context.appBuild);
    scope.setContext("bulk_scan", {
      region_count: context.regionCount,
      deployment,
      release,
    });
    Sentry.captureException(normalizedError);
  });
  // Route handlers can be torn down immediately after the response. Flush only
  // on handled failures so the event is not lost in a serverless runtime.
  await Sentry.flush(2_000);
}
