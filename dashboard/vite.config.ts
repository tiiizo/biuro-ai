import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const ID = 'virtual:office-md';
const RESOLVED = `\0${ID}`;

/**
 * ../office.md (repository root) as the module `virtual:office-md` with HMR: saving the file rebuilds
 * the scene without a restart or a page reload. The Vite process reads the file, so the dev server does
 * not have to expose anything outside dashboard/ through /@fs/ (a `?raw` import from outside the root
 * did not reload on change in Vite 8).
 */
function officeMd(): Plugin {
  let file = '';
  return {
    name: 'office-md',
    configResolved(c) {
      file = `${c.root.replace(/\/+$/, '').replace(/\/[^/]+$/, '')}/office.md`;
    },
    resolveId(id) {
      return id === ID ? RESOLVED : undefined;
    },
    load(id) {
      if (id !== RESOLVED) return undefined;
      this.addWatchFile(file);
      return `export default ${JSON.stringify(readFileSync(file, 'utf8'))};`;
    },
  };
}

export default defineConfig({
  plugins: [officeMd()],
  server: {
    // The dev server exposes only dashboard/; office.md comes from the officeMd plugin (no /@fs/ access
    // to the repository root, so agent memory, reports and knowledge stay unreachable through the server).
    fs: { allow: ['.'] },
  },
  build: {
    // three (~600 kB) in one chunk is fine: the dashboard runs locally and is not published.
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
