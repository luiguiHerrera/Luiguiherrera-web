# Internal shadow runbook

**Verification migration notice.** `run-verification.py`, `close-verification.py` are retired historical workspace entrypoints: they print `RETIRED_WORKSPACE_VERIFIER` and exit 2 without verification or evidence access. Use the [portable candidate verification guide](../release-candidate/verification-guide.md). The stage verification instructions and results below remain historical records preserved in RC0 `f5fc7ecfd9e1f323d0ad3a43eccec1dbc500be1c`; they are not recalculated. Maintainer observation, bundle preparation and replay tools remain available under their existing authorization requirements.

V1 remains public authority. `V2_SHADOW` defaults to `OFF`; Maintainer did not deploy, schedule, enable Designer or perform production cutover. Run the commands below from the repository root using its installed Node environment. A shadow run may use the same provider requests as the existing Dashboard pipeline; exact snapshot replay and the frozen verification harness require no market-data fetch.

## Normal operation

Configure one durable private local directory for one writer process. `V2_SHADOW_DIR` and `V2_SHADOW_INPUT` must use absolute paths outside the repository and all public serving roots. The code rejects repository storage, including symlink aliases. It does not coordinate multiple processes writing the same `latest.txt`; use one writer rather than sharing a directory across replicas. Ephemeral serverless storage is not a durable evidence archive.

Prepare a reviewed external source bundle as described in [prospective capture](prospective-capture.md) and the [source boundary audit](source-boundary-audit.json). To perform one explicitly enabled local observation with that bundle, replace these illustrative absolute paths with the configured private paths:

```sh
V2_SHADOW=ON \
V2_SHADOW_DIR=/absolute/private/regime-v2 \
V2_SHADOW_INPUT=/absolute/private/regime-v2-input/source-bundle.json \
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --import ./scripts/report-node-register.mjs scripts/regime-v2-observe.mts
```

The command runs the existing Dashboard pipeline once and returns only the V1 reading. It writes shadow evidence privately. The environment overrides above apply to that invocation; they do not edit a deployment configuration or establish a recurring run. To test honest unconfigured behavior, omit `V2_SHADOW_INPUT`: the snapshot should contain `SOURCE_BUNDLE_NOT_CONFIGURED`, `UNKNOWN_CALENDAR` and an incomplete V2 result.

To assemble a bundle from already captured immutable records, create a private JSON plan containing `mode`, `captures: [{kind, captureId, ticker?, identity?, observationDates?, upstreamCaptureId?, transformVersion?}]` and `calendars: {family: {calendar, captureId, transformVersion, calendarHash}}`. The calendar and source identities must be reviewed under the existing contracts. Then validate and atomically publish the private active bundle:

```sh
V2_SHADOW_DIR=/absolute/private/regime-v2 \
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  scripts/regime-v2-prepare-bundle.mts \
  --plan /absolute/private/regime-v2-input/plan.json \
  --output /absolute/private/regime-v2-input/source-bundle.json \
  --as-of 2026-09-08T18:00:00Z
```

Use the real intended cut instead of the example timestamp. This helper reads existing `captures/<captureId>.json`; it neither fetches sources nor invents calendars. The raw bundle is subsequently archived by content hash during observation. Successful bundle preparation alone does not mean complete or R0-eligible data.

Do not run the statistical-levels build solely to force a shadow update. When that existing batch is run for its normal purpose with shadow enabled, its compatible Yahoo response bytes are captured beside its existing work. Those bytes still need source/calendar validation and a versioned bundle before canonical V2 use.

Check `[regime-v2:shadow]` logs and the private directory. Read `latest.txt`, validate that it contains a 64-character lowercase hex identifier, then inspect `snapshots/<identifier>.json`. Verify:

- `snapshotId`, `schemaVersion`, `asOf` and `versions`, including `parameterSet.id=C03`.
- `v1.regime`, `v1.score`, `v1.confidence`, `v1.version` and `v1.outputHash`.
- `v2.regime`, `v2.systemState`, pillars, concordance, uncertainty, data quality and `v2.diagnostics.ruleId/missingReasons`.
- `v2.sourceStatus` for source status, original observation, captured/available times and vintage hashes; `v2.diagnostics.calendarStatus` for expected sessions. The top-level `sourceStatus` may additionally describe normalization rather than repeat engine source status.
- `captureMetadata.issues`, `captureMetadata.pipelineCaptures` and `captureMetadata.sourceInput.retainedBundle` when a bundle exists.
- `replayClass`, `observation.continuity`, censoring/ages and `observation.evidencePlan.origin`. Prospective capture origin alone does not imply R0 eligibility.

Keep the corresponding `captures`, original `bundles`, normalized snapshot input and versioned code/contract identity together. A new input vintage must create a different content address; do not overwrite archived snapshots to make them match current data.

## Exact replay

