"use client";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { trendCatalog, trendPath, trendsMethodologyPath } from "@/lib/trends/catalog";

// Delegated product clicks keep the editorial page server-rendered. The existing
// privacy-preserving analytics stub receives only stable product identifiers.
export function TrendsAnalytics() {
  useEffect(() => {
    const root = document.querySelector("[data-trends-page]");
    function onClick(event: Event) {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (!target) return;
      if (target.dataset.capitalCompany) {
        trackEvent("capital_company_opened", { security_id: target.dataset.capitalCompany }); return;
      }
      const url = new URL(target.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if ([trendsMethodologyPath("es"), trendsMethodologyPath("en")].includes(url.pathname)) {
        trackEvent("trends_methodology_opened"); return;
      }
      const trend = trendCatalog.find((trend) => [trendPath(trend, "es"), trendPath(trend, "en")].includes(url.pathname));
      if (trend) trackEvent(target.hasAttribute("data-deep-dive") ? "trend_deep_dive_opened" : "trend_opened", { trend_id: trend.id });
    }
    root?.addEventListener("click", onClick);
    return () => root?.removeEventListener("click", onClick);
  }, []);
  return null;
}
