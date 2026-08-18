import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: "production",
  release: process.env.VERCEL_GIT_COMMIT_SHA
    ? `brickval-backend@${process.env.VERCEL_GIT_COMMIT_SHA}`
    : undefined,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});
