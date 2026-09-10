"""Materialize P8 contract overlays; preserve P1-P7 evidence unchanged."""
import collections, datetime as dt, hashlib, json
from pathlib import Path
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]
def read(name):return json.loads((BASE/name).read_text())
def save(name,value):(BASE/name).write_text(json.dumps(value,indent=2,ensure_ascii=False,allow_nan=False)+'\n')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
registry=json.loads((BASE.parent/'feature-registry.json').read_text())['features']
now=dt.datetime.now(dt.timezone.utc).isoformat()
core={
 'eq_positive_5':'Short participation; can diverge from the 21-session breadth count. Same equity family.',
 'eq_positive_21':'Medium participation; avoids reducing two horizons to a single recent move. Same equity family.',
 'eq_leadership_gap':'Relative non-defensive versus defensive leadership; distinguishes broad/selective participation from who leads.',
 'vix_level':'Absolute implied risk level; momentum and curve can be calm at an elevated level.',
 'vix_momentum_1':'Immediate relative acceleration; can cross the fast threshold without a five-session jump.',
 'vix_momentum_5':'Multi-session acceleration; detects cumulative change without a large final daily move.',
 'vx_slope_12':'Near monthly settlement geometry; can disagree with spot VIX and signals material inversion.',
 'corr_mean_21':'Current co-movement level across all 55 pairs; separates high concentration of return behavior.',
 'corr_window_spread':'Nested 21-minus-63 change; distinguishes rising fragility before the high-level boundary. The 63-session mean is a parent, not a separate vote.'}
