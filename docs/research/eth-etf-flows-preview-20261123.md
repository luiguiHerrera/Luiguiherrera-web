# Ethereum ETF flows — local preview, 23 November 2026

Route: `/dashboard/preview-flujos-eth#eth-etf-flows-preview`. Development only; the route returns 404 outside development. No production source, schedule, historical dataset, dependency or deployment configuration changes.

## Source decision

Use a private local research copy of [Farside's Ethereum table](https://farside.co.uk/ethereum-etf-flow-all-data/). It supplies daily, per-fund USD-million net flows with dates and a reconciliable total. These are **published flows**, not independently derived share/NAV estimates. Latest reviewed close: 20 November 2026, 11/11 reported. ETHA, ETHB, FETH, ETHW, TETH, ETHV, QETH, EZET, MSSE, ETHE and ETH. The covered universe is not a claim of exhaustive coverage of all US Ethereum vehicles. Some products now include staking.

The source table starts 23 July 2024. The first row with explicit numbers for all eleven funds is 28 July 2026: **83 consecutive US exchange sessions** through 20 November. Earlier dashes are neither zero nor verified launch dates. To avoid comparing changing fund universes, only this fixed-universe period is used. The full private input remains outside the public repository at `/tmp/eth-etf-flows-preview/source.json`.

| Candidate | Finding | Decision |
| --- | --- | --- |
| [BlackRock ETHA](https://www.ishares.com/us/products/337614/ishares-ethereum-trust-etf-etha) | Current NAV/shares and holdings; historical joint share/NAV feed not validated. BlackRock terms restrict automated copying without permission. Corporate-action adjustments would need verification. | No official derived series enabled. |
| [Fidelity FETH](https://digital.fidelity.com/prgw/digital/research/quote/dashboard/summary?symbol=FETH) | Current facts exist; reliable daily joint NAV/share history and republication conditions not validated. | Not used for independent derivation. |
| [Grayscale resources](https://www.grayscale.com/resources) / [terms](https://www.grayscale.com/terms-of-service) | Historical downloads exist; terms restrict automated extraction. Initial trust conversions must not be counted as new inflows. | Not automated. |
| [Bitwise ETHW](https://ethwetf.com/) | Current figures and NAV history; joint historical shares/NAV access not established. | Not used for independent derivation. |
| Farside | Current history and 11 funds; no explicit licence permitting hosted automated republication established. Public access from a browser works; plain Node fetch fails in the restricted local environment. Prior BTC-hosted access failures do not prove the ETH endpoint fails identically. | Private research preview only. Hosted access and publication rights remain unvalidated. |
| [XOOMAR](https://xoomar.com/markets/api/etf-flows) / [terms](https://xoomar.com/terms) | ETHA/ETHW, since August 2026; derives flows from changes in ETH held × price. Its own restrictions and upstream terms remain relevant. | Holdings-based measure does not satisfy this ETF creation/redemption methodology. |
| [GrowYourEthereum](https://growyourethereum.com/data/ethereum-etf-flows) | Explicit CC BY 4.0 attribution, history from July 2024; last available 23 October 2026. JSON converts absent fund cells to zero. | Not used as a current automated source; no splicing with Farside. |
| [CryptoKeyhole](https://cryptokeyhole.com/etf-flows/ethereum/) / [access](https://cryptokeyhole.com/data-access/) | Free keyless CC BY 4.0; incomplete/variable coverage; measures changes in ETH held including fees, using its own ETH price. | Different economic measure; not substituted for creations/redemptions. |
| [CryptoETF.today](https://cryptoetf.today/en/api) | Keyless MCP has a 30-calendar-day window; script API requires a key; full history paid. | Does not meet this history/no-credentials integration. |

## Rules and updating

- Each total must reconcile with displayed fund values within `(reported funds + 1) × 0.05 M USD`, the worst-case rounding bound for values displayed to one decimal. There is no arbitrary monetary signal threshold.
- Missing cells remain null. Partial intermediate sessions interrupt sums; a newer partial close is identified separately and excluded from headline windows. Empty placeholder rows are not zero-flow closes.
- Only valid US exchange sessions, 2024–2028, closed with the existing one-hour confirmation buffer are accepted. Weekends, holidays, seed and cumulative rows are excluded. Repeated identical rows deduplicate; conflicting duplicates, schema changes and inconsistent totals reject the import.
- Source revisions rebuild the private series atomically; older effective cuts cannot overwrite a newer cut. Already-published net flows are not adjusted again for splits. Raw official shares/NAV are unavailable here, so the supplier's original flow methodology and corporate-action treatment are not independently reproduced.
- Reuse the existing 1/5/20-session sums, historical means and deterministic observation rule unchanged. Classification requires 60 prior complete equal-duration windows, ending before the current window starts, with P90 directional-frequency thresholds and a consistent signed net balance. Otherwise show “Datos insuficientes”. As of this cut: 5 sessions qualifies as sustained outflows; 20/60 lack calibration history. This does not invalidate the available flow sums.
- Refresh code is a bounded, unauthenticated public HTTP GET (8-second timeout, 2 MB limit), only requested from this development route at most hourly. No cookies, challenge bypass or private sessions. On failure retain the dated imported research cut; expose the failure in context. The CLI `node scripts/research/eth-etf-flows-preview.mjs` uses the same adapter. There is **no hosted daily job enabled**. A private validated import is the current working data source.
- Incremental services/dependencies cost: **€0**. This is not a claim that a viable free, licensed hosted daily feed has been proven. Publication rights, stable hosted source access and independent per-fund methodology validation remain outstanding before any public release.

## Verification

Original per-fund close 20 November: ETHA −60.8, ETHB −7.4, FETH −15.9, ETHW/TETH/ETHV/QETH/EZET/MSSE 0, ETHE −4.5, ETH −8.7; total **−97.3 M USD**. Independent decimal sums: **5 sessions −305.8 M**, **20 sessions −1,501.3 M**. No 23 November all-dash placeholder is accepted as a zero.

Run `node --test lib/dashboard/eth-etf-flows-preview.test.mjs` with the private input for the real-cut check. Synthetic parser edge cases are explicitly separated from market data. Regression suite uses the existing flow tests. Browser verification covers desktop/mobile, 5/20/60 selection, interactive values, session table and context/fund breakdown.
