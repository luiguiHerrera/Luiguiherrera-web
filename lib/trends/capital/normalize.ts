import { corporateActionChecks } from "./types.ts";
import type { CapitalCompany, CapitalDataset, CapitalTab, ComparisonReview, Filing, Holding, ManagerQuarter, PositionMovement, SecurityMapping, Universe } from "./types.ts";

export function securityKey(holding: Pick<Holding, "CUSIP" | "security_class" | "put_call" | "share_type">) {
  // CUSIP identifies the issue/class. Filer-specific class descriptions are retained
  // as metadata, never used to split the same issue into multiple counters.
  return [holding.CUSIP.trim().toUpperCase(), holding.put_call ?? "LONG", holding.share_type].join("|");
}

export function validSecUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && ["www.sec.gov", "data.sec.gov"].includes(url.hostname); } catch { return false; }
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value);
}
function validQuarter(value: string): boolean { return validDate(value) && /-(03-31|06-30|09-30|12-31)$/.test(value); }

export function validateHolding(holding: Holding): boolean {
  return validQuarter(holding.quarter_end) && validDate(holding.filing_date) && holding.filing_date >= holding.quarter_end
    && ["13F-HR", "13F-HR/A"].includes(holding.form_type)
    && /^[A-Z0-9*@#]{9}$/.test(holding.CUSIP) && /^\d{10}$/.test(holding.CIK)
    && [holding.shares, holding.reported_value].every((value) => Number.isFinite(value) && value >= 0)
    && ["SH", "PRN"].includes(holding.share_type) && [null, "PUT", "CALL"].includes(holding.put_call)
    && holding.value_unit === "USD" && Boolean(holding.issuer && holding.security_class && holding.investment_discretion)
    && /^\d{10}-\d{2}-\d{6}$/.test(holding.accession_number) && validSecUrl(holding.source_url);
}

export function selectQuarter(managerId: string, quarterEnd: string, filings: Filing[], lookupSucceeded = true): ManagerQuarter {
  const result: ManagerQuarter = { manager_id: managerId, quarter_end: quarterEnd, status: lookupSucceeded ? "not_filed" : "unknown", filings: [], positions: [], confidential: true, issues: [] };
  const byAccession = new Map<string, Filing>();
  for (const filing of filings.filter((item) => item.manager_id === managerId && item.quarter_end === quarterEnd)) {
    const prior = byAccession.get(filing.accession_number);
    if (prior && JSON.stringify(prior) !== JSON.stringify(filing)) {
      result.status = "unavailable"; result.issues.push("conflicting_accession"); return result;
    }
    byAccession.set(filing.accession_number, filing);
  }
  result.filings = [...byAccession.values()].sort((a, b) => a.filing_date.localeCompare(b.filing_date) || a.accession_number.localeCompare(b.accession_number));
  if (!result.filings.length) return result;
  let positions: Holding[] | null = null;
  let confidential = false;
  const latestRestatement = result.filings.findLastIndex((filing) => filing.form_type === "13F-HR/A" && filing.amendment === "RESTATEMENT");
  // A complete corrected filing can supersede an invalid original. Keep both
  // in provenance; normalize only the latest restatement and later additions.
  for (const filing of result.filings.slice(Math.max(0, latestRestatement))) {
    if (filing.form_type.startsWith("13F-NT")) {
      result.status = "not_separately_disclosed"; result.issues.push("reporting_manager_notice"); return result;
    }
    if (!filing.complete || !validSecUrl(filing.source_url) || filing.holdings.some((holding) => !validateHolding(holding) || holding.manager_id !== managerId || holding.CIK !== filing.CIK || holding.quarter_end !== quarterEnd || holding.accession_number !== filing.accession_number)) {
      result.status = "unavailable"; result.issues.push("unvalidated_filing"); return result;
    }
    if (filing.amendment === "UNKNOWN" || (filing.form_type === "13F-HR/A" && filing.amendment === "NONE")) {
      result.status = "unavailable"; result.issues.push("unknown_amendment"); return result;
    }
    if (filing.amendment === "RESTATEMENT" || filing.form_type === "13F-HR") {
      if (positions && filing.form_type === "13F-HR") {
        result.status = "unavailable"; result.issues.push("multiple_original_filings"); return result;
      }
      positions = [...filing.holdings];
      confidential = filing.confidential !== false;
    } else {
      if (!positions || filing.holdings.some((holding) => positions!.some((prior) => securityKey(prior) === securityKey(holding)))) {
        result.status = "unavailable"; result.issues.push("ambiguous_additive_amendment"); return result;
      }
      positions.push(...filing.holdings);
      confidential ||= filing.confidential !== false;
    }
  }
  if (positions === null) { result.status = "unavailable"; return result; }
  // Multiple discretion/other-manager rows can belong to the same security.
  // Keep raw rows in filings; aggregate shares once per manager/security here.
  const grouped = new Map<string, Holding>();
  for (const holding of positions) {
    const key = securityKey(holding), previous = grouped.get(key);
    grouped.set(key, previous ? { ...previous, shares: previous.shares + holding.shares, reported_value: previous.reported_value + holding.reported_value } : { ...holding });
  }
  result.status = "available";
  result.confidential = confidential;
  result.positions = [...grouped.values()].sort((a, b) => securityKey(a).localeCompare(securityKey(b)));
  return result;
}

const sameSet = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const accessionList = (quarter: ManagerQuarter) => quarter.filings.map((filing) => filing.accession_number);

export function compareQuarters(previous: ManagerQuarter, current: ManagerQuarter, reviews: ComparisonReview[] = []): PositionMovement[] {
  const before = new Map(previous.positions.map((holding) => [securityKey(holding), holding]));
  const after = new Map(current.positions.map((holding) => [securityKey(holding), holding]));
  const relevant = reviews.filter((review) => review.manager_id === current.manager_id && review.quarter_end === current.quarter_end);
  const consumed = new Set<string>();
  const result: PositionMovement[] = [];
  const available = current.status === "available" && previous.status === "available" && previous.manager_id === current.manager_id;
  const relationshipChange = [...previous.filings, ...current.filings].some((filing) => filing.report_type === "13F COMBINATION REPORT")
    || !sameSet(previous.filings.at(-1)?.included_managers?.map((manager) => `${manager.CIK}|${manager.name}`) ?? [], current.filings.at(-1)?.included_managers?.map((manager) => `${manager.CIK}|${manager.name}`) ?? []);
  for (const key of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    if (consumed.has(key)) continue;
    const candidates = relevant.filter((review) => review.previous_key === key || review.current_key === key);
    const candidate = candidates.length === 1 ? candidates[0] : undefined;
    const candidateBefore = candidate?.previous_key ? before.get(candidate.previous_key) : undefined;
    const candidateAfter = candidate?.current_key ? after.get(candidate.current_key) : undefined;
    // A review pins exact filings AND quantities. Re-fetching an amendment cannot
    // silently inherit a prior analyst decision. Every issue pairing is one-to-one.
    const reviewValid = candidate && available && !relationshipChange && !current.confidential && !previous.confidential
      && validDate(candidate.checked_at) && [...previous.filings, ...current.filings].every((filing) => candidate.checked_at >= filing.filing_date)
      && candidate.share_factor > 0 && Number.isFinite(candidate.share_factor) && validSecUrl(candidate.source_url)
      && candidate.rationale?.length > 20 && candidate.evidence_urls?.length >= 3 && candidate.evidence_urls.every(validSecUrl)
      && corporateActionChecks.every((check) => ["CLEAR", "ADJUSTED"].includes(candidate.checks?.[check]))
      && sameSet(candidate.previous_accessions ?? [], accessionList(previous)) && sameSet(candidate.current_accessions ?? [], accessionList(current))
      && candidate.previous_shares === (candidateBefore?.shares ?? null) && candidate.current_shares === (candidateAfter?.shares ?? null)
      && (candidate.previous_key === null ? candidate.absence_verified && !before.has(candidate.current_key!) : Boolean(candidateBefore))
      && (candidate.current_key === null ? candidate.absence_verified && !after.has(candidate.previous_key!) : Boolean(candidateAfter))
      && !(candidate.previous_key === null && candidate.current_key === null)
      && relevant.every((other) => other === candidate || (!candidate.previous_key || other.previous_key !== candidate.previous_key) && (!candidate.current_key || other.current_key !== candidate.current_key))
      && (!candidateBefore || !candidateAfter || candidateBefore.put_call === candidateAfter.put_call && candidateBefore.share_type === candidateAfter.share_type)
      && (candidate.previous_key === candidate.current_key || !candidateBefore || !candidateAfter || candidate.action === "CONVERSION")
      && (candidate.action !== "NONE" || candidate.share_factor === 1);
    const review = reviewValid ? candidate : undefined;
    const prior = review ? candidateBefore : before.get(key), next = review ? candidateAfter : after.get(key);
    const holding = next ?? prior!;
    const previousShares = prior?.shares ?? (review?.absence_verified ? 0 : null);
    const currentShares = next?.shares ?? (review?.absence_verified ? 0 : null);
    const row: PositionMovement = {
      manager_id: current.manager_id, security_key: securityKey(holding), holding,
      state: "INDETERMINATE", reason: !available ? "filing_unavailable" : relationshipChange ? "reporting_perimeter_changed" : current.confidential || previous.confidential ? "confidential_or_unknown" : candidate ? "review_invalid_or_stale" : "comparison_not_reviewed", review_source: null,
      previous_shares: previousShares, current_shares: currentShares,
      raw_delta: previousShares !== null && currentShares !== null ? currentShares - previousShares : null,
      corporate_action_adjustment: null, normalized_previous_shares: null, confidence: "INSUFFICIENT",
      previous_sources: previous.filings.map((filing) => filing.source_url), current_sources: current.filings.map((filing) => filing.source_url),
    };
    if (review) {
      row.review_source = review.source_url; row.reason = review.rationale; row.confidence = "REVIEWED";
      row.corporate_action_adjustment = { action: review.action, share_factor: review.share_factor };
      row.normalized_previous_shares = previousShares! * review.share_factor;
      row.state = !prior ? "NEW" : !next ? "EXITED" : Math.abs(next.shares - row.normalized_previous_shares) <= 0.000001 ? "UNCHANGED" : next.shares > row.normalized_previous_shares ? "INCREASED" : "REDUCED";
      if (review.previous_key) consumed.add(review.previous_key);
      if (review.current_key) consumed.add(review.current_key);
    }
    consumed.add(key); result.push(row);
  }
  return result;
}

export function buildCapitalDataset(input: { universe: Universe; quarter_end: string; previous_quarter_end: string; as_of: string; filings: Filing[]; lookup_succeeded: string[]; reviews?: ComparisonReview[]; mappings?: SecurityMapping[] }): CapitalDataset {
  const end = new Date(`${input.quarter_end}T00:00:00Z`);
  const expectedPrevious = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 0));
  if (!validQuarter(input.quarter_end) || !validQuarter(input.previous_quarter_end) || !Number.isFinite(expectedPrevious.getTime()) || expectedPrevious.toISOString().slice(0, 10) !== input.previous_quarter_end) throw new Error("Quarters must be consecutive calendar quarters");
  if (input.filings.length && !Number.isFinite(Date.parse(input.as_of))) throw new Error("Filing data require a real retrieval time");
  if (input.filings.some((filing) => filing.filing_date > input.as_of.slice(0, 10))) throw new Error("Filing is later than the evidence retrieval date");
  const registry = input.universe.managers;
  if (new Set(registry.map((manager) => manager.manager_id)).size !== registry.length || new Set(registry.map((manager) => manager.CIK)).size !== registry.length) throw new Error("Duplicate manager identity in universe");
  const members = registry.filter((manager) => !["EXCLUDED", "RETIRED"].includes(manager.status));
  const managers = members.filter((manager) => manager.filing_expected && manager.status !== "NOTICE_ONLY");
  if (!managers.length || new Set(managers.map((manager) => manager.economic_group_id)).size !== managers.length) throw new Error("Duplicate economic reporting group or empty universe");
  const quarterFor = (manager: typeof registry[number], quarter: string) => selectQuarter(manager.manager_id, quarter, input.filings.filter((filing) => filing.CIK === manager.CIK), input.lookup_succeeded.includes(manager.manager_id));
  const current = members.map((manager) => quarterFor(manager, input.quarter_end));
  const previous = members.map((manager) => quarterFor(manager, input.previous_quarter_end));
  const byId = new Map(current.map((quarter) => [quarter.manager_id, quarter]));
  const normalizedName = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (const quarter of current) {
    const manager = members.find((member) => member.manager_id === quarter.manager_id)!;
    for (const filing of quarter.filings) {
      for (const ref of [...(filing.included_managers ?? []), ...(filing.reporting_managers ?? [])]) {
        const duplicate = managers.find((member) => member.manager_id !== manager.manager_id && (member.CIK === ref.CIK || normalizedName(member.legal_name) === normalizedName(ref.name)));
        if (duplicate && duplicate.economic_group_id !== manager.economic_group_id) throw new Error(`Related reporting entities require resolution: ${manager.manager_id}/${duplicate.manager_id}`);
      }
    }
  }
  for (const relation of input.universe.relationships ?? []) {
    if (relation.quarter_end !== input.quarter_end) continue;
    const notice = byId.get(relation.notice_manager_id), reporter = byId.get(relation.reporting_manager_id);
    const noticeIdentity = registry.find((manager) => manager.manager_id === relation.notice_manager_id), reporterIdentity = registry.find((manager) => manager.manager_id === relation.reporting_manager_id);
    if (!notice || !reporter || !noticeIdentity || !reporterIdentity || noticeIdentity.economic_group_id !== reporterIdentity.economic_group_id || !validSecUrl(relation.source_url)) throw new Error("Invalid reporting relationship");
    const citedNotice = notice.filings.find((filing) => filing.source_url === relation.source_url && filing.complete && filing.form_type.startsWith("13F-NT") && filing.reporting_managers?.some((ref) => ref.CIK === reporterIdentity.CIK));
    const receiving = reporter.filings.find((filing) => filing.complete && filing.included_managers?.some((ref) => ref.CIK === noticeIdentity.CIK));
    if (citedNotice && receiving && reporter.status === "available") notice.included_report_source = receiving.source_url;
    else notice.issues.push("included_report_not_verified");
  }
  const eligible = managers.filter((manager) => byId.get(manager.manager_id)?.status === "available");
  const eligibleIds = new Set(eligible.map((manager) => manager.manager_id));
  const movements = managers.flatMap((manager) => compareQuarters(previous.find((quarter) => quarter.manager_id === manager.manager_id)!, byId.get(manager.manager_id)!, input.reviews));
  const rows = new Map<string, CapitalCompany>();
  for (const movement of movements) {
    const holding = movement.holding, id = movement.security_key;
    const matches = (input.mappings ?? []).filter((mapping) => mapping.CUSIP === holding.CUSIP && validSecUrl(mapping.source_url));
    if (matches.length > 1) throw new Error(`Ambiguous security mapping: ${holding.CUSIP}`);
    const mapping = matches[0];
    const row = rows.get(id) ?? { id, issuer: mapping?.issuer ?? holding.issuer, issuer_id: mapping?.issuer_id ?? null, ticker: mapping?.ticker ?? null, security_class: mapping?.security_class ?? holding.security_class, put_call: holding.put_call, managers: 0, eligible_disclosed_managers: eligible.length, percent_disclosed: 0, increased: 0, reduced: 0, new: 0, exited: 0, indeterminate: 0, compared: 0, manager_ids: [], trend_ids: mapping?.trend_ids ?? [], source_urls: [] };
    const position = eligibleIds.has(movement.manager_id) ? byId.get(movement.manager_id)?.positions.find((item) => securityKey(item) === id) : undefined;
    if (position) {
      if (row.managers === 0) row.source_urls = [];
      if (!row.manager_ids.includes(movement.manager_id)) row.manager_ids.push(movement.manager_id);
      row.managers = row.manager_ids.length;
    }
    if (movement.state === "INCREASED") row.increased++;
    if (movement.state === "REDUCED") row.reduced++;
    if (movement.state === "NEW") row.new++;
    if (movement.state === "EXITED") row.exited++;
    if (movement.state === "INDETERMINATE") row.indeterminate++;
    else row.compared++;
    row.percent_disclosed = eligible.length ? row.managers / eligible.length * 100 : 0;
    if (position || row.managers === 0) row.source_urls = [...new Set([...row.source_urls, (position ?? holding).source_url])].sort();
    row.manager_ids.sort(); rows.set(id, row);
  }
  // Issuer-level counts are separate, explicitly mapped, set unions. They never
  // add GOOG and GOOGL manager counts. The published table remains security-level.
  const issuers = new Map<string, CapitalDataset["issuers"][number]>();
  for (const row of rows.values()) {
    if (!row.issuer_id || row.put_call || !row.id.endsWith("|SH") || !row.managers) continue;
    const issuer = issuers.get(row.issuer_id) ?? { issuer_id: row.issuer_id, issuer: row.issuer, manager_ids: [], managers: 0, security_ids: [], eligible_disclosed_managers: eligible.length, percent_disclosed: 0 };
    issuer.manager_ids = [...new Set([...issuer.manager_ids, ...row.manager_ids])].sort(); issuer.managers = issuer.manager_ids.length;
    issuer.security_ids.push(row.id); issuer.security_ids.sort(); issuer.percent_disclosed = issuer.managers / eligible.length * 100; issuers.set(row.issuer_id, issuer);
  }
  const expected = managers.length, disclosed = eligible.length, known = managers.some((manager) => input.lookup_succeeded.includes(manager.manager_id));
  const pending = managers.filter((manager) => byId.get(manager.manager_id)?.status === "not_filed").length;
  const failed = managers.filter((manager) => ["unavailable", "unknown"].includes(byId.get(manager.manager_id)!.status)).length;
  const notices = members.filter((manager) => (manager.status === "NOTICE_ONLY" || byId.get(manager.manager_id)?.status === "not_separately_disclosed")).length;
  const relevantMovements = movements.filter((movement) => !movement.holding.put_call && movement.holding.share_type === "SH");
  return {
    schema_version: 2, universe: input.universe, quarter_end: input.quarter_end, previous_quarter_end: input.previous_quarter_end, as_of: input.as_of,
    source: { name: "SEC EDGAR", url: "https://www.sec.gov/edgar/search/" },
    freshness: disclosed ? "current" : "unavailable", quality: !disclosed ? "unavailable" : disclosed === expected ? "validated" : "partial",
    coverage: { universe_size: new Set(members.map((manager) => manager.economic_group_id)).size, expected_filers: expected, disclosed_filers: known ? disclosed : null, notice_only: notices, pending: known ? pending : null, failed: known ? failed : null, eligible_disclosed_managers: known ? disclosed : null, percent: known ? disclosed / expected * 100 : null, comparable: known ? new Set(movements.filter((movement) => movement.state !== "INDETERMINATE").map((movement) => movement.manager_id)).size : null },
    // Partial review must not masquerade as a ranking of all movements. Keep
    // reviewed rows in the audit trail; unlock aggregate views only at full review.
    movement_publication: relevantMovements.length > 0 && disclosed === expected && relevantMovements.every((movement) => movement.state !== "INDETERMINATE") ? "READY" : "REVIEW_PENDING",
    current, previous, movements, companies: [...rows.values()].sort((a, b) => a.id.localeCompare(b.id)), issuers: [...issuers.values()].sort((a, b) => a.issuer_id.localeCompare(b.issuer_id)),
  };
}