sources={
 'EQUITY_ADJUSTED':{'series_type':'ETF_ADJUSTED_PRICE','price_basis':'SPLIT_DIVIDEND_ADJUSTED_CLOSE','adjustment_policy':'Use provider adjclose arrays only. No close fallback, mixed bases or manual second adjustment.',
  'return_definition':'Simple return 100*(P[t]/P[t-n]-1), n=5/21/63 sessions; daily returns for correlation are P[t]/P[t-1]-1.',
  'corporate_action_policy':'Retain dividends/splits event records and whole-panel vintage hashes. Revisions create a new snapshot. This is a vendor distribution-adjusted return proxy, not an exact investor total-return claim. Unknown adjustment provenance makes the input unavailable.',
  'source':'Yahoo chart endpoint already used by scripts/build-statistical-levels.mjs and the report evidence capture. P8 selects this verified adjusted panel; Alpha Vantage TIME_SERIES_DAILY remains a V1 precedent only.',
  'source_field':'chart.result[0].indicators.adjclose[0].adjclose aligned to timestamp; meta.currency; events.dividends/events.splits',
  'compatibility_constraints':['USD','same provider adjustment convention and declared vintage manifest across all 11 ETFs','ratio numerator/denominator same currency, basis and session','all required dates and constituents; never fill missing with close or zero'],
  'rationale':'The repository has both raw-close and adjustment-preferring paths. Actual P8 provider payloads contain distinct adjclose and close arrays plus corporate-action events; the display alias alone was insufficient.',
  'evidence':['source-data-audit.json','evidence/yahoo-*.json.metadata.json','../source-ledger.json#S03-S04-S10-S20','https://help.yahoo.com/kb/SLN28256.html']},
 'VIX_OFFICIAL':{'series_type':'OFFICIAL_VIX_INDEX','price_basis':'OFFICIAL_DAILY_INDEX_CLOSE','adjustment_policy':'No equity adjustment. Preserve index points.',
  'return_definition':'Point change V[t]-V[t-n] and relative momentum 100*(V[t]/V[t-n]-1) are distinct fields.',
  'corporate_action_policy':'Not an equity. Preserve revisions as separate official-index vintages.',
  'source':'Cboe official VIX History CSV; official-source history already appears in weekly-review evidence. Existing FRED VIXCLS path is documented but not silently spliced into this panel.',
  'source_field':'CSV DATE and CLOSE; not HIGH/LOW/OPEN. FRED observations.value only under an explicitly separately versioned source contract.',
  'compatibility_constraints':['positive finite official index value','same economic session as core equities and VX','complete six closes for core level and 1/5-session momentum','percentile uses bounded prefix through target, no future rows'],
  'rationale':'VIX is an observed index level, not an adjustable equity price.',
  'evidence':['evidence/vix-history.csv.metadata.json','../source-ledger.json#S11-S12','https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv','https://fred.stlouisfed.org/series/VIXCLS']},
 'VX_OFFICIAL':{'series_type':'OFFICIAL_MONTHLY_VX_SETTLEMENT','price_basis':'OFFICIAL_DAILY_SETTLE','adjustment_policy':'No equity adjustment, continuous-contract back-adjustment or substitution of Close/final SOQ.',
  'return_definition':'Slope 100*(VX2/VX1-1); spread VX2-VX1. Slots are maturity ranks on one date, never an ETF return series.',
  'corporate_action_policy':'Retain actual contract symbol, expiration and daily settlement. Roll is catalog-based selection of first two monthly expirations strictly after target; weekly, expired and final-expiry settlement are excluded.',
  'source':'Cboe/CFE official monthly VX historical CSV archive, same official settlement convention as lib/dashboard/adapters/vix-term-structure.ts.',
  'source_field':'CSV Trade Date, Futures, Settle; catalog duration_type=M, futures_root=VX, expire_date, product_display and path.',
  'compatibility_constraints':['same trade/settlement date','catalog determines expected slots before examining prices','missing VX1 is retained as missing; never promote VX2','unique identities and expirations; no weekly or synthetic contracts'],
  'rationale':'The actual archive has a separate Settle column and often zero Close. Only official Settle meets the repository curve convention.',
  'evidence':['evidence/cfe-contract-index.json.metadata.json','evidence/selected-contracts.json','evidence/vx-*.csv.metadata.json','../source-ledger.json#S13-S14','https://www.cboe.com/markets/us/futures/market-statistics/historical-data/futures']},
 'BTC_NATIVE':{'series_type':'REPORTED_ETF_NET_FLOW','price_basis':'NOT_APPLICABLE_NATIVE_USD_MILLIONS','adjustment_policy':'Do not equity-adjust money flows. Preserve USD millions; USD conversion is explicit multiplication by 1,000,000.',
  'return_definition':'Not a return: reported daily total and bounded sums in USD millions; positive/negative/zero/missing fund counts separately.',
  'corporate_action_policy':'Version expected fund columns and constituent changes. Dash/unreported is null. Use reported total with partial-fund coverage flagged; derive total only when all expected fund cells are observed and reconciliation is explicit.',
  'source':'Existing report Farside parsed public table in btc-source.json. It is a web-reader extraction, not original HTML; provenance limitation retained.',
  'source_field':'columns Date, twelve named fund columns, Total; rows[][]; source/url/retrievedAt/retrievalMethod.',
  'compatibility_constraints':['one fund-universe/version per breadth calculation','no cross-vendor row splicing','consecutive expected sessions for sums','streak zero breaks; missing/start is censored','cumulative scope names first/last observed table row'],
  'rationale':'Flows retain monetary units and raw cell missingness; they are optional satellite evidence with zero core votes.',
  'evidence':['../../../../lib/reports/snapshots/primer-informe-septiembre-2026/btc-source.json','../source-ledger.json#S15-S16','https://farside.co.uk/bitcoin-etf-flow-all-data/']},
 'GLD_NATIVE':{'series_type':'FUND_SHARES_NAV_AUM','price_basis':'NATIVE_SHARES_NAV_USD_PER_SHARE_AUM_USD','adjustment_policy':'No equity-price adjustment of shares/flows. Preserve shares, NAV USD/share and AUM USD separately.',
  'return_definition':'delta_shares=shares[t]-shares[t-n]; fraction=delta_shares/shares[t-n]; pressure_proxy_usd=delta_shares*NAV[t]. Not reported fund flows and not a sum of daily flows.',
  'corporate_action_policy':'A share-unit/split event requires explicit dated unit mapping before differences; otherwise window unavailable. Never infer a creation/redemption flow from an unverified share-unit jump.',
  'source':'State Street fund-data workbook already used by gld-flow-pressure.ts; retained report history is the available parsed evidence layer.',
  'source_field':'date, nav, shares outstanding, total net assets -> dashboard-evidence.gldFlowPressure.history[].date/nav/sharesOutstanding/totalNetAssets.',
  'compatibility_constraints':['n+1 dated rows for n-session difference','positive finite native NAV/shares/AUM','preserve abs(NAV*shares-AUM)/AUM and .01 legacy diagnostic bound; incomplete 21-row coherence audit flagged PARTIAL','20 retained rows do not prove a 20-session difference'],
  'rationale':'Shares and price are economically different dimensions. Native share changes give an optional pressure proxy, never a core vote.',
  'evidence':['../../../../lib/reports/snapshots/primer-informe-septiembre-2026/dashboard-evidence.json','../source-ledger.json#S17','https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-gld.xlsx']},
 'UNBOUND_RESEARCH':{'series_type':'PARKED_RESEARCH_INPUT','price_basis':'NOT_BOUND_FOR_ACTIVE_V2','adjustment_policy':'No active evaluation. Any underlying equity data retains EQUITY_ADJUSTED lineage; portfolio holdings are not substituted for a market universe.',
  'return_definition':'Documented research expression only; not an active feature contract.', 'corporate_action_policy':'Inherited raw-family policy where defined; otherwise not evaluable.',
  'source':'P1 registry and repository research/portfolio helpers; no newly approved market input.', 'source_field':'See original registry depends_on and source.existing_field_or_symbol; missing market archive/holdings compatibility is explicit.',
  'compatibility_constraints':['PARKED','zero votes','requires separate evidence/version before activation'],
  'rationale':'Builder can faithfully preserve an unavailable parked feature without inventing a market series or making it a blocker for the fixed core.', 'evidence':['../feature-registry.json','../dependency-map.json']},
 'LEGACY_PRESENTATION':{'series_type':'LEGACY_PRESENTATION_RECORD','price_basis':'NOT_APPLICABLE_EXCLUDED_VIEW','adjustment_policy':'Do not recompute V1 presentation as a V2 evidence input.', 'return_definition':'No active V2 return/decision contribution.',
  'corporate_action_policy':'Preserve original V1 snapshots byte-for-byte.', 'source':'Original V1 module output and P1 source audit.', 'source_field':'Original registry source.existing_field_or_symbol.',
  'compatibility_constraints':['EXCLUDED_FROM_V2_REPLAY','zero votes','never substitute score/label for raw family evidence'], 'rationale':'An existing composite is a presentation product, not independent evidence.', 'evidence':['../feature-registry.json','../preservation.json']}}

