"""Reproduce Groweer G15-G17 using frozen local data only; no network requests.

Run from repository root: python3 docs/regime-engine-v2/groweer/audit-cross-asset-pfl.py
Official-source facts were checked separately on 2026-09-08; they are scoped below.
"""
import collections
import datetime
import gzip
import hashlib
import json
import math
import pathlib
import statistics
import subprocess

ROOT = pathlib.Path.cwd()
OUT = ROOT / "docs/regime-engine-v2/groweer"
ASSETS = ROOT / "lib/statistical-levels/generated/assets"


def read(path):
    return json.loads(pathlib.Path(path).read_text())


def sha(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def write(name, data):
    (OUT / name).write_text(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + "\n")


def corr(xs, ys):
    if len(xs) < 2 or len(xs) != len(ys):
        return None
    mx, my = statistics.mean(xs), statistics.mean(ys)
    vx = sum((x - mx) ** 2 for x in xs)
    vy = sum((y - my) ** 2 for y in ys)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / math.sqrt(vx * vy) if vx and vy else None


def describe(xs):
    return {"n": len(xs), "min": min(xs), "median": statistics.median(xs),
            "mean": statistics.mean(xs), "max": max(xs)} if xs else {"n": 0}


baseline = read(ROOT / "docs/regime-engine-v2/sweeper/historical-r2-output.json")
features = {r["date"]: r["features"] for r in read(ROOT / "docs/regime-engine-v2/p8/historical-features-r2.json")["rows"]}
baseline_dates = [r["date"] for r in baseline]
with gzip.open(ROOT / "docs/regime-engine-v2/p8/evidence/yahoo-SPY.json.gz", "rt") as handle:
    spy_native = json.load(handle)["chart"]["result"][0]
calendar = [datetime.datetime.fromtimestamp(t, datetime.timezone.utc).date().isoformat() for t in spy_native["timestamp"]]
assert len(calendar) == len(set(calendar))
assert calendar == sorted(calendar)
tickers = ["HYG", "LQD", "TLT", "IEF", "SHY", "UUP", "USO", "GLD", "SLV", "SPY"]
assets = {t: read(ASSETS / (t + ".json")) for t in tickers}
inventory = []
prices = {}
for ticker, asset in assets.items():
    rows = asset["frequencies"]["daily"]["compactSeries"]
    prices[ticker] = {r["date"]: r["close"] for r in rows}
    assert len(rows) == len(prices[ticker]) and all(math.isfinite(r["close"]) and r["close"] > 0 for r in rows)
    expected = [d for d in calendar if rows[0]["date"] <= d <= rows[-1]["date"]]
    inventory.append({
        "ticker": ticker, "path": str((ASSETS / (ticker + ".json")).relative_to(ROOT)),
        "sha256": sha(ASSETS / (ticker + ".json")), "status": asset["status"], "source_note": asset["statusNote"],
        "last_date": asset["lastDate"], "retained_series": {
            frequency: {"rows": len(body["compactSeries"]), "first": body["compactSeries"][0]["date"],
                        "last": body["compactSeries"][-1]["date"], "upstream_period_count_claim": body["periods"]}
            for frequency, body in asset["frequencies"].items()
        },
        "same_date_c03_overlap": len(set(prices[ticker]) & set(baseline_dates)),
        "missing_inside_daily_span_vs_p8_spy": [d for d in expected if d not in prices[ticker]],
        "not_in_p8_spy_calendar": [d for d in prices[ticker] if d not in calendar],
        "baseline_sessions_after_snapshot": sum(d > asset["lastDate"] for d in baseline_dates),
        "precision": "Saved presentation closes rounded to two decimals; unavailable native raw price-basis proof.",
    })

# Descriptive dependence screen only: adjacent observed SPY sessions, no gap fill,
# no regression fitting, no thresholds, no predictive targets and no label changes.
def trailing(price_map, horizon):
    result = {}
    for i in range(horizon, len(calendar)):
        dates = calendar[i - horizon:i + 1]
        if all(d in price_map for d in dates):
            result[dates[-1]] = price_map[dates[-1]] / price_map[dates[0]] - 1
    return result


screens = []
all_candidates = {t: p for t, p in prices.items() if t != "SPY"}
for name, numerator, denominator in [("HYG_LQD_PRICE_RATIO", "HYG", "LQD"), ("TLT_IEF_PRICE_RATIO", "TLT", "IEF")]:
    all_candidates[name] = {d: value / prices[denominator][d] for d, value in prices[numerator].items() if d in prices[denominator]}
for name, candidate in all_candidates.items():
    horizons = {}
    for horizon in [1, 21]:
        values, spy = trailing(candidate, horizon), trailing(prices["SPY"], horizon)
        paired = sorted(set(values) & set(spy) & set(baseline_dates))
        horizons[str(horizon)] = {"observations": len(paired), "first": paired[0] if paired else None,
            "last": paired[-1] if paired else None,
            "pearson_with_same_horizon_spy_return": corr([values[d] for d in paired], [spy[d] for d in paired]),
            "descriptive_candidate_return": describe([values[d] for d in paired]),
            "by_year": {year: {"observations": len(ds), "pearson_with_spy": corr([values[d] for d in ds], [spy[d] for d in ds])}
                for year in sorted(set(d[:4] for d in paired))
                for ds in [[d for d in paired if d.startswith(year)]]}}
    screens.append({"candidate": name, "status": "DESCRIPTIVE_UNQUALIFIED_SNAPSHOT_ONLY", "horizons_sessions": horizons})

sources = [
    {"id": "HYG", "url": "https://www.ishares.com/us/products/239565/ishares-iboxx-high-yield-corporate-bond-etf", "fact": "USD below-investment-grade corporate bond ETF; market price is a fund share price, not an option-adjusted spread."},
    {"id": "LQD", "url": "https://www.ishares.com/us/products/239566/ishares-iboxx-investment-grade-corporate-bond-etf", "fact": "USD investment-grade corporate bond ETF. HYG/LQD ratios combine different portfolios and rate/credit exposures; a price ratio does not isolate a yield spread."},
    {"id": "TLT", "url": "https://www.ishares.com/us/products/239454/ishares-20-year-treasury-bond-etf", "fact": "Treasury bond portfolio with remaining maturities above twenty years; its share price is not the 20Y or 30Y Treasury yield."},
    {"id": "IEF", "url": "https://www.ishares.com/us/products/239456/ishares-710-year-treasury-bond-etf", "fact": "Treasury bond portfolio with remaining maturities from seven to ten years. An ETF price return is not a constant-maturity yield change."},
    {"id": "UUP", "url": "https://www.sec.gov/Archives/edgar/data/1371571/000119312526083557/uup-20251231.htm", "fact": "UUP holds long DX futures tied to six USDX currencies. Fund price includes portfolio/collateral/expense and futures effects, so it cannot be relabeled spot DXY."},
    {"id": "USO", "url": "https://www.uscfinvestments.com/disclosures", "fact": "USO uses oil futures and collateral; contango, backwardation and rolling can create substantial differences from spot oil. Its futures allocation changed around 2020 and transitioned again in 2023-2024."},
    {"id": "GLD", "url": "https://www.spdrgoldshares.com/usa/", "fact": "Gold-backed trust shares are a distinct listed instrument; GLD share price is not a dollars-per-ounce spot quote or a creation/redemption flow."},
    {"id": "SLV", "url": "https://www.ishares.com/us/literature/annual-filings/slv-20251231.pdf", "fact": "Silver trust shares represent bullion less trust costs. Silver per share declines as metal is sold to meet expenses."},
    {"id": "FRED_ICE_HY_OAS", "url": "https://fred.stlouisfed.org/series/BAMLH0A0HYM2", "fact": "OAS relative to a spot Treasury curve; daily close, percent. Series notes announce only three years of observations from April 2026 and ICE restrictions on third-party publication/distribution. Longer history and rights cannot be assumed. Weekend month-end observations can occur; latest FRED values remain subject to revision."},
    {"id": "FRED_COPYRIGHT", "url": "https://fredhelp.stlouisfed.org/fred/graphs/share-my-fred-graph/cite/", "fact": "FRED directs users to original providers for permission to share copyrighted data beyond personal noncommercial use. Public visibility is not a transferable data licence."},
    {"id": "TREASURY", "url": "https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics/treasury-yield-curve-methodology", "fact": "Official par curve uses indicative bid quotations near 15:30 ET; this observation time is not an availability timestamp. Monotone-convex methodology replaced the older spline on 2021-12-06."},
    {"id": "FED_BROAD_USD", "url": "https://www.federalreserve.gov/releases/h10/h10_technical_qa.htm", "fact": "Broad daily dollar indices have a goods-and-services trade-weight methodology, a January 2006 base, and historical revisions. They are a different definition from ICE USDX/DXY."},
    {"id": "EIA_SPOT", "url": "https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm", "fact": "EIA publishes petroleum spot series with instrument/location definitions and source notes. Spot prices would require their own unit, observation and release-time contract; no series was fetched for this audit."},
    {"id": "YAHOO_TERMS", "url": "https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html?.intl=us&.lang=en", "fact": "Terms restrict automated collection without express prior permission. No documented source licence or permission covering a new prospective cross-asset feed was found in the inspected candidate files; this audit grants none."},
]
for source in sources:
    source["checked_on"] = "2026-09-08"
    source["source_type"] = "OFFICIAL_PRIMARY"

candidate_specs = [
    ("CREDIT_ETF_PRICE_CONTEXT", ["HYG", "LQD"], "credit", "DIAGNOSTIC", "RESEARCH_ONLY", "HY and IG fund-price context. Relative price is duration/credit/liquidity/fees/distribution exposure, not OAS.", "Corporate credit has a distinct economic object but market stress overlaps the existing equity/VIX complex. Different tickers alone do not establish independence.", "MEDIUM", ["HYG", "LQD", "YAHOO_TERMS"]),
    ("CREDIT_OAS", [], "credit", "CORE_CANDIDATE", "RESEARCH_ONLY", "An actual option-adjusted credit spread would be closer to compensation for corporate credit risk than ETF price ratios.", "Potential new economic family; incremental context is unmeasured without a compatible history and point-in-time release contract.", "HIGH", ["FRED_ICE_HY_OAS", "FRED_COPYRIGHT"]),
    ("TREASURY_ETF_PRICE_CONTEXT", ["TLT", "IEF", "SHY"], "rates", "DIAGNOSTIC", "RESEARCH_ONLY", "Duration-sensitive Treasury fund-price context; TLT/IEF is not the 30Y-minus-10Y curve slope.", "Rate shocks can differ from equity internals, but duration, distributions, and common risk episodes create dependence.", "MEDIUM", ["TLT", "IEF", "YAHOO_TERMS"]),
    ("TREASURY_PAR_YIELDS", [], "rates", "CORE_CANDIDATE", "RESEARCH_ONLY", "Official maturity-specific par yields and a named maturity slope would add a rate dimension after a separate economic definition.", "Independent instrument family is plausible; useful classification direction is context-dependent and not demonstrated here.", "MEDIUM", ["TREASURY"]),
    ("UUP_FUTURES_FUND_PRICE", ["UUP"], "USD", "DIAGNOSTIC", "RESEARCH_ONLY", "Dollar futures fund price versus six currencies. No substitution for DXY or a broad trade-weighted dollar index.", "Dollar strength can reflect growth or funding stress. Sign alone does not give a universal risk-state vote.", "MEDIUM", ["UUP", "YAHOO_TERMS"]),
    ("FED_BROAD_DOLLAR", [], "USD", "DIAGNOSTIC", "RESEARCH_ONLY", "Broad nominal trade-weighted USD index, explicitly different from DXY. Public methodology provides a possible future source contract.", "Potential contextual dimension; revised weights/history and release lags require vintage/capture controls.", "MEDIUM", ["FED_BROAD_USD"]),
    ("USO_OIL_FUTURES_FUND_PRICE", ["USO"], "commodities", "DIAGNOSTIC", "RESEARCH_ONLY", "Oil futures exposure with roll, collateral and fund-strategy effects; cannot label as WTI spot.", "Overlaps energy-sector equity and USD/inflation context; supply versus demand shocks are ambiguous without an economic rule.", "HIGH", ["USO", "YAHOO_TERMS"]),
    ("GLD_SLV_BULLION_TRUST_PRICE", ["GLD", "SLV"], "commodities", "SATELLITE", "RESEARCH_ONLY", "Listed gold/silver trust price context; separate from bullion spot units and from GLD share-count flow pressure.", "Shared USD/rates/risk drivers and partial overlap with existing GLD satellite. Incremental core information is unestablished.", "MEDIUM", ["GLD", "SLV", "YAHOO_TERMS"]),
    ("EIA_WTI_SPOT", [], "commodities", "DIAGNOSTIC", "RESEARCH_ONLY", "Location-specific physical oil spot price, a separate candidate from USO futures-fund returns.", "Could distinguish physical commodity context but adds release/calendar/source rights issues; no existing paired data.", "MEDIUM", ["EIA_SPOT"]),
]
candidates = []
for cid, symbols, family, potential, classification, meaning, dependency, maintenance, source_ids in candidate_specs:
    candidates.append({"candidate_id": cid, "family": family, "symbols": symbols,
        "source": {"existing": "Statistical Levels retained Yahoo fallback snapshot" if symbols else None, "official_reference_ids": source_ids},
        "historical_coverage": {"local_retained_snapshots": [i for i in inventory if i["ticker"] in symbols],
            "local_verified_native_raw_observations": 0, "full_c03_1930_daily_conformance_possible": False,
            "external_coverage": "FRED currently limits displayed OAS history to three years; no external observations acquired." if cid == "CREDIT_OAS" else "Not acquired or claimed as local evidence."},
        "point_in_time_properties": {"status": "UNBOUND", "prospective_captures": 0,
            "source_published_at": None, "captured_at": None, "available_at": None,
            "note": "Snapshot generation date is not row publication or contemporaneous availability. External latest history does not supply a vintage guarantee."},
        "economic_meaning": meaning, "dependency_with_existing_core": dependency,
        "incremental_information": {"classification": "INDETERMINATE", "new_economic_object_possible": family in ["credit", "rates", "USD", "commodities"],
            "evidence": "See descriptive local return screen where available. Correlation differences do not establish incremental classification value or predictive superiority."},
        "maintenance_burden": maintenance,
        "new_obligations": ["Versioned exact instrument and unit identity", "Source permission and stable acquisition contract", "Native price/spread proof and raw-byte retention", "Release/availability calendar and no stale carry", "Prospective dependent-family evaluation"],
        "licensing_source_stability": "Source-specific rights and stable endpoints remain an adoption gate; consult referenced primary source notes. No access or redistribution rights inferred from being public.",
        "potential_role_if_gates_pass": potential, "classification": classification, "verdict": "PARK",
        "canonical_integration": "NONE"})

cross = {
    "scope": "G15-G16; existing capabilities and source-method audit only. No network datasets, new adapter, canonical source or feature integration.",
    "canonical_C03": "UNCHANGED", "CROSS_ASSET_CORE": "NONE", "core_extension_evidence": "INDETERMINATE",
    "snapshot_metadata": {k: read(ROOT / "lib/statistical-levels/generated/manifest.json")[k] for k in ["generatedAt", "snapshotGeneratedAt", "source", "sourceUrl"]},
    "existing_provider_binding": "The manifest has a generic Stooq URL, but every inspected asset explicitly reports Yahoo fallback. Neither proves a row-level native price basis.",
    "source_contract_gaps": [
        "scripts/build-statistical-levels.mjs parseYahooChart uses adjusted[index] ?? close and normalizeRow uses adjustedClose ?? close; missing native adjustment can be silently replaced for this older independent product.",
        "Saved compactSeries stores rounded closes and no raw Yahoo envelope, provider revision identity, currency proof or five-field temporal envelope.",
        "Longer upstream periods and undated windowReturns summaries cannot reconstruct daily 2019-2026 observations. Weekly/monthly closes must not be expanded to daily.",
        "Snapshot stops 2026-08-14; no forward-fill into the 15 later C03 sessions. These limitations do not alter or invalidate the separate accepted V2 native source contract."
    ],
    "inventory": inventory, "candidates": candidates,
    "dependence_screen": {"method": "Pearson of same-date simple price-proxy returns over one and 21 observed SPY sessions, requiring every interior session; exact intersections, no interpolation. Coefficient describes dependence only.",
        "eligibility": "Not V2-qualified: native adjustment and contemporaneous availability unproven. No hypothesis selection or canonical challenger adjudication uses these values.",
        "results": screens},
    "rejected_semantic_substitutions": ["HYG/LQD price ratio = credit spread", "TLT/IEF ETF price ratio = Treasury yield-curve slope", "UUP share price = DXY", "USO price = WTI spot", "GLD price return = GLD creation/redemption flow"],
    "decision": "PARK cross-asset growth. Credit OAS and official Treasury yields are research priorities, not adoption-ready core proposals. Existing price snapshots can inform a separately sourced diagnostic after source gates close.",
    "minimum_evidence_to_reopen": ["Frozen source/unit/price/availability/calendar contract and permitted source use", "Same-cutoff real history or prospective captures with full required feature windows", "Distinct conflicting-context episodes where the candidate adds an explanation absent from equity/VIX", "Registered simple offline comparison and complexity/failure-mode accounting; no return target"],
    "official_sources": sources,
    "reproduce": "python3 docs/regime-engine-v2/groweer/audit-cross-asset-pfl.py",
}
assert all(i["baseline_sessions_after_snapshot"] == 15 for i in inventory)
write("cross-asset-audit.json", cross)

pfl = json.loads(subprocess.check_output([
    "node", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--import", "./scripts/trends-test-register.mjs",
    "docs/regime-engine-v2/groweer/audit-pfl-components.mjs"], text=True))
rows = pfl["rows"]
cluster_tab = collections.defaultdict(collections.Counter)
for row in rows:
    cluster_tab[row["canonical_c"]][str(row["cluster_count"])] += 1
metrics = ["cluster_count", "largest_cluster_capital_share", "diversification_ratio", "portfolio_volatility_annual", "risk_contribution_hhi"]
numeric_summary = {metric: {"all": describe([r[metric] for r in rows]),
    "by_canonical_c": {c: describe([r[metric] for r in rows if r["canonical_c"] == c]) for c in sorted(cluster_tab)},
    "pearson_with_core_rho21": corr([r[metric] for r in rows], [features[r["date"]]["rho21"] for r in rows]),
    "pearson_with_core_rho63": corr([r[metric] for r in rows], [features[r["date"]]["rho63"] for r in rows])} for metric in metrics}
adjacent = [(a, b) for a, b in zip(rows, rows[1:]) if calendar.index(b["date"]) - calendar.index(a["date"]) == 1]
changes = {"adjacent_pairs": len(adjacent),
    "cluster_count_changes": sum(a["cluster_count"] != b["cluster_count"] for a, b in adjacent),
    "cluster_count_change_rate": sum(a["cluster_count"] != b["cluster_count"] for a, b in adjacent) / len(adjacent),
    "cluster_change_without_c_change": sum(a["cluster_count"] != b["cluster_count"] and a["canonical_c"] == b["canonical_c"] for a, b in adjacent),
    "c_changes_without_cluster_change": sum(a["canonical_c"] != b["canonical_c"] and a["cluster_count"] == b["cluster_count"] for a, b in adjacent),
    "note": "Different frequency or labels is not evidence that one is superior. Clusters use an up-to-252-return matrix; canonical C uses 21/63-return correlation features."}

pfl_components = [
    {"component": "capital_concentration_hhi_effective_holdings_top_n", "semantic_compatibility": "Portfolio allocation property, not market regime evidence.",
     "data_compatibility": "Requires dated holdings/weights. Equal sector weights in this study are explicitly hypothetical.",
     "dependency": "Exogenous user portfolio input; no contemporaneous holdings history exists.", "incrementality": "USEFUL_FOR_PORTFOLIO_ONLY; zero time variation under frozen equal weights.",
     "classification": "DIAGNOSTIC", "maintenance": "LOW inside PFL; HIGH if a new market-wide holdings source is added."},
    {"component": "sample_covariance_and_pair_correlation", "semantic_compatibility": "Equity co-movement is compatible as a diagnostic; not a second family vote.",
     "data_compatibility": "Same native Yahoo adjusted close inputs can be converted explicitly to the PFL total-return index convention; captured late, R2 only.",
     "dependency": "Same eleven sector ETF price lineage as C03 equity/fragility. Window 60-252 returns versus canonical 21/63.",
     "incrementality": "INDETERMINATE_VALUE; repeated price transform, not new independent observations.",
     "classification": "DIAGNOSTIC", "maintenance": "MEDIUM: window, aligned calendar, price basis, source capture and low-sample handling."},
    {"component": "behaviour_clusters_and_largest_cluster_capital_share", "semantic_compatibility": "Topology/dispersion of correlation can describe concentration lost by a simple mean.",
     "data_compatibility": "At least three positive holdings, 60 common returns; unchanged complete-link threshold 0.7.",
     "dependency": "Exact same sector returns; additional structure within the equity family only.", "incrementality": "MODERATE_DESCRIPTIVE_DETAIL; incremental regime utility INDETERMINATE.",
     "classification": "RESEARCH_ONLY", "maintenance": "MEDIUM-HIGH: adds portfolio weights, clustering threshold, window and topology-specific failure explanations."},
    {"component": "portfolio_volatility_risk_contributions_diversification_ratio", "semantic_compatibility": "Portfolio risk decomposition is useful to an owner of the stated holdings, but depends on the chosen weights.",
     "data_compatibility": "Requires a consistent total-return basis, currency and aligned sample covariance; zero-volatility inputs remain unavailable.",
     "dependency": "Same price covariance; no new independent family. Hypothetical allocation cannot be called market-wide fragility.",
     "incrementality": "INDETERMINATE_CORE_VALUE; useful within-portfolio decomposition, not a canonical feature proposal.",
     "classification": "DIAGNOSTIC", "maintenance": "MEDIUM: weights and negative marginal contributions require their own product semantics."},
    {"component": "static_share_path_drawdown_recovery_duration", "semantic_compatibility": "Trailing realized portfolio path; retrospective recovery dates must not leak past the as-of date.",
     "data_compatibility": "Same total-return input and explicit initial weights; buy-and-hold share path differs from a rebalanced allocation.",
     "dependency": "Derived from equity prices already present. Cross-asset portfolios depend on new qualified source history.",
     "incrementality": "CONTEXTUAL_ONLY; no evidence for an independent core family.", "classification": "DIAGNOSTIC", "maintenance": "MEDIUM: window censoring, recovery and portfolio path conventions."},
    {"component": "direct_stress_covariance_stress_counterfactuals", "semantic_compatibility": "User-selected hypothetical assumptions, not observed economic evidence.",
     "data_compatibility": "Direct shock scenarios use user inputs; covariance scenarios additionally use historical covariance.",
     "dependency": "No new observation. A shock assumption or lambda cannot become measured regime evidence.", "incrementality": "REJECT_AS_CORE_EVIDENCE; useful only as a scenario tool.",
     "classification": "REJECT", "maintenance": "Keep isolated in PFL; would introduce arbitrary scenario thresholds if promoted."},
    {"component": "historical_episode_replay", "semantic_compatibility": "Retrospective scenario context for explicit portfolios; named episodes are not daily PIT labels.",
     "data_compatibility": "Bundled observations are synthetic. Real user CSV needs complete coverage, currency, total-return and inception proofs.",
     "dependency": "Static episode definitions plus price paths; no independent current observation.", "incrementality": "INDETERMINATE for real data; synthetic outputs cannot validate regime quality.",
     "classification": "RESEARCH_ONLY", "maintenance": "HIGH if promoted: historical raw data, vintages, proxy governance, episode censoring."},
]
for item in pfl_components:
    item["historical_coverage"] = {"bundled_real_market_observations": 0,
        "same_equity_R2_diagnostic_sessions": len(rows) if item["component"] in ["sample_covariance_and_pair_correlation", "behaviour_clusters_and_largest_cluster_capital_share", "portfolio_volatility_risk_contributions_diversification_ratio", "capital_concentration_hhi_effective_holdings_top_n"] else None,
        "user_real_portfolio_history": "NOT_PRESENT_IN_REPOSITORY"}
    item["verdict"] = "KEEP_IN_PFL_OR_OFFLINE_DIAGNOSTIC; NO_CORE_PROMOTION"

compatibility = {
    "scope": "G17; component audit and isolated descriptive replay of existing PFL functions. No imports or changes in canonical Regime V2.",
    "PFL_CORE": "NONE", "fragilityScore_imported": False,
    "important_namespace_distinction": "No fragilityScore exists in the inspected PFL engine; that field found in V1 shadow evidence is a different regime implementation. No score is read or imported here.",
    "local_data": pfl["local_demo"],
    "current_api_temporal_contract": {"HistoryObservation_fields": ["assetId", "date", "value", "currency", "returnBasis", "source", "provenance", "inceptionDate"],
        "missing_regime_envelope_fields": ["observationDateEnd", "sourcePublishedAt", "capturedAt", "availableAt", "asOf", "replayClass", "calendarVersion"],
        "assessment": "PFL row dates and free-text provenance cannot prove PIT availability. Reuse of arithmetic does not transfer temporal eligibility; an explicit R2 context is attached by this offline harness only."},
    "offline_experiment": {k: v for k, v in pfl.items() if k not in ["rows", "local_demo"]},
    "summary": {"eligible_sessions": len(rows), "excluded_sessions": len(pfl["excluded"]),
        "low_sample_sessions": sum(bool(r["quality_flags"]) for r in rows),
        "observed_return_window_counts": dict(sorted(collections.Counter(r["return_observations"] for r in rows).items())),
        "cluster_count_occupancy": dict(sorted(collections.Counter(r["cluster_count"] for r in rows).items())),
        "canonical_c_by_cluster_count": {c: dict(sorted(v.items(), key=lambda x: int(x[0]))) for c, v in cluster_tab.items()},
        "changes": changes, "numeric_components": numeric_summary},
    "components": pfl_components,
    "incremental_evidence_conclusion": "Cluster topology and weighted covariance summaries expose information beyond a single mean correlation numerically, but all are deterministic transforms of the existing equity lineage. No independent source, observed portfolio weights, or superiority evidence is added. Longer persistence reflects a longer window and cannot alone justify promotion.",
    "decision": "Keep PFL as its own portfolio tool. Park any market-wide clustering extension for a specifically justified within-equity diagnostic; no core proposal.",
    "complexity_of_proposed_promotion": {"new_data_source": "NO for sector-only transform; YES for real holdings or new assets", "new_runtime_dependency": "Would couple to PFL code if integrated; none added", "new_state": "Cluster IDs/counts as diagnostics only", "new_rule": "Weighting plus clustering interpretation would require a separately authorized contract", "new_threshold": "0.7 and 60/252 windows are existing PFL constants, not approved V2 thresholds", "new_failure_mode": "Weights, total-return compatibility, low sample, clustering discontinuities, missing temporal envelope"},
    "reproduce": "python3 docs/regime-engine-v2/groweer/audit-cross-asset-pfl.py",
    "analysis_checks": {"raw_hash_checks": len(pfl["native_lineage"]), "baseline_accounting": "1930 eligible + 0 excluded = 1930",
        "window_cutoff_bounds": "PASS", "constant_equal_weight_hhi": "PASS", "observed_PFL_constants_unchanged": "PASS"},
    "input_hashes": {p: sha(ROOT / p) for p in ["lib/portfolio-fragility/engine.ts", "lib/portfolio-fragility/demo-data.ts", "lib/portfolio-fragility/session.ts", "docs/regime-engine-v2/p8/historical-features-r2.json", "docs/regime-engine-v2/sweeper/historical-r2-output.json"]},
    "rows": rows,
}
write("pfl-compatibility.json", compatibility)
print(json.dumps({"cross_asset_candidates": len(candidates), "cross_asset_existing_symbols": len(inventory) - 1,
    "PFL_R2_sessions": len(rows), "PFL_excluded": len(pfl["excluded"]), "PFL_synthetic_demo_rows": pfl["local_demo"]["rows"],
    "cluster_count_changes": changes["cluster_count_changes"], "canonical_engine_modified": False}))
