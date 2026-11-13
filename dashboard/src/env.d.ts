/**
 * Contents of ../office.md, provided by the `officeMd` plugin in vite.config.ts (with HMR). Before the first
 * update office.md does not exist: then the contents of ../office.example.md and `example = true`.
 */
declare module 'virtual:office-md' {
  const contents: string;
  export default contents;
  export const example: boolean;
}

/**
 * Minimal declaration for vite.config.ts (the Vite process reads office.md) without adding the
 * @types/node dependency. If @types/node is ever added, this declaration can go.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function existsSync(path: string): boolean;
}