def source_key(f):
 if f['required_or_optional']=='PARKED':return 'UNBOUND_RESEARCH'
 if f['required_or_optional']=='EXCLUDED':return 'LEGACY_PRESENTATION'
 return {'participation':'EQUITY_ADJUSTED','leadership':'EQUITY_ADJUSTED','co_movement':'EQUITY_ADJUSTED','realized_risk':'EQUITY_ADJUSTED','vix_spot':'VIX_OFFICIAL','vix_curve':'VX_OFFICIAL','btc_flows':'BTC_NATIVE','gld_pressure':'GLD_NATIVE'}[f['family']]

acq=read('acquisition.json')
capture_groups={
 'EQUITY_ADJUSTED':[s for s in acq['sources'] if 'finance.yahoo.com' in s['url']],
 'VIX_OFFICIAL':[s for s in acq['sources'] if 'VIX_History' in s['url']],
 'VX_OFFICIAL':[s for s in acq['sources'] if 'market_statistics' in s['url']]}
local_sources={}
for key,name in [('BTC_NATIVE','btc-source.json'),('GLD_NATIVE','dashboard-evidence.json')]:
 path=ROOT/'lib/reports/snapshots/primer-informe-septiembre-2026'/name
 local_sources[key]={'path':str(path.relative_to(ROOT)),'sha256':sha(path),'reported_original_capture':'2026-09-06','original_capture_precision':'DAY_WITHOUT_TIMEZONE','source_published_at':None,'verified_in_p8_at':now,'available_at':now,'availability_certainty':'CONSERVATIVE_BOUND','meaning':'P8 first proof of these retained bytes only; never backdate exact availability to 2026-09-06.'}
