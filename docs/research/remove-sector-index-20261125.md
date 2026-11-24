# Remove sector fragility and align dashboard views — 25 November 2026

Removes the former five-condition, 0–100 in-house sector-fragility heuristic from current calculations, response types, dashboard overview and quantitative panel. Existing validated cache entries are sanitized so their retired fields cannot leak back into live response data. EWMA, GARCH, correlations and dispersion retain exactly the published scalar outputs in regression comparisons against af4329a8.

Home ES/EN and Dashboard ES/EN consume one locale-independent five-minute data capture. Request-time rendering prevents independent page captures. Failed daily promises are released; raw provider responses are not cached because an HTTP 200 may contain a quota failure. Only complete validated sector snapshots remain in the existing daily cache. A validated delayed McClellan observation remains readable with its actual cutoff and stale flag, without replacing the fresh cache.

Home uses the same /100 score format and unavailable states as Dashboard. VIX uses two decimals with locale formatting. Home displays actual dated rotation, VIX and VX observations. It does not invent a single composite observation date. English VIX state labels and full composite descriptions now agree across overview, detail and Home.

The integrated regime calculation is unchanged. The separate proposed regime preview is not included in this candidate. Historical reports, the 24 November AC snapshot, the daily producer and the portfolio-fragility lab remain byte-identical to production.

Validation: 408 selected website tests passed locally, 3 private archive cases skipped; build, typecheck, editorial and SEO checks passed. Lint retains 26 existing warnings with no errors. Four actual local pages shared the same capture ID and timestamp. Provider availability may produce an honest Incomplete reading; missing values are never converted into zero or fabricated history.
