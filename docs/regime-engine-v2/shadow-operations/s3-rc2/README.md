# Regime Engine V2 — durable S3 operations / local RC2

This package adds operational storage and a locally prepared shadow workflow to
RC1 `330e95bf131fc824c4710ff5df734cafdc719263`. C03, the evidence/state engine,
Maintainer snapshot format and numerical oracles retain their accepted bytes.
Public ES/EN home and dashboard requests use V1 only.

The remote administrative bootstrap is external evidence, not RC2 ancestry:
commit `b094ddbb0a0e01f5fd8a244ad8f6ac3861f158dc`,
[GitHub run 34456114945](https://github.com/luiguiHerrera/Luiguiherrera-web/actions/runs/34456114945).
That run validated the probe role and S3 primitives. It did not validate the new
ShadowWriter role or a production-prefix observation.

## Configured resources

- Bucket: `lh-regime-v2-shadow-732159826922-us-east-1`; region: `us-east-1`.
- Probe role: `RegimeV2S3Probe`, unchanged and limited to `regime-v2/_probe/`.
- New role: `RegimeV2ShadowWriter`, using the existing GitHub OIDC provider.
- Trust: exact audience `sts.amazonaws.com` and subject
  `repo:luiguiHerrera/Luiguiherrera-web:ref:refs/heads/vercel-deployment`.
- Versioning enabled, all four public-access blocks enabled, default AES256,
  BucketOwnerEnforced, Object Lock absent, lifecycle expiration absent.

The reviewed documents are in [aws/policies](aws/policies). The bucket policy
retains all original statements exactly and adds production-prefix denials.
Observations and run objects require `If-None-Match: *`; latest requires either
first creation with that condition or an ETag compare-and-swap. Neither role has
delete permission. No bucket, provider, external service or npm runtime
dependency was added.

The writer also has the three bucket configuration reads and a narrowly scoped
`ListBucket` permission: an authorized JSON key prefix and `max-keys <= 1`.
The adapter uses the exact internally generated key, `max-keys=1` and disabled
pagination only to disambiguate an absent object after `GetObject` returns 403.
An existing key or a failed/ambiguous listing preserves the read failure.
[AWS documents the 403/404 distinction](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html).
No general listing permission or access to the probe prefix is granted.

[Administrative readback](aws/apply-readback.json) records one new role and three
mutations: create role, attach its inline policy, extend the existing bucket
policy. Probe regression was checked after each mutation. The final bucket
settings and OIDC provider matched their initial state.
[IAM simulation](aws/iam-identity-simulation.json) evaluates identity policies;
it does not claim to evaluate a resource policy for a role or prove live OIDC.
The offline policy matrix separately evaluates the combined contract, including
the S3 conditional-write semantics.

## Storage and observation contract

The S3 adapter invokes AWS CLI v2 with argument arrays and a bounded timeout.
It validates the approved resource configuration, assumed writer identity,
conditional CLI support, versioning, public access and encryption. The engine
has no S3 dependency. The filesystem adapter remains explicit TEST/LOCAL only
and is rejected inside GitHub Actions.

Every durable value uses the versioned canonical JSON envelope with SHA256.
Immutable writes use conditional creation, immediate readback and exact
bytes/hash/schema verification. Existing equivalent bytes are reused. Different
bytes at an immutable identity fail with `CRITICAL_IDENTITY_COLLISION`.
Observations are never overwritten or deleted to recover a failure.

The coordinator generates all keys internally:

- `regime-v2/observations/<engine-and-C03>/<session>/<observationId>.json`:
  immutable economic observation.
- `regime-v2/observations/<engine-and-C03>/bundles/<hash>.json`:
  immutable retained source bundle.
- `regime-v2/observations/<engine-and-C03>/sessions/<session>-<compatibility>.json`:
  typed immutable `SESSION_REFERENCE` electing the first canonical observation
  and enabling recovery without reacquiring sources.
- `regime-v2/runs/<engine-and-C03>/<attemptId>/terminal.json`:
  one append-only terminal record per attempt. Capture/incomplete attempt
  evidence is retained under that same attempt prefix when required.
- `regime-v2/indexes/latest.json`: the only mutable publication index.

Operational identity version 2 resolves an ambiguity in the former local R1
coordinator: R1 omitted capture clocks from observation identity while retaining
them in the snapshot body. With independent writers, that could assign one ID
to different bytes. RC2 binds the full normalized input and actual asOf,
retained bundle identity, accepted calendar identity and immutable snapshot ID,
including predecessor context. Attempt IDs are excluded from observation bytes.
A retry through the session reference returns the original winner's exact
inputs, snapshot and asOf. Different temporal inputs are not declared equal.
This changes operational identity, not the C03 decision methodology or the
accepted snapshot semantics.

Latest publication verifies its referenced immutable observation, checks version
compatibility and orders by expected session then actual asOf. Creation uses
`If-None-Match: *`; updates use the last-read ETag. A conflict causes a bounded
reread and reevaluation. An older writer retains the newer pointer. The S3
adapter provides no global lock or multi-object atomicity claim.

If an observation is created but publication fails, its immutable bytes remain.
The attempt records the publication/storage failure where possible. A terminal
S3 failure falls back to local job diagnostics and GitHub's job outcome; it is
never represented as a successfully persisted run. Cleanup/deletion is not a
recovery mechanism.

## Workflow configuration and current boundary

The local workflow is `.github/workflows/regime-v2-shadow.yml`. Expected GitHub
repository variables for a later authorized publication are:

| Variable | Expected value |
| --- | --- |
| `V2_SHADOW_JOB_ENABLED` | absent or `OFF` until activation is authorized |
| `AWS_REGION` | `us-east-1` |
| `S3_BUCKET` | `lh-regime-v2-shadow-732159826922-us-east-1` |
| `SHADOW_ROLE_ARN` | `arn:aws:iam::732159826922:role/RegimeV2ShadowWriter` |

The scheduled trigger is Tuesday–Saturday at 08:30 UTC. An OFF schedule completes
its gate without OIDC, storage or market access. Manual dispatch defaults to
`preflight`, which checks calendar/storage but creates no market observation.
The future `canary` mode requires the explicit confirmation
`RUN_ONE_SHADOW_OBSERVATION`; it performs one prospective attempt while the
schedule can remain OFF. No historical asOf is accepted by this production CLI.

The calendar sequence remains calendar → expected session → capture → capturedAt
→ validation/normalization → C03 → persistence. The exact reviewed 2026 calendar
package hash remains
`570adddeef6e6dfdfa313cafb3c98c7a6793e3a932b49387132a99deb17e396a`.
VIX warns from 2026-10-01 and blocks from 2026-11-01. Source acquisition preserves
zero reused public fetches, 25 V2-only fetch identities and the 18–25 request
range. BTC and GLD remain unavailable satellites.

This phase configures backing and implements the adapter. It does not publish
the workflow, change repository variables, obtain live ShadowWriter OIDC,
execute a remote production-prefix canary, activate the schedule or change V1
public authority. `SHADOW_ACTIVATION_READY=NO` until a later Control Tower gate.

## Reproduce the exact local candidate

Use a clean Git checkout containing RC1 history and install its own lockfile:

```sh
npm ci --ignore-scripts --no-audit --no-fund
python3 -B docs/regime-engine-v2/shadow-operations/s3-rc2/run-verification.py \
  --root /absolute/path/to/rc2-checkout \
  --output-dir /absolute/path/outside/the/checkout \
  --actionlint /absolute/path/to/actionlint-1.7.12 \
  --gates all
```

Actionlint is a verification tool, not a runtime dependency. Use the official
1.7.12 release for the host platform and verify its published checksum. Node and
Python are local verification tools. The workflow installs Node 22; local
verification records its actual installed versions.

The release manifest binds the complete operational delta to RC1. The wrapper
checks every remaining RC1 file against its Git blob, rejects outside symlink
inputs, keeps the original canonical runner and numerical oracles unchanged,
and checks the seal again after all tests. The manifest excludes its own hash;
the verification result records that hash, and the RC2 Git tree seals it.

The canonical 487 registrations, P8 golden 464, historical R2 1930, Sweeper 110
and portability 32 remain distinct from the new operational and policy tests.
The wrapper runs typecheck, lint, build, post-build typecheck, calendar/source/
storage/concurrency/failure/public-isolation tests and workflow validation.
It strips operator AWS and activation variables from verification subprocesses
and redirects AWS configuration/credential files to the null device. A
versioned Node preload denies outbound fetch/http/https/net/tls connections while
allowing loopback and Unix IPC for local verification. This is explicit audit
instrumentation, not product code or a kernel/native network sandbox; guard
inheritance and mocks have their own tests. Dependency installation remains
outside that verification guard.
No original worktree, local review capture or filesystem shadow store is an
input. Verification outputs remain outside the checkout.

## Rollback and next gate

Operational rollback keeps `V2_SHADOW_JOB_ENABLED=OFF`, removes any pending canary
invocation and leaves immutable S3 evidence untouched. V1 remains public and
independent of job/storage imports. No policy widening, observation deletion,
unconditional latest overwrite or engine change is part of rollback.

Remote integration of the local RC1→RC2 lineage and the remote bootstrap lineage
requires a separate gate. After Control Tower accepts RC2, a separately
authorized remote canary must validate actual ShadowWriter OIDC, production
prefixes, real market capture, durable observation/run and latest CAS. Schedule
activation is a later decision. This local RC2 phase stops before those actions.