prices=[]; temporal=[]; minimized=[]; qualified=[]
for f in registry:
 fid=f['feature_id']; key=source_key(f)
 row=dict(feature_id=fid,family=f['family'],source_contract_id=key,**sources[key])
 row['feature_transform']=f['transform'];row['unit']=f['unit'];row['minimum_history']=f['minimum_history']; row['execution_status']=f['required_or_optional']
 prices.append(row)
 role='CORE_DECISION' if fid in core else 'PRESENTATION_ONLY' if f['required_or_optional']=='EXCLUDED' else 'RESEARCH_ONLY' if f['required_or_optional']=='PARKED' else 'SATELLITE' if f['family'] in ['btc_flows','gld_pressure'] else 'DIAGNOSTIC'
 kind='RAW' if fid in ['vix_level','vx_contracts','btc_daily','gld_fund_data'] else 'DERIVED'
 minimized.append({'feature_id':fid,'primary_role':role,'data_kind':kind,'required_transitive_core_input':f['required_or_optional']=='REQUIRED_CORE','dependency_group':f['dependency_group'],'concordance_vote_increment':0,'incremental_information':core.get(fid,'Not a direct core decision condition. Transitive parents enable core transforms but add no vote.')})
 unknown=key in ['UNBOUND_RESEARCH','LEGACY_PRESENTATION'] or fid in ['gld_shares_change_20','gld_pressure_usd_20']
 replay='UNKNOWN' if unknown else 'R2'
 reason='Parked/excluded feature has no active V2 replay value contract.' if key in ['UNBOUND_RESEARCH','LEGACY_PRESENTATION'] else 'Only 20 raw GLD rows retained; need 21. Existing 20-session scalar is not a raw-window substitute.' if unknown else 'Retrospectively captured version; historical publication/vintage availability is unproved.'
 coverage=['2026-08-03','2026-09-04'] if key=='BTC_NATIVE' else ['2026-08-10','2026-09-04'] if key=='GLD_NATIVE' else ['2019-01-01','2026-09-04'] if not unknown else None
 t={'feature_id':fid,'source_contract_id':key,'historical_replay_class':replay,'historical_eligibility':'NOT_USABLE_FOR_REPLAY' if unknown else 'RECONSTRUCTED_ONLY', 'coverage_envelope_not_every_window':coverage,'minimum_history':f['minimum_history'],
  'observation_date':'Economic session of final contributing observation; every constituent row retains its own session.',
  'source_published_at':None,'historical_availability_certainty':'UNKNOWN','captured_at':'Per raw metadata file; original local snapshot is day-precision only.',
  'available_at_rule':'Maximum proven availability of every required raw parent and contract catalog, for exactly these vintage hashes; null if any parent lacks a bound.',
  'as_of_rule':'Caller supplies timezone-aware UTC cutoff, independent of observation_date and clock now. R0/R1 require every parent available_at<=as_of and observation_end_bound<=as_of. R2 explicitly relaxes historical availability only.',
  'future_pit_eligibility':'Possible only after evidenced capture bound and with all exact parent versions, complete windows and valid session calendar; not counted as historical R0 here.' if not unknown else 'No active V2 PIT value.',
  'missing_behavior':f['missing_behavior'],'reason':reason}
 temporal.append(t)
 qualified.append(dict(f,qualified_source_contract=key,qualified_price_series_contract=row,qualified_temporal_contract=t,minimization=minimized[-1]))
save('price-series-contract.json',{'version':'p8-price-series/1.0.0','status':'PASS','precedence':'Overrides unbound price/source fields of P1-P7; no architecture/taxonomy change.','family_contracts':sources,'features':prices})
source_temporal={}
for key in sources:
 source_temporal[key]={'observation_date':'native economic/session date, never capture date','source_published_at':None,'availability_certainty':'CONSERVATIVE_BOUND' if key in capture_groups or key in local_sources else 'UNKNOWN','historical_availability_certainty':'UNKNOWN','available_at':'capture-completed instant of exact bytes; include parent catalog bound' if key in capture_groups else local_sources.get(key,{}).get('available_at'), 'captured_at':'per evidence metadata' if key in capture_groups else local_sources.get(key,{}).get('reported_original_capture'),'as_of':'explicit caller cutoff','captures':capture_groups.get(key,[]),'local_capture_proof':local_sources.get(key),'publication_sla':'UNPROVEN_NO_FIXED_LAG_ASSUMED'}
