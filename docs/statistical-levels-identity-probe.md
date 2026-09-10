# Statistical Levels identity probe

`PROBE_IDENTITY` is a separate non-release operation in `.github/workflows/statistical-levels-release.yml` on `vercel-deployment`. It accepts only `probe_git_sha` and `probe_deployment_id`; the existing release inputs must be empty. No URL, role, project, service endpoint or Lambda name is accepted from the operator.

The probe resolves the immutable Preview using public GitHub metadata from the fixed Vercel integration. It selects the latest commit status for the supplied deployment ID, then requires the latest corresponding Preview deployment status to match the SHA, trusted creator, timestamp and exact origin links. A later Production deployment cannot replace the chosen Preview. No `deployments: read` permission or GitHub token is needed for these public reads.

Execution source and fixture source are separate checkouts. The workflow verifies its frozen helper hashes before running helpers, independently checks its GitHub execution identity and fixture ancestry, and verifies the fixture's pinned source files, 81 snapshots, provenance and 87-capability ledger. A probe records the fixture's authority as QA evidence; it never selects authority for publication. ADOPT and PROMOTE retain their existing validation, including PROMOTE's future-authority requirement and their unchanged controller request schemas.

Protected QA requests a short-lived GitHub OIDC token for `https://github.com/luiguiHerrera`. The token is held in memory and attached only to the verified Preview origin using `x-vercel-trusted-oidc-idp-token`. Cross-origin redirects are refused; bypass secrets, Vercel administrative tokens and Founder browser sessions are not used.

After QA succeeds, the existing pinned AWS credential action assumes only the fixed `LuiguiHerreraStatisticalLevelsReleaseInvoker` role. The probe session explicitly denies every AWS action except `sts:GetCallerIdentity`; that identity read does not require an IAM allow. The only AWS subprocess is a fixed STS identity call, with local credential files and endpoint overrides excluded and retries disabled. Its account, role and run-specific session must match; only a redacted proof is recorded. The probe contains no controller invocation path. See [AWS GetCallerIdentity](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html) and [Deny with NotAction](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_notaction.html).

One seven-day artifact, `statistical-levels-identity-probe-evidence`, contains exactly:

- `probe-summary.json`
- `trusted-sources-qa.json`
- `application-network-summary.json`
- `aws-oidc-summary.json`
- `qa-attestation.json`
- `evidence-sha256.json`

The artifact preserves the complete sanitized network event ledger and separate RSC/platform accounting. It excludes screenshots, headers, cookies, credentials, JWTs and credential-bearing URLs. Its hash manifest covers the other five exact files. Failed QA can retain a sanitized failure bundle; it cannot proceed to AWS. The finalizer rechecks source integrity, writes a complete bundle atomically and signals readiness only afterward. An integrity failure cannot execute an always-run helper or publish an unverified bundle.

The shared read-only browser and QA runner bodies are extracted unchanged. Release operation selection, temporal validation, controller payload construction, invocation code, publication lineage, authority policy, raw infrastructure and updater cron are unchanged.

The new workflow digest is recorded in `scripts/statistical-levels-release/workflow-freeze.json`. AWS still holds the previously approved digest `d18b1000407abe20e9b1885661d53a9053b7d69846b755c71450bea3799162e8`; this task does not update it. The existing Founder/admin certificate for concurrency zero and an empty publisher secret remains authoritative. No hosted probe read permissions are added for Lambda, Secrets Manager, S3 or CloudFormation.

Trusted Sources must retain the configured repository, workflow path and branch binding. Changing workflow bytes requires no rule mutation when the installed rule matches those claims rather than a source digest. The configured claim map must be verified separately; adding this operation is not evidence that protected access has passed. This implementation does not dispatch either operation, enable Lambda, populate a secret, create a baseline marker or promote a deployment.
