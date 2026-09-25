import { validateRequestEvidence } from './probe-request-instances.mjs';
import { validateTransitionReceipts, transitionClass } from './probe-transition-receipts.mjs';
import { canonical, sha } from './release-core.mjs';

// No headers, cookies, bodies, tokens, full request objects or stacks are stored.
export function safeEvent(event) {
  const url = event.url ? new URL(event.url) : null;
  const requestEvidence = Object.hasOwn(event,'request_evidence') ? validateRequestEvidence(Object.getOwnPropertyDescriptor(event,'request_evidence')?.value) : undefined;
  return { ...(requestEvidence ? {request_evidence:requestEvidence} : {}), kind: event.kind, origin: url?.origin ?? '', path: url?.origin === 'https://vercel.live' && url.pathname.startsWith('/_next-live/feedback/') ? '/_next-live/feedback/' : url ? sha(url.pathname) : '',
    type: event.type ?? '', status: event.status ?? 0, canceled: event.canceled === true,
    rsc: event.rsc === true, prefetch: event.prefetch === true,
    error_code: /^net::ERR_[A-Z_]+$/.test(event.error_code ?? '') ? event.error_code : '', source: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.source) ? event.source : '' };
}
export function classifyEvent(event) {
  const safe = safeEvent(event);
  // Proven platform source, never a generic substring or all third-party failures.
  if (safe.origin === 'https://vercel.live' && safe.path.startsWith('/_next-live/feedback/') &&
      ['request_failure', 'console_error', 'exception'].includes(safe.kind))
    return { event: safe, classification: 'platform_non_application' };
  if (safe.kind === 'request_failure') return { event: safe, classification: 'required_application_request_failure' };
  if (safe.kind === 'console_error') return { event: safe, classification: 'application_console_error' };
  if (safe.kind === 'exception') return { event: safe, classification: 'hydration_or_application_exception' };
  return { event: safe, classification: 'unclassified' };
}
export function account(events, finalProductPassed, origin, transitionEvidence) {
  void finalProductPassed; // Legacy signature only: global product success is not classification authority.
  const transition_receipts = transitionEvidence === undefined ? null : validateTransitionReceipts(transitionEvidence,events.map(safeEvent),origin);
  const completed = new Set(transition_receipts?.records.filter(p=>safeEvent(events[p.event_index]).origin===origin).map(p=>p.event_index)??[]);
  const ledger = events.map((e,index) => completed.has(index) ? {event:safeEvent(e),classification:transitionClass} : classifyEvent(e));
  function group(type) {
    const counts = new Map();
    for (const item of ledger.filter(e => e.classification === type)) {
      const hash = sha(canonical(item.event)); counts.set(hash, (counts.get(hash) ?? 0) + 1);
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([sha256, count]) => ({ sha256, count, classification: type }));
  }
  return { raw_platform_events: group('platform_non_application'), raw_rsc_events: group(transitionClass),
    application_console_errors: ledger.filter(e => e.classification === 'application_console_error').length,
    required_application_request_failures: ledger.filter(e => e.classification === 'required_application_request_failure').length,
    hydration_errors: ledger.filter(e => e.classification === 'hydration_or_application_exception').length,
    unclassified_failures: ledger.filter(e => e.classification === 'unclassified').map(e => sha(canonical(e.event))), ledger, ...(transition_receipts ? {transition_receipts} : {}) };
}