classes={c:[t['feature_id'] for t in temporal if t['historical_replay_class']==c] for c in ['R0','R1','R2','UNKNOWN']}
save('temporal-availability-contract.json',{'version':'p8-temporal/1.0.0','status':'PASS','replay_count_scope':'Historical reconstruction through 2026-09-04; per-feature coverage/window restrictions remain. A capture on 2026-09-08 does not turn earlier dates into R0.',
 'definitions':{'R0':'Exact contemporaneous vintage or actual captured vintage eligible only at/after a proven conservative availability bound.','R1':'Reconstruction with proved vintage integrity and guaranteed nonfuture availability rule, even without original contemporaneous system capture. Generic day lags never suffice. No such feature is evidenced here.','R2':'Observation-date reconstruction with later captured/revised values; research only, never strict PIT OOS.','UNKNOWN':'No usable active value/window contract or source/availability unresolved; not admitted to replay.'},
 'required_raw_fields':['observation_date','observation_end_at','observation_end_certainty','source_published_at','available_at','captured_at','availability_certainty','as_of','source_id','source_version','raw_payload_hash','status'],
 'observation_end_rule':'Use evidenced exchange end; if only observation date is known, conservative UTC day-end bound for these verified US daytime sessions (explicit CONSERVATIVE_DAY_END), never claim exact close time. Unknown time zone/session mapping rejects R0/R1.',
 'derived_eligibility':'All raw parents must be eligible. Same cutoff and aligned session; weakest parent replay class propagates. Do not relabel mixed R2/R0 parents as R0.','sources':source_temporal,'features':temporal,
 'PIT_ELIGIBLE_FEATURES':classes['R0']+classes['R1'],'RECONSTRUCTED_ONLY_FEATURES':classes['R2'],'UNRESOLVED_FEATURES':classes['UNKNOWN'],'counts':{k:len(v) for k,v in classes.items()}})
roles=dict(collections.Counter(f['primary_role'] for f in minimized));kinds=dict(collections.Counter(f['data_kind'] for f in minimized))
save('feature-minimization.json',{'features_total':len(minimized),'primary_role_counts':roles,'data_kind_counts':kinds,'counting_rule':'Primary roles are mutually exclusive and sum to 59. RAW/DERIVED are a separate exhaustive axis and must not be added to roles. Required dependency parents are diagnostic role with required_transitive_core_input=true.','raw_inputs_outside_59_registry':'raw_sector_prices/raw_vix_history/raw_vx_settlements/etc are source nodes, not extra registry features.','core_concordance_units':['equity_price_complex','implied_volatility_complex'],'core_concordance_units_maximum':2,'unit_independence_claim':'Economic lineage grouping only; no statistical independence assertion.','features':minimized})
save('feature-registry-qualified.json',{'version':'regime-v2-features/1.0.0-p8-qualified','runtime_enabled':False,'original_registry_sha256':sha(BASE.parent/'feature-registry.json'),'features':qualified})

freshness={'version':'p8-freshness/1.0.0','classification':'STRUCTURAL','binding':'ZERO_SESSION_CARRY_WITH_EXPLICIT_CALENDARS','core_carry_sessions':0,
 'decision_clock':'Caller as_of. Resolve latest expected closed equity session from a versioned market calendar covering the requested interval; every core VIX/VX observation must match it. A closed-equity day does not excuse a missing corresponding VIX/VX daily observation.',
 'source_calendars':{'equity':'NYSE Arca core market calendar, America/New_York; holiday/early-close/DST aware.','vix':'Cboe index daily publication/session calendar, separately versioned; do not assume equity close equals VIX publication.','vx':'CFE settlement calendar and monthly expiry catalog, separately versioned; do not assume equity/VIX clock.','BTC_NATIVE':'Versioned expected US fund-report sessions; actual publication bound required, no 24h TTL inference.','GLD_NATIVE':'Versioned State Street fund valuation sessions; actual publication bound required, no five-calendar-day grace.'},
 'calendar_availability':'Calendar/catalog versions are required input ancestors: preserve provenance, coverage and actual known-at/capture bound. R0/R1 reject calendar versions unavailable at as_of. A partial example schedule cannot claim complete interval coverage.',
 'unavailable_calendar':'UNKNOWN_CALENDAR -> dependent core unavailable; no weekday-only production fallback. A missing/expired calendar version is a defined unavailable input, not an unbound threshold.',
 'availability_gate':'Before source capture/publication bound, report NOT_YET_AVAILABLE/UNKNOWN even if observation_date matches. Unknown release SLA is allowed and cannot imply known availability.',
 'stale_gate':'After a new expected closed decision session, earlier values are STALE until current dated eligible input arrives. Weekends/holidays do not count as missing sessions. Never silently retreat target to latest available common observation.',
 'satellites':'Preserve age, coverage and unavailable reasons independently; any freshness failure has zero effect on core regime/concordance/uncertainty.',
 'calibration':'Structural anti-staleness policy, no fitted TTL or empirical lag. Conservative temporary incompleteness is intentional.',
 'research_calendar':'P8 R2 history uses observed SPY session dates as an explicitly labeled proxy. It cannot establish PIT exchange-calendar knowledge or detect a date missing simultaneously from the source calendar and all prices.',
 'evidence':['contract-check-results.json','raw-check-results.json','https://www.nyse.com/trade/hours-calendars']}
