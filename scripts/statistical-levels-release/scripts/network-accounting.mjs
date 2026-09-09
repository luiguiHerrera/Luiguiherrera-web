import { canonical, sha } from './release-core.mjs';

// No headers, cookies, bodies, tokens, full request objects or stacks are stored.
export function safeEvent(event) {
  const url = event.url ? new URL(event.url) : null;
  return { kind: event.kind, origin: url?.origin ?? '', path: url?.origin === 'https://vercel.live' && url.pathname.startsWith('/_next-live/feedback/') ? '/_next-live/feedback/' : url ? sha(url.pathname) : '',
    type: event.type ?? '', status: event.status ?? 0, canceled: event.canceled === true,
    rsc: event.rsc === true, prefetch: event.prefetch === true,
    error_code: /^net::ERR_[A-Z_]+$/.test(event.error_code ?? '') ? event.error_code : '', source: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.source) ? event.source : '' };
}
export function classifyEvent(event, { finalProductPassed = false, origin } = {}) {
  const safe = safeEvent(event);
  // Only positively identified canceled prefetches, after actual product QA passes.
  if (safe.kind === 'request_failure' && safe.origin === origin && safe.canceled &&
      safe.rsc && safe.prefetch && finalProductPassed && safe.error_code === 'net::ERR_ABORTED')
    return { event: safe, classification: 'rsc_non_application' };
  // Proven platform source, never a generic substring or all third-party failures.
  if (safe.origin === 'https://vercel.live' && safe.path.startsWith('/_next-live/feedback/') &&
      ['request_failure', 'console_error', 'exception'].includes(safe.kind))
    return { event: safe, classification: 'platform_non_application' };
  if (safe.kind === 'request_failure') return { event: safe, classification: 'required_application_request_failure' };
  if (safe.kind === 'console_error') return { event: safe, classification: 'application_console_error' };
  if (safe.kind === 'exception') return { event: safe, classification: 'hydration_or_application_exception' };
  return { event: safe, classification: 'unclassified' };
}
export function account(events, finalProductPassed, origin) {
  const ledger = events.map(e => classifyEvent(e, { finalProductPassed, origin }));
  function group(type) {
    const counts = new Map();
    for (const item of ledger.filter(e => e.classification === type)) {
      const hash = sha(canonical(item.event)); counts.set(hash, (counts.get(hash) ?? 0) + 1);
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([sha256, count]) => ({ sha256, count, classification: type }));
  }
  return { raw_platform_events: group('platform_non_application'), raw_rsc_events: group('rsc_non_application'),
    application_console_errors: ledger.filter(e => e.classification === 'application_console_error').length,
    required_application_request_failures: ledger.filter(e => e.classification === 'required_application_request_failure').length,
    hydration_errors: ledger.filter(e => e.classification === 'hydration_or_application_exception').length,
    unclassified_failures: ledger.filter(e => e.classification === 'unclassified').map(e => sha(canonical(e.event))), ledger };
}
