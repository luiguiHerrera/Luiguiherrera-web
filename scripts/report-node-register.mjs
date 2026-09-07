// CLI/test resolution only. The application keeps its existing Next.js resolver.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = path.join(root, specifier.slice(2));
    for (const extension of ['', '.ts', '.tsx']) {
      if (existsSync(target + extension)) return nextResolve(pathToFileURL(target + extension).href, context);
    }
  }
  return nextResolve(specifier, context);
}});