Use the immutable snapshot file, with the original supported engine and contract versions:

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  scripts/regime-v2-replay.mts --snapshot /absolute/private/regime-v2/snapshots/SNAPSHOT_ID.json
```

Replay validates the snapshot identity and compares the complete V2 output, including engine version, C03, regime, pillars, concordance, uncertainty, data quality, evidence and reasons. `MATCH` is required for a stored calculation. A snapshot without a normalized input/output pair is a recorded failure and cannot replay a calculation that never occurred. Replay must not refetch data, alter expected outputs or relabel R2 as R0.

## Failure triage

| Signal | Interpretation and action |
| --- | --- |
| `INCOMPLETE` / `INSUFFICIENT` | Inspect missing core features and source/calendar status. Obtain the exact missing eligible source/window; do not fill zero, neutral or a previous regime. |
| `STALE_OR_WRONG_SESSION` | Compare observed session with each calendar's expected closed session. Supply current eligible rows; retain zero-session carry. A usable V1 source does not relax V2 freshness. |
| `UNKNOWN_CALENDAR` | Supply a reviewed, complete, known-at version of that source calendar. Check coverage, timezone, holidays, early closes and DST. Do not substitute SPY dates or weekdays. |
| `TEMPORALLY_INELIGIBLE` | Inspect capture/availability/end bounds, replay mode and mixed R2 parents. A capture after the cut cannot prove the bytes were available at the cut. |
| `MISSING_SOURCE` / `SELECTED_OBSERVATION_MISSING` | Inspect source kind, raw capture and selected economic date. Do not substitute an incompatible provider, field or scalar. |
| `MISALIGNED_ADJCLOSE_ARRAY` or invalid source | Inspect preserved raw bytes and normalizer issues. Yahoo close must not replace adjclose; CFE Close must not replace Settle. |
| `V2_TYPED_INPUT_FAILURE` / `V2_CALCULATION_OR_SOURCE_FAILURE` | Inspect the private snapshot error and original bundle. Reproduce locally with the unchanged engine. V1 must still return unchanged. |
| BTC/GLD unavailable | Retain the contextual satellite missing/partial state. Both have zero core votes. Missing optional windows cannot alter the core regime. |
| `V1_FAILURE` | Follow the existing V1 incident path. Its original failure remains propagated; a V2 result must not mask it. |
| `SHADOW_DIRECTORY_NOT_CONFIGURED`, permission/storage failure | Correct the private durable storage configuration. Look at logs: a storage failure may prevent a snapshot itself from being written. V1 remains available. |
| `SHADOW_IO_TIMEOUT` / `SHADOW_BUSY` / publication busy | Inspect local I/O and writer concurrency. Publication may finish after the wait timeout, so inspect later evidence before retrying. The wait deadline limits resource waiting; it is not a source freshness TTL. Use one writer and preserve the documented bounds. |
| Replay mismatch or an unexplained difference against P8/Sweeper | Preserve the failed evidence and return the finding to Control Tower. Do not edit an oracle, C03, a frozen contract or expected historical output. |

Absent snapshots are not proof that V2 succeeded. Check diagnostic logs as well as the checkpoint. A crash or process shutdown can interrupt outstanding sidecar work; the sidecar is not a durable job queue. The checkpoint does not replace an immutable archive and does not scan that entire archive on every request.

## Rollback

Set `V2_SHADOW=OFF` in the existing execution environment and restart the existing process if necessary for its environment to reload. Unset `V2_SHADOW` also uses the OFF default. This returns the ordinary V1-only path; do not invoke the observation CLI with OFF because that CLI deliberately requires an explicit enabled observation.

Keep the private captures, bundles and snapshots. Rollback requires no data deletion, public UI edit, dependency change, commit, deployment or historical migration. Do not expose the archive over an API or static route to inspect it.

## Verification

Run the Maintainer harness for frozen C03 conformance, 464 P8 golden cases, the 1930-session R2 archive, 110 Sweeper attacks, existing V1/V2/report tests, new operational regressions, isolated Groweer checks and editorial validation:

```sh
python3 docs/regime-engine-v2/maintainer/run-verification.py
```

It sets shadow OFF except for isolated test overrides and writes its own Maintainer check artifacts. Earlier P8, Builder, Sweeper and Groweer evidence must remain unchanged. Inspect `canonical-verification.json`, its `required_checks`, test accounting and referenced logs; canonical golden/history totals are reported separately from test counts. The complete handoff assessment is in `verification.json`.

Run the separate root checks as well:

```sh
npx tsc --noEmit --incremental false
npx eslint . --format json --output-file docs/regime-engine-v2/maintainer/lint.json
npm run build
```

Before build, preserve and hash the current `next-env.d.ts` bytes. Build can regenerate this file. Inspect that generated difference, restore only the identified build side effect, and rerun typecheck after restoration. Do not reset unrelated worktree edits. Compare lint messages against the frozen input baseline; preexisting warnings must not be counted as new Maintainer findings. Build, dependency environment and performance evidence are separate from the canonical harness.

## Evidence gate

The actual Maintainer smoke archive at `/private/tmp/regime-v2-maintainer-prospective` demonstrated CFE byte capture, unchanged V1 and an honest `INCOMPLETE/UNKNOWN` snapshot. It did not install official calendars or demonstrate a completed real R0 market calculation. The complete R0 replay witness is synthetic and remains labeled as such.

The 100 transition / 100 conflict / 60 material-volatility counts are an evidence plan. Inspect candidate counts and both STRESS branches, retain gaps and censoring, and obtain separately governed adjudication. Counts do not promote V2 automatically. Shadow is not production authority, and R2 is not PIT OOS. Return unresolved operational or methodology questions to Control Tower; this runbook does not authorize Designer or cutover.
