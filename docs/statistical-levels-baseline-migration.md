# Statistical Levels baseline authority migration

Founder decision: ADOPT_REPAIRED_REBASELINE, explicitly as a data authority migration. Candidate only; no publication approval, staging, commit or history rewrite is part of this change.

OLD_BASELINE is the historical published snapshot evidence at commit `5859071ac43180decec28570bc3859dd905734f7`. OLD_RAW was not archived and is unrecoverable from the snapshots. The old snapshots are retained in Git history; this record does not claim they were wrong.

NEW_BASELINE is the exact frozen Yahoo corpus plus the repaired deterministic generator and the completed-period policy. PROVIDER_DRIFT_CAUSE remains **UNEXPLAINED**. Acceptance is an explicit Founder baseline migration; no claim of a proven Yahoo correction or corporate-action restatement is made. The legacy generator on the new authority is a counterfactual for decomposition only, never a publication candidate.

Baseline ID: `STATISTICAL_LEVELS_RAW_AUTHORITY_20260906T163225Z`. Snapshot cutoff: `2026-09-06T16:32:25Z`. The private durable archive is under the local user's `Library/Application Support/LuiguiHerrera/statistical-levels/raw-authority/2026-09-06T163225Z/`, outside Git, worktrees and temporary storage. Directories are 0700, files 0600. It holds all 40 original response bytes, the exact raw manifest, SHA256SUMS and operational README. Do not delete it during build, worktree, repository or evidence cleanup. It is immutable by process convention after verification.

Raw-manifest SHA256: `0464f4ceda2005fae95b385875018e49e0aaed94f1e759f456e7f5f741ddcb44`.

Archive-manifest SHA256: `f8d7448e27e818dab35073fb7457b267a530ad9a191220380ba2699ff6c62d4f`. This hashes SHA256SUMS, which binds the 40 response files and the adjudicated raw manifest. Raw bytes are not stored in this repository or the Founder review ZIP.

## Current mark and completed history

Yahoo timestamps show UTC-midnight daily bars for BTC/ETH. At the intraday cutoff their September 6 bar is incomplete. Current BTC/ETH marks may be dated September 6; daily historical returns, distributions, seasonality, drawdowns and correlations end September 5. ETF regular-session metadata confirms the September 4 session ended before cutoff; it is the last completed daily observation for all 38 ETFs.

All current ISO-week and calendar-month aggregates are excluded from historical samples. Completed weekly observations end August 28 for ETFs and August 30 for crypto; completed monthly observations end August 31. Historical interpretation, percentile, z-score and risk explicitly use the last completed period at the selected frequency. Separate current opening/mark data remain available in the opening-level range; its distribution excludes the current period. No current mark is forced into historical samples.

Correlations inner-join completed valid returns by UTC date / ISO-week Monday / calendar-month key. Each cell reports matched N and an effective-through date. For weekly/monthly joins that date is the earlier actual observation end in the last matched pair. Daily BTC–SPY therefore ends September 4 although BTC has a September 6 mark. The Pearson formula and minimum N=20 remain unchanged.

## Reproducible generation and provenance

`npm run build:stat-levels` now generates only from the private archived authority. Optional `--archive` and `--output` arguments support controlled copies and outside-Git qualification. Missing manifest/configuration fields, wrong raw/hash/symbol/count/date identity, duplicate dates, data after cutoff, missing sources and unexpected corpus size reject generation before output writes. No provider loop is executed. The existing hosted scheduled workflow has no access to this private local archive and therefore cannot regenerate this baseline there; it will reject a missing archive. Precomputed candidate snapshots can be built locally. Future hosted regeneration or acquisition needs separately authorized archive provisioning or a new baseline identity. No workflow or deployment settings were changed in this task. The exact raw manifest and every input hash are verified again before outputs are written.

`baseline-config.json` is the explicit cutoff/schema/authority/build-clock configuration. `baseline-policy.mjs` is the shared sample-admission boundary. `statistical-levels-offline.mjs` executes the recovered formula function bodies without their provider imports or output loops. Its completed-period adapter is applied identically to legacy and repaired runs, so changes caused by this Founder policy belong to baseline migration. The legacy runner imports no repaired helper. The repaired correlation adds matched-date evidence; historical formulas outside the six repair scopes remain unchanged.

All 81 final snapshot byte hashes are bound in `generated-provenance.json`. Each binding records RAW_SOURCE_ID, RAW_SHA256, RAW_ROW_COUNT, RAW_FIRST_DATE, RAW_LAST_DATE, SNAPSHOT_CUTOFF, CURRENT_MARK_TIMESTAMP and LAST_COMPLETED_OBSERVATION for its input(s), plus GENERATOR_COMMIT, GENERATOR_SHA256, CONFIG_SHA256, SNAPSHOT_SHA256, GENERATED_AT and SCHEMA_VERSION. The manifest snapshot binds all 40 sources. Generator SHA binds the source bundle including the adapter and shared helpers. Config SHA binds the complete explicit configuration. No filesystem timestamp is used as input authority.

The recorded generator commit is the candidate's base commit; SOURCE_STATE explicitly identifies the uncommitted, content-addressed candidate. NEW_BASELINE_CANDIDATE_COMMIT is **NONE until Founder publication approval**. GENERATED_AT is the fixed assigned candidate build timestamp, distinct from the historical semantic cutoff; actual run timestamps belong to external qualification evidence. This preserves byte reproducibility without claiming that both physical executions occurred at one instant.

## Numerical adjudication

The legacy and repaired generators consumed identical archived raw bytes and the same final completed-history policy. Two repaired runs produced identical hashes for all 81 snapshots and the provenance manifest.

| Comparison | Existing values changed | Added | Removed | Total scalar differences |
| --- | ---: | ---: | ---: | ---: |
| A: old published → legacy final-as-of | 183,686 | 2,411 | 2,032 | 188,129 |
| B: legacy final-as-of → repaired final-as-of | 608 | 586,104 | 0 | 586,712 |
| C: old published → final repaired | 184,244 | 588,515 | 2,032 | 774,791 |

A is fully classified BASELINE_AUTHORITY_MIGRATION, including the shared completed-history policy; it is not a repair or proven provider correction. B has zero unattributed differences. Its additions are 547,492 dated-history scalar fields (273,746 date/close points), 200 completed-seasonality metadata fields, 19,200 matched-N values, 19,200 effective-through dates and 12 alignment labels. Its 608 changed existing values are repaired correlation coefficients. SL-DEF-002/003/004 retain their presentation corrections with no snapshot delta; the completed-history policy already applies to both sides of B, leaving only SL-DEF-005 provenance enrichment there.

All 4,679,671 non-target scalar fields are equal. The 774,791 total differences have 100% arithmetic/structural lineage coverage and zero unclassified differences. Scalar counts include duplicated serialized aliases, date fields and both symmetric matrix orientations; they are not counts of independent economic observations. Parent repair and NEW_DATED_HISTORY/NEW_SAMPLE_N labels overlap and must not be summed twice. C alone is not repair-correctness proof.

Final review-only screenshots, numerical CSVs and evidence ZIPs remain outside Git. The durable capability ledger, feature matrix, calculation/defect audit, this migration record, required tests/configuration and provenance sidecar support future audit. AGENTS.md and CLAUDE.md are generated local noise, excluded from the proposed publication file set. Earlier review-only reports/scripts are not final certification.
