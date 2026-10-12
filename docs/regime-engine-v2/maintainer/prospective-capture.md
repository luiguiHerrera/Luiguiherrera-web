# Prospective capture and its actual guarantees

Maintainer adds an internal shadow path beside the existing V1 calculation. The default is `V2_SHADOW=OFF`. This delivery does not enable a deployment, create a scheduler, open a public V2 endpoint, execute Designer or authorize cutover. V1 remains the public authority.

The operational sequence is `existing fetch → exact byte capture → validation → normalization → unchanged C03 → private snapshot`. Capturing a response adds no provider request. The Dashboard tap observes CFE response bytes already fetched by V1. The existing statistical-levels batch can similarly retain Yahoo response bytes when that batch is run with shadow enabled. Its V1 parsing and fallback behavior stay separate from the V2 source contract.

## Private storage

`V2_SHADOW_DIR` must identify an absolute, durable, private directory outside this repository and every publicly served directory. Use a local filesystem with one writer process for a given directory. The implementation serializes publication within a process; it does not provide a distributed lock, a multi-process checkpoint protocol or a durable background job queue. Immutable snapshots survive process restarts when the configured storage survives them.

The directory contains:

| Location | Contents |
| --- | --- |
| `captures/<captureId>.json` | Exact raw response bytes in base64, raw SHA256, capture envelope and source identity. |
| `bundles/<rawBundleHash>.json` | Original externally supplied source-bundle bytes retained before normalization. |
| `snapshots/<snapshotId>.json` | Versioned V1/V2 shadow result, normalized V2 input, source metadata, reasons and diagnostic checkpoint. |
| `latest.txt` | Latest published snapshot identifier; immutable snapshots remain the audit records. |

Do not put these files under `public`, in a Git-tracked data directory, or in a storage location shared by independent writers. The temporary directory used for the Maintainer smoke test is evidence of a successful local write, not the recommended durable runtime destination.

## Capture identity and time

Each capture preserves source identity/version/URL, the exact raw-byte hash, capture-envelope hash, start/completion times and original bytes. `availableAt` is the conservative bound established when those bytes were obtained. `sourcePublishedAt` remains `null`; a response timestamp, HTTP date or capture completion is not a provider-publication claim.

The automatic pipeline tap records `replayClass=UNKNOWN`. The fact that a response was captured prospectively does not establish row-level eligibility, source-format compatibility, a reliable calendar or complete feature windows. Raw daily CFE aggregate captures are retained for audit; the supported canonical input adapter separately requires the monthly expiry catalog and monthly histories containing `Trade Date`, `Futures` and `Settle`.

Hashes detect corruption and identify the exact declared input. They do not authenticate the provider, certify an operator's historical timestamp or prove a manual calendar/table transcription correct. Reviewed source transformations retain both their upstream raw capture and transform version.

## Normalized source bundle

`V2_SHADOW_INPUT` points to an absolute external JSON file with schema `regime-v2-source-bundle/1.0.0`. The [source boundary audit](source-boundary-audit.json) documents its types, validation, limits and examples. The loader accepts these six source kinds:

| Kind | Required source content |
| --- | --- |
| `YAHOO_ADJCLOSE` | Exact Yahoo chart response, explicit ticker, USD native adjusted-close array. |
| `CBOE_VIX_CSV` | Cboe official daily `DATE/CLOSE` CSV. |
| `CFE_MONTHLY_CATALOG` | One explicit, versioned monthly VX expiry catalog. |
| `CFE_MONTHLY_CSV` | Monthly VX history with explicit symbol/expiry and native `Settle`. |
| `BTC_NATIVE_TABLE_JSON` | Dated native fund net-flow table, original upstream capture and transform version. |
| `GLD_NATIVE_ROWS_JSON` | Dated native shares/NAV/AUM rows, original upstream capture and transform version. |

Each entry carries an existing `CaptureRecord` envelope. Optional `observationDates` selects original rows without editing their retained raw bytes. Native extracted JSON must retain its upstream source bytes; a presentation scalar is insufficient. Missing Yahoo adjusted close, Cboe VIX, a nearest VX contract, BTC rows or GLD windows stays missing. FRED VIX, Yahoo close and VX Close are not substitutes.

The bundle supplies separate reviewed calendar packets for equity, VIX, CFE settlement, BTC fund reporting and GLD valuation. Each packet contains the existing `Calendar` structure, raw calendar-source capture, `transformVersion` and `calendarHash`. It declares complete interval coverage and explicit timezone-aware close instants, including holidays, early closes and DST. Missing or unreliable calendars produce `UNKNOWN_CALENDAR`. Observed SPY dates and generic weekdays cannot establish an official prospective calendar. See [calendar audit](calendar-audit.json).

For prospective R0 eligibility, an observation must come from a prospective capture and match the latest closed session resolved at capture completion using that source's reliable, already-known official calendar. Other historical rows in the same newly fetched payload remain R2. `R2_IMPORT` and R2 upstream transformations remain R2. Mixed parent classes propagate the weakest guarantee; R0 mode cannot use an R2 window merely because the latest row is current.

This allows separately retained contemporaneous observations to accumulate an eligible window. It does not immediately turn a newly fetched historical series into a strict prospective window. No R1 vintage-reconstruction proof was supplied or manufactured during Maintainer. The accepted 1930-session historical archive remains R2, and **R2 is not PIT OOS**.

The loader creates the JSON representation of normalized input before its first evaluation. The snapshot retains that exact representation and explicit engine, C03 parameter, feature, decision-table, source-contract and snapshot-schema identities. Replay does not refetch providers or recompute input from revised source values.

## Evidence observed during Maintainer

The local smoke test on 2026-09-08 ran the existing Dashboard pipeline and captured five CFE responses under `/private/tmp/regime-v2-maintainer-prospective`. V1 selected the available 2026-09-04 settlement after its normal pending-date attempts. The resulting V1 reading remained `Neutral / mixto`, score `54`, confidence `62`.

Snapshot `b3d4f8fe108e9cd9aa297c05d9a05359bcc27cd81d9aeebb537d8d9ae947af99`, with `asOf=2026-09-08T18:43:03.428Z`, records `INCOMPLETE`, replay class `UNKNOWN`, `SOURCE_BUNDLE_NOT_CONFIGURED` and `UNKNOWN_CALENDAR`. Its prospective event candidates are zero and its evidence origin is `UNVERIFIED`. The [smoke log](prospective-smoke.log) retains the execution result; raw runtime captures remain outside Git.

No official runtime calendar was configured, and there is no completed real R0 market witness in this delivery. The complete R0 witness is an explicitly synthetic test that assembles 64 sessions from individually captured equity observations, VIX observations and monthly CFE parents, then replays the resulting snapshot exactly. Operational PASS refers to the tested adapter, that synthetic witness, real raw-capture plumbing and honest unavailable states. It does not claim a complete live data setup or successful prospective validation.

## Future event accounting

Snapshots expose previous regime, regime/pillar changes, concordance, uncertainty, data quality, reasons, regime/pillar ages and bounded diagnostic counters. Continuity breaks, corrections, gaps and version changes remain explicit and censored. These diagnostics never alter C03 adjudication.

The plan targets 100 adjudicable transitions, 100 conflicting-pillar episodes, 60 material-volatility episodes and coverage of both frozen STRESS branches. The implementation records candidates; it does not perform human adjudication or turn event counts into a statistical guarantee. R2/unknown data cannot masquerade as prospective candidate counts. `adjudicatedTransitions` remains zero until a separately governed adjudication process exists, and automatic promotion is always false. Promotion requires Control Tower.
