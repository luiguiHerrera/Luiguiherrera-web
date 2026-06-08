export type AnalyticsEvent =
  | "page_view"
  | "diagnostic_started"
  | "diagnostic_step_completed"
  | "diagnostic_completed"
  | "dashboard_module_opened"
  | "quant_lab_opened"
  | "red_flags_completed";

export type DashboardModuleId = "rates" | "sectors" | "vix" | "btc-flows" | "cross-signal-radar";

type AnalyticsMetadata = {
  page_view: { path: string };
  diagnostic_started: undefined;
  diagnostic_step_completed: { step_index: number };
  diagnostic_completed: undefined;
  dashboard_module_opened: { module: DashboardModuleId };
  quant_lab_opened: undefined;
  red_flags_completed: undefined;
};

const allowedMetadataKeys: Record<AnalyticsEvent, readonly string[]> = {
  page_view: ["path"],
  diagnostic_started: [],
  diagnostic_step_completed: ["step_index"],
  diagnostic_completed: [],
  dashboard_module_opened: ["module"],
  quant_lab_opened: [],
  red_flags_completed: [],
};

// Privacy boundary:
// Analytics events are intentionally limited to anonymous product usage signals.
// Do not add financial inputs, portfolio composition, wealth/patrimony, individual
// answers, names, emails, free text, IP data, or any user-identifying fields here.
// This stub does not send data anywhere; it only logs allowed event names and
// whitelisted metadata during local development.
export function trackEvent<TEvent extends AnalyticsEvent>(
  eventName: TEvent,
  metadata?: AnalyticsMetadata[TEvent],
) {
  if (process.env.NODE_ENV === "development") {
    const safeMetadata = sanitizeMetadata(eventName, metadata);
    console.log("[analytics]", eventName, safeMetadata);
  }
}

function sanitizeMetadata<TEvent extends AnalyticsEvent>(
  eventName: TEvent,
  metadata?: AnalyticsMetadata[TEvent],
) {
  if (!metadata) {
    return {};
  }

  const allowedKeys = allowedMetadataKeys[eventName];
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => allowedKeys.includes(key)),
  );
}
