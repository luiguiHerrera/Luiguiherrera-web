// Both URL generations are explicit; route selection never supplies authority.
export const LEGACY_QA_ROUTES = Object.freeze(['/niveles-estadisticos', '/en/statistical-levels']);
export const AC_QA_ROUTES = Object.freeze(['/analisiscuantitativo', '/en/quantitative-analysis']);
export function isRegisteredQARouteCoverage(routes) {
  return Array.isArray(routes) && [LEGACY_QA_ROUTES, AC_QA_ROUTES].some(pair =>
    routes.length === pair.length && routes.every((route, index) => route === pair[index]));
}
const bundleIdentity = bundle => Array.isArray(bundle) ? JSON.stringify(bundle.map(({file,SHA256}) => [file,SHA256]).sort((a,b) => a[0].localeCompare(b[0]))) : null;
export function qaRoutesForTarget(target, currentBundle, baselineBundle, baselineId) {
  const preserved = target?.authority_run_id === baselineId ||
    ['ADOPT_EXISTING_PRODUCTION_BASELINE', 'EXTRAORDINARY_EDITORIAL_AUTHORITY_TRANSITION'].includes(target?.operation);
  const legacy = target?.operation === 'PROBE_IDENTITY' ||
    preserved && (!baselineBundle || bundleIdentity(currentBundle) !== bundleIdentity(baselineBundle));
  return [...(legacy ? LEGACY_QA_ROUTES : AC_QA_ROUTES)];
}
export function qaScriptRoutes() {
  const context = globalThis.__SL_QA_SCRIPT_ROUTES__;
  if (context === undefined) return {es:LEGACY_QA_ROUTES[0],en:LEGACY_QA_ROUTES[1]};
  if (!context || Object.keys(context).sort().join(',') !== 'en,es' ||
      !isRegisteredQARouteCoverage([context.es,context.en])) throw Error('QA_ROUTE_CONTEXT');
  return {es:context.es,en:context.en};
}
