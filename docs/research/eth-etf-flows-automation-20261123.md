# Ethereum ETF flows — automated publication

User authorization: 23 November 2026, “apruebo, publica con automatizacion”. Scope: ETH card and the existing hosted Flows refresh, without changing BTC, GLD or SPY calculations.

## Source and permitted display

- **Farside direct access rejected by the source:** a real GET from Vercel Preview returned HTTP 403. No challenge bypass, cookie/session automation, impersonation, proxy or retry workaround is used.
- **Recent published flows:** CryptoETF.today, through its documented public Streamable HTTP endpoint `https://mcp.cryptoetf.today/mcp`. No account, personal key, new dependency, subscription or AI inference. Fixed JSON-RPC calls obtain `get_fund_flows` for `asset: eth`; units are the named `totalUsdM` / `netFlowUsdM` fields. The free window is 30 calendar days and the published limit 60 requests/minute/IP. Normal refresh uses three requests per feed retrieval, far below that limit.
- **Licence basis:** [CryptoETF terms, API and data licence](https://cryptoetf.today/en/terms), effective 19 November 2026, explicitly permit small excerpts such as a chart/table with attribution under every plan, including Free. This implementation uses that limited chart-display permission: a visible source link, at most 60 daily aggregate bars, server-calculated summary statistics and the latest 11-fund breakdown. It does not offer their raw archive, per-fund history, downloadable dataset or data-feed API. The wider commercial/redistribution licences are not claimed or used. Its [MCP documentation](https://cryptoetf.today/en/mcp) and [API reference](https://cryptoetf.today/en/api) describe daily T+1 publication, null missing values and the same numbers across transports.
- **Initial historical prefix:** [GrowYourEthereum](https://growyourethereum.com/data/ethereum-etf-flows), declared CC BY 4.0 with credit to GrowYourEthereum and underlying Farside Investors. Actual downloaded JSON (`generated: 2026-10-24`) retains missing fund cells as null. The committed seed contains only the fixed-universe aggregate from 28 July 2026 and the last complete fund breakdown; its 23 October row is incomplete. Nothing is filled with zero. First complete source day for all 11 funds: 28 July; last complete licensed prefix: 22 October. From 26 October, use CryptoETF's own current published figures and revisions, with the transition recorded in the context.

Universe: ETHA, ETHB, FETH, ETHW, TETH, ETHV, QETH, EZET, MSSE, ETHE and ETH. Some include staking. It is not a claim of exhaustive coverage of all Ethereum investment vehicles.

## Operation and calculations

The existing `/api/cron/capital-flows` job, scheduled `0 7 * * *`, now includes ETH alongside the existing three assets. No new cron or schedule change is required. ETH also uses the existing one-hour model-cache convention. Each request validates fund identity, dates, units, explicit numeric coverage and published totals within the rounding bound `(reported fund count + 1) × 0.05 M USD`. No monetary interpretation threshold is added.

Internal dated Next Data Cache entries preserve the acquired history across requests/deployments. Every current source window overlays earlier observations by effective date, incorporating revisions without duplicate dates; an incomplete revision cannot erase an already valid complete close. Internal history is capped at 400 sessions. A cold archive rebuild is bounded to 35 calendar days; if a longer provider outage or cache eviction makes older data unrecoverable, missing exchange sessions remain gaps and dependent sums/observations are suppressed. This reuses a cache, not a new durable database; it is not a guarantee of indefinite historical recovery from a 30-day provider window.

Only closed US exchange sessions count. ETH freshness becomes due at 07:00 UTC on T+1, consistent with the provider publication cycle; the legacy three assets retain their existing close/freshness rules. On a failed, malformed, incomplete or overdue fetch, retain the dated successful cache/cut; never relabel old data as newly effective or substitute zeros.

1D, 5D and 20D sum the provider's daily net flows. Means and deterministic 5/20/60-window observations reuse the existing functions. They run on internal history on the server; the browser receives only the 60-bar chart excerpt plus the computed summaries. The 23 October gap prevents a complete 60-session sum until it rolls outside that window. A current 20-session sum remains available; classification can still be insufficient because calibration requires 60 prior windows.

## Verification and costs

Real 20 November close: **−97.3 M USD**, 11/11 funds. CryptoETF's latest five sessions: **−305.7 M USD**; latest twenty: **−1,501.4 M USD**. The earlier Farside preview showed −305.8 / −1,501.3; these small differences are supplier totals/revisions, not amounts forced to match. Compare published per-fund data within its rounding precision.

Local validation: 54 flow tests, TypeScript and scoped lint; real public API retrieval (no imported recent cut); missing/null, duplicate, malformed, revision, US holiday/open-session, T+1 and SSE protocol cases. The legacy source/calculation files and `vercel.json` remain byte-identical; existing three fallback models remain identical as JSON values. Hosted source and deployment verification are required before release.

Incremental expected cost: **€0**, reusing Vercel's existing functions, Data Cache and daily cron. No paid API, extra service, credential or subscription has been added.
