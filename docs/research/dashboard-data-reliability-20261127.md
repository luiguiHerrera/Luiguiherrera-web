# Dashboard flow retention and effective settlement dates — 27 November 2026

Scope: ETH historical continuity, VX effective dates, and EWJ delayed-source status. No layout changes.

## ETH

The previous recursive Next cache could rebuild from the licensed 22 October seed plus a rolling 30-calendar-day provider window. It was not a durable archive. A private Vercel Blob JSON file now stores validated history independently of caches and deployments, without expiration. Preview uses a separate pathname from production. Conditional writes with ETags prevent competing instances overwriting each other's newer observations. A failed read never writes a reconstructed replacement. Existing complete closes cannot disappear or become incomplete. Complete provider revisions remain possible and are recorded with previous/revised values, source hash and retrieval time.

Recovered chart aggregates: 26 October −88,600,000 USD; 27 October −60,200,000 USD. Evidence: the original CryptoETF.today `get_fund_flows(asset=eth)` response retained during initial integration, SHA-256 `c1b67f7d520ee3a9fffd86c0612470eef851a1c7dac8a74f0a799d5fca476643`. Its eleven fund contributions were validated with the existing parser and reconcile to both published totals. The public repository retains only these two chart aggregates and provenance, not the original provider dataset. The incomplete 23 October licensed observation remains missing. The public chart remains limited to 60 sessions; the private archive retains all validated closes.

## VX

Cboe's CSV endpoint can substitute the latest available file for an unpublished requested date. The adapter now reads prices from Cboe's dated daily publication, requires its heading date to agree with the adjacent official CSV link date, and selects standard monthly VX contracts from that same dated table. It never uses an invented request date as a settlement date. Missing or inconsistent publication evidence yields pending status. `settlementDate` and `retrievedAt` are separate fields. On review, the official publication is dated 25 November, with December 2026 at 25.0258 and January 2027 at 24.2921.

## EWJ

A validated but delayed ETFIQ cut is published successfully. The existing public freshness classifier reports `delayed` against the latest closed US session. A private last-good publication protects against provider rollback, failure and invalid input. These failures preserve the original cut/hash/time and expose the actual refresh error. The existing requirement for 400 complete daily observations and 252 comparison windows remains in force.

## Operation and verification

The existing authenticated daily capital-flow cron forces a source check and persists valid history before warming public caches. Normal checks are hourly for ETH and daily for EWJ; failures retry after one minute. Private JSON files have no TTL and are never served as public datasets. No new database, scheduler or paid plan was introduced. Vercel Blob's Hobby allowance is 1 GB storage and 2,000 advanced operations per month; the configured check intervals use at most about 750 normal writes per month for the two files, excluding forced checks and deployment previews.

Tests cover cold reconstruction, rolling windows, validated revisions, incomplete revisions, lost complete dates, competing instances, storage/source failure, EWJ delay/rollback, official VX publication dates and future/mismatched date rejection. The new tests and existing VX contracts are included in website CI.
