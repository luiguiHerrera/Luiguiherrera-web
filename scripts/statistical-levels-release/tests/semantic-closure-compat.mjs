// Compare the old security/QA contract after removing only explicitly authorized additions.
export function withoutReceiptHooks(source) {
  return source.replace(/c\.transitionStart\?\.\('T[1-4]'\),/g,'').replace(/if\(c\.transitionComplete\)await c\.transitionComplete\('T[1-4]'\);/g,'');
}
export function withoutReceiptClass(source) {
  return String(source).replace("event.classification === (kind === 'raw_rsc_events' ? 'rsc_transition_completed_non_application' : 'platform_non_application')", "event.classification === (kind === 'raw_rsc_events' ? 'rsc_non_application' : 'platform_non_application')");
}
