// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

console.log("[Sentry Debug] SENTRY_DSN:", SENTRY_DSN);
console.log("[Sentry Debug] Sentry module:", typeof Sentry);

if (SENTRY_DSN) {
  console.log("[Sentry Debug] Initializing Sentry with DSN...");
  Sentry.init({
    dsn: SENTRY_DSN,
    debug: true, // 启用调试日志
    // Add optional integrations for additional features
    integrations: [
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration({ instrumentNavigation: false })
    ],

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // Enable sending user PII (Personally Identifiable Information)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
  });
  console.log("[Sentry Debug] Sentry initialized successfully");
} else {
  console.log("[Sentry Debug] No SENTRY_DSN provided, Sentry not initialized");
}

export const onRouterTransitionStart = SENTRY_DSN ? Sentry.captureRouterTransitionStart : () => {};
