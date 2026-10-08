# RI-PROVENANCE-002: historical generator identity and integration

The observed failure concerns **Statistical Levels**, whose 81 published snapshots retain a `SOURCE_BUNDLE` for generator commit `75a89d93c79752ca83cde0c9ef6bb221071dd4cd`. It is not a changed Regime V2 calendar or a calendar generator failure. The integration layer verifies both domains explicitly because the repair authorization requires calendar preservation too.

Three generator objects must remain distinct:

| Object | SHA-256 |
| --- | --- |
| Source RC2 generator | `de9da118da379ccb12618adee258364b730935da36055b9822ca201f869095dd` |
| Generator recorded by the published remote Statistical Levels artifact | `e298c952e02112757d09ccf089383dd4653e044b305cd4d45e5f624857b04f6c` |
| Integrated remote generator with the accepted passive capture hook | `d26a5d548a0a0925f9336dc76c52eb89e7fd89c5d094c38100da0ed79bffeb97` |

The historical assertion reads each SOURCE_BUNDLE path from the current checkout. That was valid for its original generation checkout. After integration, the recorded historical generator and the current generator are different objects. The new verifier resolves the historical paths from their recorded Git commit and checks every original hash. It also verifies the unchanged config and published 81-file corpus. It never patches recorded hashes, regenerates published data, removes the capture hook or changes historical verifier files.

The independent integration check accepts only the exact hook bytes already present in approved RC2. Replacing that one block with the original `response.text()` statement must recover the fresh remote generator byte for byte. Formula edits elsewhere fail. The extracted computational functions and 40-asset universe must also remain identical under the same original cutoff. This is Case A for historical verifier scope, with a separate Case B proof for the technical hook addition. It does not permit a Case C semantic change.

Calendar preservation requires the complete reviewed JSON and its calendar-package, temporal and contract implementations to equal committed RC2. Payload SHA-256 is `570adddeef6e6dfdfa313cafb3c98c7a6793e3a932b49387132a99deb17e396a`; package release identity is `9b1bc306a4d8e390a294ceafc68fb0695465b7c4e5d3d4709507e5d8df8a7cf0`. The approved equity/VIX/VX release IDs are unchanged. Equity and VX retain 251 sessions and coverage through December 31, 2026; VIX retains 209 sessions and coverage through October 31, 2026. Nothing is reacquired, extended or inferred from weekdays.

## Verification modes

Run from the integration checkout, with its two explicit immutable authorities:

```sh
node scripts/regime-integration/provenance-verify.mjs \
  --source-rc2 2271bee0a21aadd12ab2f45d080c58c94b696326 \
  --remote-base 7dae726917ded8f5828a8525d596b1ce02830196 \
  --output /absolute/new/external/provenance.json
```

Without raw input, the result is `PASS_BINDINGS_HISTORICAL_REPLAY_NOT_RUN`. It proves historical blob/data identity and the narrow formula delta, not historical regeneration. No missing private archive is silently replaced by a fixture or a new provider response.

For full historical reproduction, additionally pass `--archive /absolute/private/archive`. The archive must match the frozen raw-manifest and SHA256SUMS hashes in the published provenance. The verifier generates into two isolated temporary destinations: first from the recorded historical generator blob, then from the integrated generator. Both use the exact archived bytes and original config/cutoff. Each of the 81 outputs must match the published hash and its counterpart. Published files are checked again for preservation. Provider access is forbidden by the existing offline generator; no calendar or market acquisition occurs.

The proof records the two different generated provenance identities explicitly. An integrated temporary sidecar is never substituted for the published historical sidecar. The recorded generation Node version and the verifier's actual Node version are both disclosed. The raw archive remains outside Git and public serving paths. `PASS` requires the real historical reproduction, not synthetic equivalence alone.

The separate `provenance-regressions.test.mjs` checks rejection of historical blob substitution, provenance rewriting, output tampering, a formula edit, capture-hook removal, calendar session edits and calendar implementation drift. Its remote counterparts preserve the old test files while testing the fresh data identity separately from the frozen September report.

## Existing remote failures

Two prior September assertions bind an older production commit or the literal September 6 live price/date. The fresh published archive is September 9. Those original failures remain recorded; the integration counterparts check preservation against the actual remote base and keep the report's own historical data frozen.

The weekly presentation discrepancy is different: SPY's September week 5 average return is `-0.01805`. Existing component formatting with `toFixed(2)` yields `-1.80%`; the existing test uses `toLocaleString` and expects `-1.81%`. This was present on the fresh remote before integration. It is not renamed a stale-date issue or declared numerically repaired. The integration proves exact remote rendering is preserved; the preexisting discrepancy remains separately disclosed.

None of this evidence changes C03, V2 methodology, V1 public authority, calendar semantics, storage or activation policy.