export function selectCapitalCompanies(companies: CapitalCompany[], tab: CapitalTab): CapitalCompany[] {
  // Counts describe overlap in a disclosed universe, never attractiveness.
  const metric = (company: CapitalCompany) => tab === "shared" ? company.managers : tab === "new" ? company.new : tab === "increased" ? company.increased : tab === "reduced" ? company.reduced : tab === "exited" ? company.exited : Math.min(company.increased + company.new, company.reduced + company.exited);
  return companies.filter((company) => !company.put_call && company.id.endsWith("|SH") && metric(company) > 0).sort((a, b) => metric(b) - metric(a) || a.issuer.localeCompare(b.issuer) || a.id.localeCompare(b.id));
}

export function refreshCapitalStatus(dataset: CapitalDataset, now: Date): CapitalDataset {
  // Refresh is a property of both the filing period and the last actual fetch.
  const quarter = new Date(`${dataset.quarter_end}T00:00:00Z`);
  const nextQuarter = new Date(Date.UTC(quarter.getUTCFullYear(), quarter.getUTCMonth() + 4, 0));
  const nextDue = new Date(nextQuarter.getTime() + 45 * 86400000);
  const stale = now > nextDue || now.getTime() - new Date(dataset.as_of).getTime() > 14 * 86400000;
  return { ...dataset, freshness: dataset.quality === "unavailable" ? "unavailable" : stale ? "stale" : "current" };
}
