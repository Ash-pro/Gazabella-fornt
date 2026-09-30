// نقطة دخول ضيقة لـ Sentry حتى يعمل tree-shaking (بدون Replay/Feedback)
export { init, captureException, captureMessage, setUser, browserTracingIntegration } from '@sentry/react'
