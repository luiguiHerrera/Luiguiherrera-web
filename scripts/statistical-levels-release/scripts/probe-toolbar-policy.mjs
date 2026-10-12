// Non-secret automation control: https://vercel.com/docs/vercel-toolbar/managing-toolbar#disable-toolbar-for-automation
import { verifiedOrigin } from './release-core.mjs';
export function probeBrowserHeaders(headers, { url, resourceType, origin, production = false }) {
  const result = Object.fromEntries(Object.entries(headers).filter(([name]) => name.toLowerCase() !== 'x-vercel-skip-toolbar'));
  if (!production && resourceType === 'Document' && verifiedOrigin(origin) === origin && new URL(url).origin === origin)
    result['x-vercel-skip-toolbar'] = '1';
  return result;
}
