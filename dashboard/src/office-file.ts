// Which file the dashboard and the validator read: the local office.md (written by office-manager, git-ignored)
// or, until the first update, the fictional office.example.md. Pure function, used by vite.config.ts (tested).

/** The local data file in the repository root (git-ignored). */
export const OFFICE_FILE = 'office.md';
/** The fictional sample shipped with the template. */
export const EXAMPLE_FILE = 'office.example.md';

/** Visible note on the page while office.md does not exist yet and the sample is shown. */
export const EXAMPLE_NOTE = 'showing example data (office.example.md): ask the director to "update the office"';

export interface OfficeSource {
  /** Absolute path of the file to read. */
  path: string;
  /** true = office.md does not exist yet and the sample is shown. */
  example: boolean;
}

/** `root` = the repository root (without a trailing slash); `exists` checks a path. */
export function officeSource(root: string, exists: (path: string) => boolean): OfficeSource {
  const office = `${root}/${OFFICE_FILE}`;
  if (exists(office)) return { path: office, example: false };
  return { path: `${root}/${EXAMPLE_FILE}`, example: true };
}
