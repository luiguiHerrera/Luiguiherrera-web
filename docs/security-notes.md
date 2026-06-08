# Security Notes

## Current MVP security posture

The MVP is designed as a public educational platform with no user accounts and no persistence of user financial data.

Current decisions:
- No login.
- No database.
- No backend.
- No cookies.
- No real analytics.
- No external APIs.
- No localStorage or sessionStorage for financial answers.
- No diagnostic answers are persisted.
- No portfolio data, patrimony, risk tolerance or individual results are stored.

## Analytics

Analytics will be added later using privacy-friendly, aggregated events only.

Allowed event examples:
- page_view
- diagnostic_started
- diagnostic_step_completed
- diagnostic_completed
- dashboard_module_opened
- quant_lab_opened
- red_flags_completed

Forbidden analytics data:
- Patrimony
- Portfolio composition
- Individual answers
- Names
- Emails
- Free text inputs
- IP addresses
- Persistent user identifiers

## npm audit

Current status:
- `npm audit` reports 2 moderate vulnerabilities related to `postcss <8.5.10`.
- The affected package is currently transitive through Next.js.
- `npm audit fix --force` was not applied because it proposes a breaking downgrade to `next@9.3.3`.

Decision:
- Do not apply forced downgrade.
- Keep Next.js on the current maintained version.
- Monitor future Next.js releases that resolve the transitive advisory.
- Re-run `npm audit` before production deployment.
