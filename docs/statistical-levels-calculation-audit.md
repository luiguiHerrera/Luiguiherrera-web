# Statistical Levels calculation and defect audit

The approved redesign retains all 87 capabilities. Numerical authority is the Founder-approved frozen Yahoo corpus and final completed-history policy documented in [the baseline migration record](statistical-levels-baseline-migration.md). Historical drift cause remains UNEXPLAINED. Old published values are historical evidence; exact old raw reconstruction is not claimed.

| Defect | Final behavior | Verification |
| --- | --- | --- |
| SL-DEF-001 | Full dated completed history; selected-window graph and risk metrics share observations and N. | Every available window replays current/max drawdown at canonical precision; 273,746 history points independently match legacy aggregation. |
| SL-DEF-002 | Price and MA paths share one domain and preserve missing segments. | Distinct ranges no longer collapse; common-level and gap fixtures pass. |
| SL-DEF-003 | Legacy daily storage aliases retain 4/12/52/126/252-session values; presentation names those counts. | ES/EN labels and all aliases verified. |
| SL-DEF-004 | Missing close location is excluded; valid zero remains a low close. Valid-sample N controls summaries and unavailable rankings. | Null/undefined/nonfinite/zero and empty-sample fixtures. |
| SL-DEF-005 | Daily history obeys completed session/UTC day admission; current ISO week and month are excluded. | Boundary tests, archived-provider timestamp audit, all 368,896 seasonality cells checked against independent membership and unchanged aggregation. |
| SL-DEF-006 | Correlations inner-join completed valid dates, retain Pearson/N≥20, and disclose matched N plus effective-through date. | Missing/shifted/unordered/duplicate/null/inverse/zero-variance fixtures; all 19,200 matrix cells independently checked. |

The shared final as-of policy is applied before BOTH legacy and repaired counterfactual generation. This is a baseline-authority migration input policy; it is not counted as a difference between repaired and legacy code. Current mark and current opening-level capabilities remain separate from historical samples. All original non-target formula function bodies remain identical; exact final-input B comparison has 100% non-target scalar equivalence.

Tests are in contracts.test.ts, defect-repairs.test.ts and baseline.test.mjs. Full repository tests, typecheck, lint, production build, SEO and final-data browser qualification form the release review gate. The old qualify-statistical-levels.mjs and repair-statistical-levels-snapshot.mjs workflows describe earlier frozen-value phases and must not regenerate this authority or certify the final baseline. See the provenance sidecar and the external final three-way decomposition instead.