save('freshness-policy.json',freshness)
old=json.loads((BASE.parent/'parameters.json').read_text())
selected=read('F3-training-selection.json')['selected_id']; candidate=next(c for c in read('selection-protocol.json')['candidate_grid'] if c['id']==selected)
values=candidate['parameters']
groups={'PARTICIPATION_BANDS':['k_weak','k_broad'],'LEADERSHIP_GAP':['leadership_gap'],'VOLATILITY_BANDS':['v_watch','v_adverse','v_stress'],'VOLATILITY_MOMENTUM':['jump_1','jump_5'],'CURVE_BANDS':['curve_flat','curve_adverse'],'CORRELATION_BANDS':['rho_floor','rho_high','delta_rising']}
params=[]
for f in old['parameters']:
 pid=f['id']; empirical=pid in groups
 value={k:values[k] for k in groups[pid]} if empirical else {'contract_ref':{'PRICE_BASIS':'price-series-contract.json','SOURCE_AVAILABILITY':'temporal-availability-contract.json','FRESHNESS_POLICY':'freshness-policy.json'}[pid]}
 params.append({'id':pid,'status':'RESOLVED','classification':'EMPIRICALLY_QUALIFIED' if empirical else 'STRUCTURAL' if pid=='FRESHNESS_POLICY' else 'SOURCE_DEFINED','value':value,'domain':f['domain'],'blocking_builder':False,
 'unit':'Integer sector counts / percentage points or relative percent / dimensionless correlation, as identified by the feature contract.' if empirical else 'Contract policy',
 'justification':candidate['rationale']+' Selected by frozen TRAIN-only lexicographic rule, all six candidates pass raw invariants; R2 empirical qualification only.' if empirical else 'Explicit verified family semantics/availability envelope or conservative structural freshness; no fixed source publication lag invented.',
 'decision_author':'P8 Prototyper under the user-authorized gate-closure scope','bound_at':now,'evidence':['protocol-freeze.json','F3-training-selection.json','qualification-results.json','raw-check-results.json'] if empirical else [value['contract_ref'],'contract-check-results.json'],
 'legacy_seed_status':'Candidate provenance only, never evidence of V2 validity.'})
assert read('raw-check-results.json')['failed']==0
assert all(not r['validation_failures_selected'] and not r['test_failures_selected'] for r in read('qualification-results.json')['folds'])
save('parameter-manifest.json',{'version':'regime-v2-parameters/1.0.0-p8','builder_ready':True,'production_validated':False,'implicit_defaults_allowed':False,'selected_candidate':selected,'parameters_total':9,'parameters_resolved':9,'parameters_unresolved':0,'scalar_thresholds_total':len(values),'scalar_thresholds':values,'parameters':params,'parked_parameters':old['parked_parameters'],
 'evidence_sha256':{name:sha(BASE/name) for name in ['selection-protocol.json','F3-training-selection.json','qualification-results.json','raw-check-results.json','price-series-contract.json','temporal-availability-contract.json','freshness-policy.json']},
 'qualification_order_caveat':'Numerical eligibility/selections were sealed before executing raw invariant witnesses. Final binding occurs only now, after all six candidates pass every raw invariant. Thus the admissible candidate set is unchanged. No failed candidate was reselected using validation/test.'})
print(json.dumps({'replay':{k:len(v) for k,v in classes.items()},'roles':roles,'kinds':kinds,'selected':selected},indent=2))
