import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { buildCapitalDataset, compareQuarters, refreshCapitalStatus, securityKey, selectCapitalCompanies, selectQuarter, validateHolding } from './normalize.ts';
import { corporateActionChecks } from './types.ts';
import type { CapitalDataset, ComparisonReview, Filing, Holding, Universe } from './types.ts';
const source = 'https://www.sec.gov/Archives/edgar/data/1/000000000126000001/filing.xml';
const universe: Universe = { id: 'test-only', name: 'Test only', version: 1, managers: [1, 2, 3].map((id) => ({ manager_id: `m${id}`, display_name: `Fixture ${id}`, legal_name: `Fixture ${id}`, manager_type: 'test', filing_expected: true, economic_group_id: `m${id}`, notes: {es:'Fixture',en:'Fixture'}, CIK: String(id).padStart(10, '0'), inclusion_date: '2026-09-06', inclusion_reason: { es: 'Fixture', en: 'Fixture' }, status: 'ACTIVE', source_url: source })) };
function holding(overrides: Partial<Holding> = {}): Holding {
  return { manager_id: 'm1', manager_name: 'Fixture 1', CIK: '0000000001', quarter_end: '2026-06-30', filing_date: '2026-08-14', accession_number: '0000000001-26-000001', form_type: '13F-HR', issuer: 'TEST ISSUER', ticker: null, CUSIP: '123456789', security_class: 'COM', shares: 100, share_type: 'SH', reported_value: 1000, value_unit: 'USD', put_call: null, investment_discretion: 'SOLE', other_manager: '', source_url: source, ...overrides };
}
function filing(overrides: Partial<Filing> = {}): Filing {
  return { manager_id: 'm1', CIK: '0000000001', quarter_end: '2026-06-30', filing_date: '2026-08-14', accession_number: '0000000001-26-000001', form_type: '13F-HR', source_url: source, amendment: 'NONE', confidential: false, complete: true, holdings: [holding()], ...overrides };
}
function pair(sharesBefore = 100, sharesAfter = 100) {
  return [selectQuarter('m1', '2026-03-31', [filing({ quarter_end: '2026-03-31', holdings: [holding({ quarter_end: '2026-03-31', shares: sharesBefore })] })]), selectQuarter('m1', '2026-06-30', [filing({ holdings: [holding({ shares: sharesAfter })] })])] as const;
}
function review(overrides: Partial<ComparisonReview> = {}): ComparisonReview {
  return { manager_id: 'm1', quarter_end: '2026-06-30', previous_key: securityKey(holding()), current_key: securityKey(holding()), share_factor: 1, source_url: source, checked_at: '2026-09-06', previous_accessions: ['0000000001-26-000001'], current_accessions: ['0000000001-26-000001'], previous_shares: 100, current_shares: 100, action: 'NONE', evidence_urls: [source, source, source], rationale: 'Test-only explicit documentary review covering the comparison.', checks: Object.fromEntries(corporateActionChecks.map(check => [check, 'CLEAR'])) as ComparisonReview['checks'], absence_verified: false, ...overrides };
}
test('same filing is idempotent; input order and duplicated accessions do not change results', () => {
  const original = filing();
  assert.deepEqual(selectQuarter('m1', original.quarter_end, [original, original]), selectQuarter('m1', original.quarter_end, [original]));
});
test('restatement replaces the original; an additive amendment does not duplicate it', () => {
  const accession = '0000000001-26-000002';
  const amendment = filing({ accession_number: accession, form_type: '13F-HR/A', amendment: 'RESTATEMENT', holdings: [holding({ accession_number: accession, form_type: '13F-HR/A', shares: 120 })] });
  assert.equal(selectQuarter('m1', '2026-06-30', [amendment, filing(), amendment]).positions[0].shares, 120);
  const extra = { ...amendment, amendment: 'NEW_HOLDINGS' as const, holdings: [holding({ accession_number: accession, form_type: '13F-HR/A', CUSIP: '987654321' })] };
  assert.equal(selectQuarter('m1', '2026-06-30', [filing(), extra, extra]).positions.length, 2);
  assert.equal(selectQuarter('m1', '2026-06-30', [extra]).status, 'unavailable');
  assert.equal(selectQuarter('m1', '2026-06-30', [filing(), { ...extra, holdings: amendment.holdings }]).status, 'unavailable');
});
test('conflicting same-accession payloads and unknown amendment types fail closed', () => {
  assert.equal(selectQuarter('m1', '2026-06-30', [filing(), filing({ complete: false })]).status, 'unavailable');
  assert.equal(selectQuarter('m1', '2026-06-30', [filing({ form_type: '13F-HR/A', amendment: 'UNKNOWN' })]).status, 'unavailable');
});
test('absent filing and 13F-NT notice are not exits, even with an exit review', () => {
  const [previous] = pair();
  for (const current of [selectQuarter('m1', '2026-06-30', []), selectQuarter('m1', '2026-06-30', [filing({ form_type: '13F-NT' })])]) {
    assert.equal(compareQuarters(previous, current, [review({ current_key: null, current_shares: null, absence_verified: true })])[0].state, 'INDETERMINATE');
  }
});
test('split and reverse split are not purchases or sales', () => {
  for (const factor of [4, 0.1]) {
    const [previous, current] = pair(100, 100 * factor);
    assert.equal(compareQuarters(previous, current)[0].state, 'INDETERMINATE');
    assert.equal(compareQuarters(previous, current, [review({ share_factor: factor, current_shares: 100 * factor, action: factor > 1 ? 'SPLIT' : 'REVERSE_SPLIT' })])[0].state, 'UNCHANGED');
  }
});
test('reviewed share changes classify correctly; market-value changes alone do not', () => {
  for (const [shares, expected] of [[90, 'REDUCED'], [100, 'UNCHANGED'], [110, 'INCREASED']] as const) {
    const [previous, current] = pair(100, shares);
    current.positions[0].reported_value = 5000;
    assert.equal(compareQuarters(previous, current, [review({current_shares: shares})])[0].state, expected);
  }
});
test('confidential treatment and missing reviews preserve INDETERMINATE', () => {
  const [previous, current] = pair(100, 200);
  assert.equal(compareQuarters(previous, current)[0].state, 'INDETERMINATE');
  assert.equal(compareQuarters(previous, { ...current, confidential: true }, [review()])[0].state, 'INDETERMINATE');
});
test('CUSIP/class transformation needs an explicit review and does not create a false exit', () => {
  const [previous, current] = pair();
  current.positions[0] = holding({ CUSIP: '987654321', security_class: 'CL A' });
  assert.ok(compareQuarters(previous, current).every((row) => row.state === 'INDETERMINATE'));
  const result = compareQuarters(previous, current, [review({ current_key: securityKey(current.positions[0]), action: 'CONVERSION' })]);
  assert.equal(result.length, 1); assert.equal(result[0].state, 'UNCHANGED');
});
test('puts, calls, share classes and debt principal stay separate', () => {
  const long = holding(); const put = holding({ put_call: 'PUT' }); const call = holding({ put_call: 'CALL' }); const classA = holding({ security_class: 'CL A', CUSIP: '987654321' }); const principal = holding({ share_type: 'PRN' });
  assert.equal(new Set([long, put, call, classA, principal].map(securityKey)).size, 5);
  assert.equal(selectQuarter('m1', '2026-06-30', [filing({ holdings: [long, put, call, classA, principal] })]).positions.length, 5);
});
test('denominator uses disclosed managers separately from expected coverage and multi-row discretion counts one holder', () => {
  const dataset = buildCapitalDataset({ universe, quarter_end: '2026-06-30', previous_quarter_end: '2026-03-31', as_of: '2026-09-06T12:00:00Z', filings: [filing({ holdings: [holding(), holding({ investment_discretion: 'DEFINED', shares: 20 })] })], lookup_succeeded: ['m1', 'm2', 'm3'] });
  assert.equal(dataset.companies[0].managers, 1); assert.equal(dataset.companies[0].eligible_disclosed_managers, 1); assert.ok(Math.abs(dataset.companies[0].percent_disclosed - 100) < 1e-10);
  assert.equal(dataset.current[0].positions[0].shares, 120); assert.equal(dataset.quality, 'partial');
});
test('all missing data uses null coverage, never invented zeros; duplicate CIK rejected', () => {
  const input = { universe, quarter_end: '2026-06-30', previous_quarter_end: '2026-03-31', as_of: '', filings: [], lookup_succeeded: [] };
  const dataset = buildCapitalDataset(input);
  assert.equal(dataset.quality, 'unavailable'); assert.equal(dataset.coverage.percent, null); assert.equal(dataset.coverage.disclosed_filers, null); assert.equal(dataset.coverage.eligible_disclosed_managers, null);
  assert.throws(() => buildCapitalDataset({ ...input, universe: { ...universe, managers: [...universe.managers, universe.managers[0]] } }));
});
test('invalid holdings and untrusted URLs never enter the dataset', () => {
  for (const entry of [holding({ shares: NaN }), holding({ shares: -1 }), holding({ source_url: 'https://sec.gov.attacker.example/filing' }), holding({ CUSIP: '' })]) assert.equal(validateHolding(entry), false);
});
test('real SEC snapshot: bilingual views share data, amendments are unique, no invented movements', () => {
  const dataset = JSON.parse(gunzipSync(readFileSync(new URL('./generated/snapshot.json.gz', import.meta.url))).toString()) as CapitalDataset;
  assert.ok(dataset.coverage.universe_size >= 10); assert.ok(dataset.coverage.disclosed_filers! >= 10);
  assert.equal(dataset.current.find((quarter) => quarter.manager_id === 'pershing-square-capital-management')?.status, 'not_separately_disclosed');
  assert.ok(dataset.movements.some((movement) => movement.state === 'INDETERMINATE'));
  assert.equal(dataset.movement_publication, 'REVIEW_PENDING');
  const rows = selectCapitalCompanies(dataset.companies, 'shared');
  assert.ok(rows.every((row) => row.managers <= row.eligible_disclosed_managers && !row.put_call));
  assert.equal(rows.filter((row) => row.ticker === 'GOOG' || row.ticker === 'GOOGL').length, 2);
  assert.equal(selectCapitalCompanies(dataset.companies, 'new').length, 0);
  assert.equal(refreshCapitalStatus(dataset, new Date('2026-09-22T00:00:00Z')).freshness, 'stale');
});
test('reviewed new and exited positions require an actually comparable absence', () => {
  const [previous, current] = pair();
  const absentBefore = { ...previous, positions: [] };
  const absentAfter = { ...current, positions: [] };
  assert.equal(compareQuarters(absentBefore, current, [review({ previous_key: null, previous_shares: null, absence_verified: true })])[0].state, 'NEW');
  assert.equal(compareQuarters(previous, absentAfter, [review({ current_key: null, current_shares: null, absence_verified: true })])[0].state, 'EXITED');
  assert.equal(compareQuarters(previous, current, [review({ previous_key: null, previous_shares: null, absence_verified: true })])[0].state, 'INDETERMINATE');
  assert.equal(compareQuarters(previous, current, [review({ current_key: null, current_shares: null, absence_verified: true })])[0].state, 'INDETERMINATE');
});
test('prior-quarter sources from a missing manager cannot substantiate a current holding count', () => {
  const historicalSource = 'https://www.sec.gov/Archives/edgar/data/0/previous.xml';
  const currentSource = 'https://www.sec.gov/Archives/edgar/data/9/current.xml';
  const dataset = buildCapitalDataset({ universe, quarter_end: '2026-06-30', previous_quarter_end: '2026-03-31', as_of: '2026-09-06T12:00:00Z', lookup_succeeded: ['m1','m2'], filings: [filing({ quarter_end: '2026-03-31', holdings: [holding({ quarter_end: '2026-03-31', source_url: historicalSource })] }), filing({ manager_id: 'm2', CIK: '0000000002', holdings: [holding({ manager_id: 'm2', CIK: '0000000002', source_url: currentSource })] })] });
  assert.equal(dataset.companies[0].managers, 1);
  assert.deepEqual(dataset.companies[0].source_urls, [currentSource]);
});
test('a verified restatement supersedes an invalid original, but a later invalid amendment blocks it', () => {
  const accession = '0000000001-26-000002';
  const correction = filing({ accession_number: accession, form_type: '13F-HR/A', amendment: 'RESTATEMENT', holdings: [holding({ accession_number: accession, form_type: '13F-HR/A', shares: 120 })] });
  assert.equal(selectQuarter('m1', '2026-06-30', [filing({ complete: false }), correction]).positions[0].shares, 120);
  assert.equal(selectQuarter('m1', '2026-06-30', [correction, filing({ accession_number: '0000000001-26-000003', form_type: '13F-HR/A', amendment: 'UNKNOWN', complete: false })]).status, 'unavailable');
});
test('nonconsecutive periods and invalid dates cannot be presented as quarterly movements', () => {
  assert.throws(() => buildCapitalDataset({ universe, quarter_end: '2026-06-30', previous_quarter_end: '2025-12-31', as_of: '', filings: [], lookup_succeeded: [] }));
  assert.equal(validateHolding(holding({ filing_date: '2026-02-30' })), false);
  const [previous, current] = pair(100, 200);
  assert.equal(compareQuarters(previous, current, [review({ checked_at: '2026-07-01' })])[0].state, 'INDETERMINATE');
});
test('CUSIP identity tolerates free-text class aliases, but Alphabet classes remain separate', () => {
  const classC = holding({CUSIP: '02079K107', security_class: 'CAP STK CL C'});
  assert.equal(securityKey(classC), securityKey({...classC, security_class: 'CL C'}));
  assert.notEqual(securityKey(classC), securityKey({...classC, CUSIP:'02079K305', security_class:'CL A'}));
});
test('economic-group duplication and explicit cross-reporting are rejected', () => {
  const input = {universe, quarter_end:'2026-06-30',previous_quarter_end:'2026-03-31',as_of:'2026-09-06T00:00:00Z',filings:[filing()],lookup_succeeded:['m1']};
  assert.throws(() => buildCapitalDataset({...input, universe:{...universe,managers:universe.managers.map(manager=>({...manager,economic_group_id:'same'}))}}), /reporting group/);
  assert.throws(() => buildCapitalDataset({...input,filings:[filing({included_managers:[{CIK:'0000000002',name:'Fixture 2',sequence_number:'1',file_number:null}]})]}), /Related reporting/);
});
test('issuer overlap is a set union; dollars and dual share classes cannot add a manager', () => {
  const a=holding({CUSIP:'02079K107'}), b=holding({CUSIP:'02079K305'});
  const dataset=buildCapitalDataset({universe,quarter_end:'2026-06-30',previous_quarter_end:'2026-03-31',as_of:'2026-09-06T00:00:00Z',lookup_succeeded:['m1'],filings:[filing({holdings:[a,b,{...a,put_call:'PUT',reported_value:1e12}]})],mappings:[a,b].map(h=>({CUSIP:h.CUSIP,security_class:h.security_class,issuer:'Alphabet',issuer_id:'alphabet',ticker:h.CUSIP==='02079K107'?'GOOG':'GOOGL',trend_ids:[],source_url:source,reviewed_at:'2026-09-06'}))});
  assert.equal(dataset.issuers[0].managers,1); assert.equal(dataset.issuers[0].security_ids.length,2);
  assert.equal(selectCapitalCompanies(dataset.companies,'shared').length,2);
});
test('stale accession, changed quantities and unresolved event checks invalidate a review', () => {
  const [previous,current]=pair();
  for(const bad of [review({current_accessions:['0000000001-26-000099']}),review({current_shares:999}),review({checks:{...review().checks,merger:'UNRESOLVED'}}),review({action:'NONE',share_factor:4})]) {
    assert.equal(compareQuarters(previous,current,[bad])[0].state,'INDETERMINATE');
  }
});
test('two-to-one conversion reviews cannot consume the same target twice', () => {
  const [previous,current]=pair();
  previous.positions.push(holding({quarter_end:'2026-03-31',CUSIP:'987654321'}));
  const reviews=[review(),review({previous_key:securityKey(previous.positions[1]),action:'CONVERSION'})];
  assert.ok(compareQuarters(previous,current,reviews).every(row=>row.state==='INDETERMINATE'));
});
test('a reporting-perimeter change blocks otherwise plausible increases', () => {
  const [previous,current]=pair(100,200);
  current.filings[0].included_managers=[{CIK:'0000000002',name:'Related reporting unit',sequence_number:'1',file_number:null}];
  const row=compareQuarters(previous,current,[review({current_shares:200})])[0];
  assert.equal(row.state,'INDETERMINATE');assert.equal(row.reason,'reporting_perimeter_changed');
});
test('an unverified absence cannot become NEW or EXITED', () => {
  const [previous,current]=pair();
  assert.equal(compareQuarters({...previous,positions:[]},current,[review({previous_key:null,previous_shares:null})])[0].state,'INDETERMINATE');
  assert.equal(compareQuarters(previous,{...current,positions:[]},[review({current_key:null,current_shares:null})])[0].state,'INDETERMINATE');
});
test('movement audit retains raw quantities and normalized split quantities', () => {
  const [previous,current]=pair(100,400);
  const row=compareQuarters(previous,current,[review({current_shares:400,share_factor:4,action:'SPLIT'})])[0];
  assert.deepEqual([row.previous_shares,row.current_shares,row.raw_delta,row.normalized_previous_shares,row.state,row.confidence],[100,400,300,400,'UNCHANGED','REVIEWED']);
});
test('partial comparison review never unlocks aggregate movement rankings', () => {
  const [previous,current]=pair(100,200);
  current.filings[0].holdings.push(holding({CUSIP:'987654321'}));
  const dataset=buildCapitalDataset({universe,quarter_end:'2026-06-30',previous_quarter_end:'2026-03-31',as_of:'2026-09-06T00:00:00Z',filings:[...previous.filings,...current.filings],lookup_succeeded:['m1'],reviews:[review({current_shares:200})]});
  assert.equal(dataset.movements.find(row=>row.holding.CUSIP==='123456789')?.state,'INCREASED');
  assert.equal(dataset.movement_publication,'REVIEW_PENDING');
});
test('first Eagle real amendments are handled according to their declared semantics', () => {
  const dataset=JSON.parse(gunzipSync(readFileSync(new URL('./generated/snapshot.json.gz',import.meta.url))).toString()) as CapitalDataset;
  const prior=dataset.previous.find(q=>q.manager_id==='first-eagle')!;
  const current=dataset.current.find(q=>q.manager_id==='first-eagle')!;
  assert.equal(prior.positions.find(p=>p.CUSIP==='594972AS0')?.shares,20000000);
  assert.equal(current.status,'unavailable');assert.ok(current.issues.includes('ambiguous_additive_amendment'));
  assert.ok(dataset.movements.filter(row=>row.manager_id==='first-eagle').every(row=>row.state==='INDETERMINATE'));
});
test('real notice relationships identify receiving reports without adding holders', () => {
  const dataset=JSON.parse(gunzipSync(readFileSync(new URL('./generated/snapshot.json.gz',import.meta.url))).toString()) as CapitalDataset;
  assert.equal(dataset.coverage.universe_size,44);assert.equal(dataset.coverage.expected_filers,44);assert.equal(dataset.coverage.disclosed_filers,43);assert.equal(dataset.coverage.notice_only,2);assert.equal(dataset.coverage.failed,1);
  for(const manager of ['pershing-square-capital-management','valueact']) {
    const notice=dataset.current.find(q=>q.manager_id===manager)!;
    assert.equal(notice.status,'not_separately_disclosed');assert.ok(notice.included_report_source);
    assert.ok(dataset.companies.every(row=>!row.manager_ids.includes(manager)));
  }
});
