import { buildingLayout } from './layout';
import { formatMessage, parseOffice } from './parse';
import { isGithubLink } from './tasks';

export type ValidationResult = {
  ok: boolean;
  /** Blocking errors (the file is rejected). */
  errors: string[];
  /** Parser warnings (normalization); they do not block. */
  warnings: string[];
};

/**
 * Validation of the whole office.md the way the dashboard sees it: the parser without errors and a building
 * that can be laid out. Used by `npm run validate` (scripts/validate.mjs), and through it by the optional
 * daily office-manager run (scripts/update-office.sh), which restores the backup on errors.
 */
export function validateOffice(text: string): ValidationResult {
  const r = parseOffice(text);
  const warnings = r.warnings.map(formatMessage);
  if (!r.ok) return { ok: false, errors: r.errors.map(formatMessage), warnings };
  try {
    buildingLayout(r.office.floors);
  } catch (e) {
    return { ok: false, errors: [`building layout: ${e instanceof Error ? e.message : String(e)}`], warnings };
  }
  return { ok: true, errors: [], warnings };
}

/** At most this many bytes (UTF-8) may office.md have after an unattended run. */
export const SIZE_LIMIT = 64 * 1024;
/** A file larger than this many times the previous one is suspicious (injected content, an agent loop)… */
export const MAX_GROWTH = 3;
/** …but only above this size, so a small starter file can grow into a full office. */
export const GROWTH_THRESHOLD = 16 * 1024;
/** `<!-- -->` comments: the agent writes the header (data source, date rules) and notes about data errors in them. */
export const MAX_COMMENTS = 8;
export const COMMENT_LIMIT = 2500;

const RE_COMMENT = /<!--([\s\S]*?)-->/g;
/** An address with any `xxx://…` scheme (up to the first whitespace or a character that ends a URL in Markdown). */
const RE_ADDRESS = /[a-z][a-z0-9+.-]*:\/\/[^\s|<>()"'`]*/giu;
/**
 * Schemes without `//` that give a clickable link or a script in Markdown. `data:` only with a MIME type
 * ("data: 2026-11-13" is plain text), `file:` only with a path.
 */
const RE_SCHEME_WITHOUT_SLASHES = /\b(?:javascript:|vbscript:|mailto:|tel:|data:[a-z]+\/|file:\/)/iu;
/** An address without a scheme (`www.example.com`) that Markdown viewers turn into a link. */
const RE_WWW = /(?:^|[^\w.-])www\.[a-z0-9-]+\.[a-z]/iu;
/** Raw HTML outside comments: a tag (`<b>`, `</a>`, `<img …`), a declaration (`<!x`) or an instruction (`<?`). */
const RE_HTML = /<(?:[a-z]|\/[a-z]|![^-]|!$|\?)/imu;

function lineNumber(text: string, pos: number): number {
  return text.slice(0, pos).split('\n').length;
}

function updatedLine(text: string): string | undefined {
  return /^>\s*updated:.*$/mu.exec(text)?.[0].trim();
}

/**
 * Strict validation after an unattended run (scripts/update-office.sh → validate.mjs --strict).
 * Besides validateOffice it rejects what the agent should not write but content injected through an
 * issue or PR could put there: raw HTML, long or numerous comments (room for hidden text and
 * "instructions" for the next days), links outside https://github.com/, a suspiciously large file. With the
 * previous version of the file it also checks that the agent really wrote a new state (a changed "updated"
 * line). It protects the format and obvious abuse, not the truth of the data: the owner still reviews the
 * file (`git diff office.md`) before committing it.
 */
export function validateRun(text: string, previous?: string): ValidationResult {
  const base = validateOffice(text);
  const errors = [...base.errors];

  const size = new TextEncoder().encode(text).length;
  if (size > SIZE_LIMIT) {
    errors.push(`the file has ${size} B, the limit is ${SIZE_LIMIT} B`);
  }
  if (previous !== undefined && previous.length > 0) {
    const before = new TextEncoder().encode(previous).length;
    if (size > GROWTH_THRESHOLD && size > MAX_GROWTH * before) {
      errors.push(`the file grew from ${before} B to ${size} B (more than ${MAX_GROWTH}×)`);
    }
    const now = updatedLine(text);
    if (now !== undefined && now === updatedLine(previous)) {
      errors.push(`line "${now}" unchanged: the agent did not write a new state (write rejected or interrupted?)`);
    }
  }

  let count = 0;
  let length = 0;
  for (const m of text.matchAll(RE_COMMENT)) {
    count++;
    length += (m[1] ?? '').length;
  }
  if (count > MAX_COMMENTS) errors.push(`${count} <!-- --> comments, at most ${MAX_COMMENTS} allowed`);
  if (length > COMMENT_LIMIT) errors.push(`<!-- --> comments have ${length} characters in total, the limit is ${COMMENT_LIMIT}`);

  // HTML is checked outside comments (it is not rendered inside them anyway); spaces keep the line numbers.
  const withoutComments = text.replace(RE_COMMENT, (k) => k.replace(/[^\n]/g, ' '));
  const html = RE_HTML.exec(withoutComments);
  if (html) errors.push(`line ${lineNumber(withoutComments, html.index)}: raw HTML ("${html[0]}…") is not allowed`);
  const commentEnd = withoutComments.indexOf('-->');
  if (commentEnd !== -1) errors.push(`line ${lineNumber(withoutComments, commentEnd)}: "-->" without an opening "<!--"`);

  // Links: in the whole file, also in comments and contexts, only https://github.com/.
  for (const m of text.matchAll(RE_ADDRESS)) {
    const address = m[0].replace(/[.,;:!?]+$/u, '');
    if (!isGithubLink(address)) {
      errors.push(`line ${lineNumber(text, m.index ?? 0)}: link outside https://github.com/ (${address.slice(0, 80)})`);
    }
  }
  const scheme = RE_SCHEME_WITHOUT_SLASHES.exec(text);
  if (scheme) errors.push(`line ${lineNumber(text, scheme.index)}: address scheme "${scheme[0]}" is not allowed`);
  const www = RE_WWW.exec(text);
  if (www) errors.push(`line ${lineNumber(text, www.index)}: address without https:// ("${www[0].trim()}…")`);

  return { ok: errors.length === 0, errors, warnings: base.warnings };
}
