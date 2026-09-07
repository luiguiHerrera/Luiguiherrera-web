# Statistical Levels hosted raw authority

The Tuesday–Saturday 08:30 UTC updater is gated by the repository variable
`STAT_LEVELS_RAW_AUTHORITY_READY` being exactly `true`. Provisioning must pass
before **2026-09-08T08:30:00Z**; otherwise leave that variable `false`. Enabling it
is permitted only after the hosted synthetic probe and its log scan pass. Do
not manually dispatch a real provider update during provisioning.

## Identity and configuration

The four non-secret repository variables are `STAT_LEVELS_AWS_REGION`,
`STAT_LEVELS_RAW_BUCKET`, `STAT_LEVELS_RAW_ROLE_ARN` and
`STAT_LEVELS_RAW_AUTHORITY_READY`. Region is `eu-south-2`. No AWS access key,
secret key, session token, Founder profile, environment approval identity or
GitHub secret is configured by this integration.

Both workflows use GitHub OIDC with `aud=sts.amazonaws.com` and the existing
exact trust subject
`repo:luiguiHerrera/Luiguiherrera-web:ref:refs/heads/vercel-deployment`.
Runtime checks enforce the repository, ref, temporary STS credentials and exact
assumed workflow role. The probe has only `contents: read` and `id-token: write`;
the updater retains `contents: write` and adds only `id-token: write`.

The official action is pinned to release **v6.2.4**, resolved on 2026-09-07:

- ACTION_SOURCE: `aws-actions/configure-aws-credentials`
- ACTION_COMMIT_SHA: `cbe3b392738ccf3f987d68400dafcf4b0624a56c`
- ACTION_PROVENANCE: [official release](https://github.com/aws-actions/configure-aws-credentials/releases/tag/v6.2.4), [official immutable source](https://github.com/aws-actions/configure-aws-credentials/tree/cbe3b392738ccf3f987d68400dafcf4b0624a56c)

Dependency installation precedes credential issuance. The probe installs no
npm dependencies. AWS CLI v2 is supplied by the GitHub Ubuntu runner. Each PUT
uses a SHA256 checksum, `If-None-Match: *`, `AES256`, and `STANDARD`; every
readback verifies bytes, checksum, VersionId and default five-year GOVERNANCE
retention. AWS stderr and identity responses are captured, never dumped.

## Archive and publication order

1. Assert readiness and runtime identity; reserve a cryptographically unique
   RUN_ID with a conditional `RESERVATION` object before any provider call.
2. Obtain one uncompressed successful Yahoo response per asset. No redirect,
   alternative provider, normalization, reserialization or silent retry can
   replace these bytes. Archive and read back each response before parsing it.
3. Require all 40 inputs. Create and read back `raw-manifest.json`,
   `provenance-manifest.json`, and `SHA256SUMS`.
4. Create `SEALED` only after every preceding object passes. The seal binds
   every preceding object's exact hash, size and S3 VersionId, including the
   provenance manifest and checksum file. Read back the seal too.
5. Read the seal and **all archived object versions again from S3** into a
   private runner temporary directory. The offline generator receives this
   downloaded archive, never transient provider buffers.
6. Generate into a separate candidate directory and validate all 81 file
   hashes, complete per-file input bindings, source/config hashes, catalog,
   horizons, frequencies, drawdown metrics and seasonality samples.
7. Revalidate before publication, require a clean checkout and unchanged
   remote SHA, install the candidate, validate again, stage only the generated
   tree and `generated-provenance.json`, commit successfully, then push normally.

`SHA256SUMS` deliberately retains the existing offline-generator format: 40 raw
files plus `raw-manifest.json` (41 entries). `SEALED` binds that checksum file,
`provenance-manifest.json`, `RESERVATION`, and all raw objects. There is no
circular checksum and no weakening of the historical archive verifier.

The historical Mac archive, baseline config, formulas and current checked-in
snapshots are unchanged by this integration. Future scheduled runs put their
complete new configuration inside the generated provenance sidecar, including
bucket, region, prefix, seal hash/version, cutoff and generator commit. The
historical configuration remains available for historical replay. Baseline
tests distinguish that historical fixture from a later published authority.

To reproduce a future publication, check out its recorded `GENERATOR_COMMIT`,
use its recorded Node version and `generated-provenance.json.CONFIG`, read the
recorded S3 seal/version with `readSealedArchive`, then call `generateSnapshots`
with that downloaded archive and config. Compare all 81 hashes to the published
sidecar. No provider request is needed. Access to the private archive is still
required; public metadata grants no access.

## Probe and failure behavior

`probe-statistical-levels-storage.yml` is manual-only, branch-bound, and never
imports the provider/generator module. Its objects exist only below
`statistical-levels/provisioning-probes/<RUN_ID>/`, except one explicitly
approved negative PUT to a fresh `provisioning-denial-probes/<RUN_ID>/probe.bin`
key outside both allowed prefixes. This PUT must receive AccessDenied.

The probe verifies different-byte overwrite returns PreconditionFailed (412),
a PUT without the precondition is denied, delete is denied, identical-value
retention PUTs with and without governance-bypass are denied, and an outside
prefix PUT is denied. Final current-version GET and retention readback confirm
the original object is unchanged. The two denied creation checks infer no
creation from S3's atomic rejected PUT response; they do not pretend that a
403 HEAD proves absence. The role deliberately has no ListBucket privilege.

Failed or uncertain writes abandon the run. A 412 reservation collision stops
before provider access. Partial archives never receive a seal. No cleanup
operation deletes S3 objects, old authorities or probes. Governance retention
is not Compliance mode: an independently privileged account administrator may
bypass it; the workflow role has explicit deletion/retention/bypass denies.
This integration does not change those policies, retention or OIDC trust.

The real updater uses one concurrency group with cancellation disabled. A
second queued run cannot publish over an advanced remote; it must use a fresh
checkout and RUN_ID in a later run. No force push or archive removal exists.

## Validation and operating evidence

Run `node --test scripts/statistical-levels-storage.test.mjs` and the existing
Statistical Levels tests, then typecheck, lint and build. Local tests inject
unavailable identity/storage, reservation collision, incomplete archive,
readback corruption, manifest/provenance failure, invalid snapshots, missing
sidecar, failed commit and concurrent remote advancement. With the private
historical archive available, qualification regenerates into a temporary
output and compares all 81 snapshot hashes without modifying current files.

The hosted probe emits only safe operational metadata and hashes, scanned
against in-memory credentials and token patterns before output. Downloaded
GitHub logs must also pass a credential scan before the readiness variable is
set true. Never persist tokens, headers, cookies or raw data in logs/artifacts.
Keep incomplete archives and synthetic probes under the same retention rules.

The unrelated dependency/CI remediation already present on the deployment
branch is preserved; this patch changes neither dependencies nor the CI
workflow. After provisioning, the Founder should end the separate local admin
session with `aws logout --profile lh-founder-provisioning`.
