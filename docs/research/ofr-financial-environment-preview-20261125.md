# OFR Financial environment — preview, 25 November 2026

Scope: one dashboard card, ES/EN. Production dashboard and default branch remain unchanged. Preview routes are noindex and return 404 in the Vercel production environment:

- `/dashboard/preview-entorno-financiero`
- `/en/dashboard/financial-environment-preview`

## Official publication used

CSV: https://www.financialresearch.gov/financial-stress-index/data/fsi.csv

Methodology: https://www.financialresearch.gov/financial-stress-index/

Underlying indicator inventory: https://www.financialresearch.gov/financial-stress-index/files/indicators/index.html

Verified 6,807 observations, 2000-01-03 through 2026-11-20. The bundled fallback is the complete real official CSV, with retrieval timestamp and SHA-256 `14b7a27bfceef7079a4d790dc548ee9295c9000d69cc3e0864330a87fe9800b3`.

Current FSI −0.449; comparison 2026-10-23, FSI −1.319; difference over 20 published sessions +0.870 index points. Current positive category: Volatility +0.906. Categories and regions reconcile separately at both endpoints and for changes within the source's three-decimal rounding budget.

The official historical regional decomposition on 2018-11-01 has a residual of −0.108 points. The original values remain unchanged, with a note in windows containing this date. The 33 individual input series are not supplied by this implementation.

## Hosting and failure behavior

Uses the existing Next Data Cache and Vercel cron mechanism; no new service or paid data source. A validated publication entry and a small separate refresh-status entry are revalidated hourly. When both refresh, they share one HTTP attempt per request. The source is fully parsed again, incorporating historical revisions.

Only a successful validated publication can write the dataset cache. A failed background refresh leaves the last successful publication intact, even if another request has just published a newer cut. A separate status record supplies the discreet failure notice on a subsequent read after the background refresh finishes. It also bounds retries during an outage. Missing cells remain null; no replacement index is calculated.

If the cache has no valid entry and the source fails, the real bundled capture is displayed with its original observation date and a failed-refresh notice. Data Cache is a cache, not archival storage; eviction or a changed function key can fall back to that bundled cut during an outage.

`/api/cron/ofr-fsi` follows the existing CRON_SECRET authorization pattern. A daily 17:15 UTC trigger is prepared in this feature branch. Vercel cron executes production deployments only; no production deployment or cron activation is part of this preview. Final activation and normal-dashboard integration require the user's approval.

## Verification

- Parser/model: source normalization, identical/conflicting duplicates, missing data, signs, exact t/t−20 endpoints, independent reconciliations, revisions and CSV original/derived columns.
- Source: network/HTTP/schema failures retain the previous validated cut and dates; successful revision clears failure; programming errors outside transport are not hidden.
- Actual Next unstable_cache under App Router: failed refresh retention, late failed concurrent request cannot roll back a newer successful publication, cold outage backoff and recovery.
- Browser: ES/EN switch preserves preview pairing, keyboard disclosure/radio arrows/history inspection, signed region/category changes, all-history anomaly notice, table pagination, full-window CSV download, 390px mobile contained table scrolling.
- Full website contract suite: 435 tests, 431 passed, four expected skips. Full lint: zero errors, 26 pre-existing warnings. Editorial and SEO validators pass; production build passes.
