import { existsSync, readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { EXAMPLE_FILE, OFFICE_FILE, officeSource } from './src/office-file.ts';

const ID = 'virtual:office-md';
const RESOLVED = `\0${ID}`;

/**
 * ../office.md (repository root) as the module `virtual:office-md` with HMR: saving the file rebuilds
 * the scene without a restart or a page reload. office.md is git-ignored and exists only after the first
 * "update the office"; until then the module serves the fictional ../office.example.md with `example = true`
 * (the page shows a "showing example data" note). Creating or deleting office.md switches the source live.
 * The Vite process reads the file, so the dev server does not have to expose anything outside dashboard/
 * through /@fs/ (a `?raw` import from outside the root did not reload on change in Vite 8).
 */
function officeMd(): Plugin {
  let root = '';
  return {
    name: 'office-md',
    configResolved(c) {
      root = c.root.replace(/\/+$/, '').replace(/\/[^/]+$/, '');
    },
    configureServer(server) {
      const office = `${root}/${OFFICE_FILE}`;
      server.watcher.add([office, `${root}/${EXAMPLE_FILE}`]);
      const switchSource = (file: string) => {
        if (file !== office) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) void server.reloadModule(mod);
      };
      server.watcher.on('add', switchSource);
      server.watcher.on('unlink', switchSource);
    },
    resolveId(id) {
      return id === ID ? RESOLVED : undefined;
    },
    load(id) {
      if (id !== RESOLVED) return undefined;
      const source = officeSource(root, existsSync);
      this.addWatchFile(source.path);
      return [
        `export default ${JSON.stringify(readFileSync(source.path, 'utf8'))};`,
        `export const example = ${source.example};`,
      ].join('\n');
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
