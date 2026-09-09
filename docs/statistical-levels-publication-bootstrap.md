# Statistical Levels publication baseline

The founder's 2026-09-08 decision is to adopt an already-published baseline. The bootstrap has no release target. Its first future promotion must concern a new, separately qualified daily authority.

## Certified existing state

- Production commit: `4ee6adb006f360fea13837db5f7d45815f297b55`.
- Production deployment: `dpl_FwDTx8HZPNdPZDEiFKGxAVjxfcZ6`.
- Current authority N: `20260908T125656658Z-a4743804-e5f1-495a-b34e-5948d5db4d2d`.
- Authority source commit N: `43f5b5f48f4e88e448c1c850321bfe48fc14aace`.
- Provenance SHA256: `c5181e377e48aceedd2c87f96641c8d07a4d63b20912d0031549c2c40e1a9f41`.
- Sealed manifest SHA256: `129f45149f6a280f1681ce3903a304e18a07dbaa6894bcc8e9b94587dbdf26cb`.
- Exact publication surface: 81 generated snapshots, including the generated manifest, plus the provenance sidecar. All 82 files already match N in Production.
- Capabilities: 87; provenance coverage: 100%.
- Observed main: `9fd1b9205e40a0e68e90e780892726353175c0ae`. This historical lag is accepted. Automatic main mutation is forbidden; later human main movement is a concurrency sentinel.

Authority A, `20260908T101853239Z-d6062b3a-bd2f-4710-8875-9c27f1449e89`, remains valid historical evidence. Neither A nor N's earlier commit is a release target. Publishing their old trees would undo current work. Copying N onto current Production would produce no changes, so no reconstruction or synthetic publication commit is required.

## One-time baseline adoption

`ADOPT_EXISTING_PRODUCTION_BASELINE` performs read, verify, certify and create-marker operations. It does not promote or rebuild a deployment. Its runtime has no Vercel write method or write-capable HTTP interface. Its separate fixed promotion operation is `PROMOTE_EXACT_STATISTICAL_LEVELS_CANDIDATE`.

Adoption verifies the approved workflow execution and exact workflow bytes, Git source/provenance, all 81 snapshots and the sealed authority before loading a Vercel read token. Fresh public ES/EN Production QA must cover 87 capabilities, all six defect regressions, rendered authority identity and required application error gates. Vercel project, Ready state, exact Production SHA/deployment and main sentinel are rechecked before marker creation.

Only after certification may the controller create `statistical-levels/publication-state/2026-09-08/published.json` with `If-None-Match: *`. The marker records existing-production adoption, the real authority, Production, observed main, authenticated QA time, execution/workflow identity and controller version. It fabricates no Preview QA, promotion request, promotion time or prior marker. Identical deterministic marker replay is a no-op; any different marker fails closed. Existing marker bytes are never overwritten.

The provenance sidecar contains historical generator source commit A, not its own publication commit. Those fields must remain truthful. Data authority N, generator source A, deployed Production identity and workflow execution identity are distinct.

## Future publication contract

A future candidate must follow a certified marker, use a strictly later UTC authority day and have a nonempty exact generated-data-only difference against the current certified Production tree. It must pass exact Preview QA and preserve main concurrency checks. No A/N bootstrap exception remains in the promotion path.

The release workflow's execution SHA is independent of the data candidate SHA. Workflow identity and candidate ancestry are verified, not assumed. No candidate SHA is hardcoded into the workflow.

The strict tree gate remains significant: a normal updater child that also introduces previously unpublished bootstrap tooling does **not** become a data-only candidate merely because its own commit only changes data. Such a tree must fail closed. Any future generation/qualification-base solution for that case requires separate review; this bootstrap does not broaden the data allowlist or change the updater.

The inherited future promotion lifecycle also distinguishes a Ready rebuilt deployment from a certified publication. This workflow does not create the independent Production Check currently required by the controller's optional post-promotion certification contract. That future certification path requires separate review before claiming complete autonomous repeated publication. The adoption path has its own complete public Production QA and digest proof and does not depend on a fictitious Preview or promotion Check. No `checks:write` permission is added here.

## Delayed schedule and required daily idempotency

The scheduled GitHub Actions run [34228946017](https://github.com/luiguiHerrera/Luiguiherrera-web/actions/runs/34228946017) used event `schedule`, workflow cron `30 8 * * 2-6`, nominal trigger `2026-09-08T08:30:00Z`, and actual start `2026-09-08T12:56:15Z`. The observed delay was `04:26:15`: `SCHEDULE_RELIABILITY=DELAYED_DELIVERY_CONFIRMED`. GitHub's internal root cause is not known or claimed.

Earlier manual recovery run [34214719020](https://github.com/luiguiHerrera/Luiguiherrera-web/actions/runs/34214719020) created A; the delayed scheduled run created N on the same day. Both are valid sealed authorities. This real event confirms `DAILY_IDEMPOTENCY_GAP=CONFIRMED_BY_REAL_EVENT`.

Before adding any recovery schedule, the real updater requires a durable **pre-fetch** daily gate:

- An already selected or sealed daily authority prevents a new provider fetch.
- A certified daily publication produces a complete no-op.
- A sealed but unpublished authority is reused exactly.

This document records required future behavior. This bootstrap does not implement a recovery cron, mutate the existing updater or claim that the idempotency gap is fixed.

## Activation status

The local controller template retains seven existing resources, reserved concurrency zero, an empty token secret and `ApprovedWorkflowSHA256=UNCONFIGURED`, with the existing invoker activation Deny. Bootstrap source preparation creates no real marker and performs no promotion. Trusted Sources, token provisioning, AWS apply and any hosted operation require subsequent explicit authorization.
