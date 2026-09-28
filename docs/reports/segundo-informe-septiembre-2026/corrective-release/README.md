# Corrective release — Segundo Informe de septiembre de 2026

## Historical V1 authority

**HISTORICAL_V1_REPRODUCED=NO.** The missing edge is deployed code → time-admissible inputs, including source selection and cache state. A deterministic replay with inputs collected on 21 September cannot prove the state served on 18 September. Score, confidence, bias and label remain unpublished. Frozen quantitative evidence is unchanged.

Cutoff: **2026-09-18 23:59:59 UTC**. Vercel identifies production deployment `dpl_FwDTx8HZPNdPZDEiFKGxAVjxfcZ6`, URL `https://luiguiherrera-g0n62qbg5-luigui-herrera-s-projects.vercel.app`, commit `4ee6adb006f360fea13837db5f7d45815f297b55`. Created 8 September 15:43:49.728 UTC, ready 15:45:06.682, aliases assigned 15:45:07.072, including `www.luiguiherrera.com` and `luiguiherrera.com`. The production history and alias events corroborate assignment; no later production deployment appears before the cutoff. The inspected history reaches 26 August, before the required interval. This is metadata evidence, not a present-day request to an old live dashboard.

`historical-v1-audit.json` preserves selected deployment metadata, production history, alias events, CI receipts, query failures and evidence hashes. `deployed-v1-code.json` is recovered directly from the deployment commit. The six recovered files are identical to the earlier reconciliation code at c74e95c; code identity alone supplies no input timestamp.

### Exact engine and adapter rules

- Weights: sector rotation 45%, VIX 40%, BTC ETF flows 15%; no retrospective substitution of the independent report Farside series into the regime.
- Label thresholds: scores ≤20 stress only with stress confirmation (otherwise caution), ≤40 caution, ≤60 neutral/mixed, ≤80 selective risk-on, above 80 constructive risk-on. Bias derives from label. Confidence starts at 88, subtracts pillar penalties and is clamped to 35–95. Full scoring, stress overrides and missing-sector behavior are preserved in the recovered source.
- Sectors: 11 Alpha Vantage `TIME_SERIES_DAILY` series, unadjusted closes; daily fetch revalidation, Next persistent cache (`dashboard-sector-snapshot-v2`) and an in-process daily cache. Reconciled 18 September series were captured on 21 September. Their observation date does not prove the response/cache admitted on 18 September. Yahoo adjusted prices from Statistical Levels or V2 are a different convention.
- VIX: FRED VIXCLS CSV, daily fetch revalidation. A valid series ending 17 September can be admitted as automated; the date alone is not a rejection. However, the FRED response/cache at the cutoff was not recovered. V2's contemporaneous CBOE capture does not prove what this FRED adapter served.
- BTC: Bitbo primary; Farside all-data, then `/btc/`, only on primary failure. Responses revalidate daily. Latest data becomes delayed only when more than four days old; partial history can still be admitted. Confidence penalty is 0/6/10 for automated history with ≥20/10–19/<10 rows, or 14 for delayed data. A 17 September observation would not itself have been delayed on 18 September. The 21 September 70/74 observation is therefore not temporal authority even with identical code. No timestamped primary table, primary failure/fallback receipt, or cache version proves the selected source and rows at cutoff.

### Evidence exhausted within available access

- Vercel: 100-entry deployment history, production metadata, alias activity (76 events in the bounded interval), GitHub commit status, existing local `.vercel` metadata and publication receipts.
- Runtime logs: both the full 18 September UTC day and 20:00–23:59:59 windows returned CLI `Response Error (400)`. These logs were **unavailable**, not proven absent. Deployment events query returned `[]`; this is not a runtime log archive. Historical deployment file-tree API returned 404. No unsupported retention assumption is made.
- GitHub CI on 18–19 September: statistical-levels jobs and V2 shadow observations. Downloaded durable V2 receipts are preserved. The 18 September job completed at 13:06 UTC with expected session 17 September; the 19 September job was after cutoff. Source records are Yahoo adjusted-close/CBOE/CFE, not V1's Alpha Vantage/FRED/Bitbo chain. They supply no historical Bitbo selection receipt.
- Repository docs, evidence, snapshots, saved HTML and reconciliation archives: September 21 captures and September 19 statistical authority establish the already published frozen report, but not the V1 input admission chain. Existing local Next cache search found no matching 18 September/17 September Bitbo evidence. No timestamped screenshot or RSC record of the exact cutoff was found in these sources.

The audit establishes deployment and code, but cannot establish exact historical dates/status/source selection for any complete set of three V1 inputs. The standalone report still uses reconciled sector data dated 18 September, VIX dated 17 September, and Farside flows through 18 September (+6.1 M USD over five sessions). These are unchanged and explicitly distinct from historical regime inputs.

## Approved correction and drift controls

- Omitted V1 renders a compact note with native `details` (“Ver límite metodológico”), including unchanged technical explanation. No null score/confidence/bias metric cards.
- The second edition opts into VIX left / BTC and GLD stacked right from tablet width; mobile retains VIX → BTC → GLD. One instance of each card.
- Generic `calendarView`/`calendarStartDate`: remaining month from 2026-09-21, aligned Monday–Sunday. Web/HTML/PDF show 21–30; Markdown retains the unchanged event list. Events and ICS remain byte-identical. Historical editions default to full month.
- All 18 watchlist controls have descriptive destinations: 9 external, 9 internal. Nine semantic asset anchors open native disclosures. HTML/Markdown/PDF also preserve actionable links.
- One B group contains B1–B20 in order **plus the already published unnumbered BOJ supplementary document** (21 list entries). No source was discarded to force a misleading count of 20. A/C entries remain unchanged. PDF breaks entries independently; pagination no longer defines editorial source groups.
- `editorial-baseline.json` is the published report object at `1245162074e5aef147e3384b1e7c978332e6b45d`. Regression tests remove only approved presentation fields, anchors and destinations, flatten source-group boundaries, and require exact equality.
- `baseline-hashes.json` guards every existing archived report artifact, frozen snapshot, Statistical Levels and V2 file. Only the second HTML/Markdown/PDF and manifest may change. ICS, earlier reports and all quantitative files must retain their hashes.

## Candidate QA

26 tests passed (13 historical First, 9 Second, 4 corrective regressions); reports:validate passed (6 reports / 23 artifacts); reports:check passed (24 deterministic files); typecheck passed; lint passed with 17 pre-existing warnings and no errors. Local Next build passed with `--webpack`: Turbopack rejects the isolated checkout's node_modules symlink outside its root. Vercel uses its normal installation and production build.

Browser QA: 1280 desktop, 768 tablet, 390 mobile; layout/order, clipping, calendar days/events, compact omission, 18 links, one B heading and deep-link disclosure opening. PDF rendered and all pages inspected; final pagination is 21 pages with the disclaimer together with its heading. Link checks: normal HTTP 200 for Dashboard, Fed, EIA, WGC, BOJ, Alianza; FRED curl transport errors and Farside curl 403 were resolved by direct web-reader verification of the exact pages. No 404 or placeholder destination found. See `link-checks.json` for raw transport results and alternate verification.
