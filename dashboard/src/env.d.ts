/** Contents of ../office.md, provided by the `officeMd` plugin in vite.config.ts (with HMR). */
declare module 'virtual:office-md' {
  const contents: string;
  export default contents;
}

/**
 * Minimal declaration for vite.config.ts (the Vite process reads office.md) without adding the
 * @types/node dependency. If @types/node is ever added, this declaration can go.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
