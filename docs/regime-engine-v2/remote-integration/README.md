# Dual-baseline integration verification

The original RC2 and the evolving remote application are different authorities.
This package does not change any historical verifier, oracle, calendar payload,
engine rule, storage contract, or published Statistical Levels snapshot.

| Authority | Identity | Responsibility |
| --- | --- | --- |
| SOURCE_RC2 | `2271bee0a21aadd12ab2f45d080c58c94b696326` / tree `362fed10af7de0c198965921b81d7f26166d1c04` | Approved V2 and original 487/142/32 suites |
| REMOTE_BASE | `7dae726917ded8f5828a8525d596b1ce02830196` | Current public functionality, unavailable semantics, dependencies and lint |
| CANDIDATE | Explicit reviewed Git tree plus actual HEAD | The integration, narrowly authorized V1 compatibility and this verification layer |

`scripts/regime-integration/model.py` verifies every source file against the
specified Git tree before and after testing. It rejects unsealed files, symlinks,
unrelated imports from the source parent, modifications to remote-only files,
changes to the approved non-overlap V2 files, and an unreviewed compatibility
component hash. The candidate retains its real parent; no `.git` identity is
relabelled as RC1 or RC2. Newly versioned files are confined to the integration
script and documentation directories.

## Reproduction

Prepare independent exact checkouts of SOURCE_RC2 and REMOTE_BASE, with their own
`npm ci --offline --no-audit --no-fund` installs when the registry cache is complete.
Run the unchanged `docs/regime-engine-v2/shadow-operations/s3-rc2/run-verification.py`
against SOURCE_RC2 with `--gates all`, an external output directory, and reviewed
actionlint 1.7.12. Keep its source checkout unchanged. Its complete original
canonical, operational and portability results must pass.

Then run the committed integration layer against the separately sealed candidate:

```sh
python3 -B scripts/regime-integration/run-verification.py \
  --root /candidate \
  --source-root /exact-source-rc2 \
  --remote-root /exact-remote-base \
  --source-results /audit/source-rc2 \
  --candidate-tree REVIEWED_GIT_TREE \
  --compatibility-sha256 REVIEWED_COMPONENT_SHA256 \
  --historical-archive /verified-september-raw-archive \
  --actionlint /reviewed/actionlint \
  --output-dir /new-external-audit
```

All paths are explicit inputs. Historical source objects come from Git; the
archived raw material must pass the provenance manifest and per-file hashes.
No calendar or market acquisition is performed by this verification command.
The approved Node network guard rejects outbound fetch/HTTP/TCP/TLS calls while
allowing loopback IPC and deliberate in-process test doubles. This is bounded
Node instrumentation, not a universal OS network sandbox.

## Suite scopes

The original historical tests execute unchanged against exact SOURCE_RC2.
The integration contract reuses the original test-file selections with these
explicit counterparts:

| Historical binding | Integration counterpart | Cases |
| --- | --- | --- |
| Maintainer original public aggregator hash | `v1-maintainer.test.mjs`: exact fresh-remote V1 values and request behavior | 1 |
| Designer historical public extraction and actual-V1 reference, plus private rendering | `v1-designer.test.mjs`: fresh public/reference authority and six preserved private rendering cases | 8 |
| Original public-isolation fixture without current Next cache context | `v1-public.test.mjs`: actual fresh-remote and candidate route/scorer/adapters with explicit cache harness, broken/pending V2 sentinels and error identity | 7 |
| Original portability 18-warning baseline | `portability.test.py`: 29 unchanged inherited controls and three explicit fresh-remote lint controls | 32 |

The current canonical integration universe contains 493 cases because the remote
added six registrations to the unchanged baseline file selection. The operational
universe remains 142: 135 unchanged RC2 cases plus seven public integration cases.
Additional compatibility, provenance, remote behavior and dual-baseline negative
controls are reported separately. No skipped or failed case counts as a pass in
these integration contract groups.

Storage22, concurrency8 and failure17 are overlapping subsets of registered
operational cases. `operational-case-catalog.json` contains identities and source
hashes, not borrowed PASS results. The runner requires each identified case to
appear exactly once as passing in the current operational log and verifies its
test source against RC2. These subset totals must not be added together.

## Remote raw results and historical provenance

The full remote test selection runs both on REMOTE_BASE and CANDIDATE. Its raw
results remain visible. Three preexisting failures are quarantined as
`PREEXISTING_UNRELATED_PRESERVED`, following the instruction not to repair
unrelated remote failures:

- A weekly formatting assertion uses Intl rounding, while the existing remote
  presentation uses `toFixed`: the same input `-0.01805` displays `-1.80%` but the
  old assertion expects `-1.81%`. The integration control compares exact remote
  SSR, the numeric input, sample count and displayed literal. It does not change
  rounding or claim to repair the old assertion.
- A September current-mark assertion assumes September 6, despite a valid later
  remote snapshot. The integration control binds the starting mark to the fresh
  remote and executes the full in-memory future-mark/report-isolation behavior.
- A report isolation test binds current production bytes to an older publication
  commit. The provenance controls verify the historical authority and the
  preserved current remote separately.

The added legacy response-capture hook creates one additional raw generator-hash
failure. Its integration scope is discharged only by independent historical
Git blob binding, an exclusive hook delta, frozen calendar identity, and two
offline generations from the authenticated historical archive: historical and
integrated generators must each match all 81 published snapshot bytes. The old
raw assertion is never relabelled PASS and frozen provenance is never rewritten.

Any changed failing behavior, missing registration, new runtime failure, failed
compatibility case, new lint warning or failed typecheck/build keeps the pre-push
gate closed. Passing this verification does not activate shadow scheduling or
perform a push, deployment, provider capture, AWS write or canary dispatch.
