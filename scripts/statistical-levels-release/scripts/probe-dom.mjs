// PROBE-only initial SSR binding. Deployment identity is validated separately by probe-core.
import { createRequire } from 'node:module';
const { parse } = createRequire(import.meta.url)('../vendor/node-html-parser/index.cjs');
export const PROBE_SSR_HEADINGS = Object.freeze({
  '/niveles-estadisticos': '¿Dónde está este activo frente a su propia historia?',
  '/en/statistical-levels': 'Where is this asset relative to its own history?',
});
const INERT = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'PRE', 'CODE', 'SVG', 'MATH', 'IFRAME', 'XMP', 'TITLE']);
const elements = root => {
  const found = [], pending = [...root.childNodes];
  while (pending.length) {
    const node = pending.shift();
    if (node.nodeType !== 1) continue;
    found.push(node);
    if (!INERT.has(node.tagName)) pending.push(...node.childNodes);
  }
  return found;
};
const tag = (node, name) => node?.tagName === name;
const cls = (node, name) => (node.getAttribute('class') ?? '').split(/\s+/).includes(name);
export function inspectProbeSSR(html, requestedPath, finalPath = requestedPath) {
  if (typeof html !== 'string' || !Object.hasOwn(PROBE_SSR_HEADINGS, requestedPath)) throw new Error('PROBE_HTTP_DOM_INPUT');
  const document = parse(html, { comment: false, blockTextElements: { script: true, noscript: true, style: true, pre: true, textarea: true } });
  const nodes = elements(document), pages = nodes.filter(node => tag(node, 'DIV') && cls(node, 'sl-page'));
  const page = pages.length === 1 ? pages[0] : null;
  const controls = nodes.filter(node => node.getAttribute('id') === 'sl-controls');
  const headings = page ? nodes.filter(node => tag(node, 'H1') && tag(node.parentNode, 'HEADER') && cls(node.parentNode, 'sl-heading') && node.parentNode.parentNode === page) : [];
  // Titles/headings/forms are parsed nodes; inert strings and Flight payloads cannot supply evidence.
  const platform = nodes.some(node =>
    ((tag(node, 'TITLE') || tag(node, 'H1')) && /^(?:Vercel (?:Login|Authentication|Security)|Log in to Vercel|Authentication Required|Deployment (?:Not Found|Unavailable)|Application error:|500: Internal Server Error|404: This page could not be found)/i.test(node.textContent.trim())) ||
    node.getAttribute('id') === '__next_error__' ||
    (tag(node, 'FORM') && /^(?:https:\/\/(?:www\.)?vercel\.com)?\/(?:login|sso-api)(?:[/?]|$)/.test(node.getAttribute('action') ?? '')));
  return {
    ssr_structure_inspected: true,
    sl_controls_dom_present: !!page && controls.length === 1 && tag(controls[0], 'DIV') && cls(controls[0], 'sl-controls') && controls[0].parentNode === page,
    second_ssr_marker_match: headings.length === 1 && headings[0].childNodes.length === 1 && headings[0].firstChild.nodeType === 3 && headings[0].textContent === PROBE_SSR_HEADINGS[requestedPath],
    sl_authority_dom_present: nodes.some(node => tag(node, 'DIV') && node.getAttribute('id') === 'sl-authority' && cls(node, 'sl-provenance')),
    platform_or_error_html: platform,
    route_binding_match: finalPath === requestedPath || finalPath === requestedPath + '/',
  };
}
export function probeSSRFailure(result) {
  if (!result.route_binding_match) return 'PROBE_HTTP_ROUTE_BINDING';
  if (result.platform_or_error_html) return 'PROBE_HTTP_PLATFORM_OR_ERROR_HTML';
  if (!result.sl_controls_dom_present) return 'PROBE_HTTP_SL_CONTROLS_MISSING';
  if (!result.second_ssr_marker_match) return 'PROBE_HTTP_SSR_MARKER_MISMATCH';
  return null;
}
