export type AnalyticsEvent =
  | "page_view"
  | "diagnostic_started"
  | "diagnostic_step_completed"
  | "diagnostic_completed"
  | "dashboard_module_opened"
  | "quant_lab_opened"
  | "red_flags_completed";

type SafeMetadata = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: AnalyticsEvent, metadata: SafeMetadata = {}) {
  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", eventName, metadata);
  }
}
