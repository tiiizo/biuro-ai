#!/usr/bin/env node
// Validates office.md with the dashboard parser, without a browser and without new dependencies
// (src/*.ts is loaded by Vite's runnerImport; Vite is in devDependencies anyway).
//
// Usage: node scripts/validate.mjs [--strict] [--previous FILE] [path]
//        (default: ../office.md relative to dashboard/, or ../office.example.md while office.md does not
//        exist yet); npm run validate [-- path]
//   --strict         validation after an unattended run (validateRun in src/validation.ts): also no raw
//                    HTML, comment and size limits, links only https://github.com/
//   --previous FILE  the previous version (the backup from before the run): size growth and a changed
//                    "> updated:" line; only with --strict
// Exit codes: 0 = valid file, 1 = invalid file, 2 = the validation could not run
// (missing file, missing node_modules, parser load error). update-office.sh tells 1 from 2: only 1 means a
// bad file.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboard = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let strict = false;
let previousPath;
const positional = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--strict') strict = true;
  else if (a === '--previous' && i + 1 < args.length) previousPath = args[++i];
  else if (a.startsWith('--')) {
    console.error(`validate: unknown or incomplete argument ${a}`);
    process.exit(2);
  } else positional.push(a);
}
if (positional.length > 1 || (previousPath !== undefined && !strict)) {
  console.error('validate: usage: validate.mjs [--strict] [--previous FILE] [path]');
  process.exit(2);
}
let file;
if (positional[0] !== undefined) file = resolve(positional[0]);
else {
  // The same choice as the dashboard (src/office-file.ts): office.md is git-ignored and appears after the
  // first "update the office"; until then the fictional sample is validated.
  file = resolve(dashboard, '..', 'office.md');
  if (!existsSync(file)) {
    file = resolve(dashboard, '..', 'office.example.md');
    console.log(`validate: office.md does not exist yet, validating the sample ${file}`);
  }
}

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`validate: cannot read ${path}: ${e instanceof Error ? e.message : e}`);
    process.exit(2);
  }
}
const text = read(file);
const previous = previousPath === undefined ? undefined : read(resolve(previousPath));

let validation;
try {
  const { runnerImport } = await import('vite');
  const { module } = await runnerImport(resolve(dashboard, 'src', 'validation.ts'), {
    configFile: false,
    root: dashboard,
    logLevel: 'silent',
  });
  validation = module;
} catch (e) {
  console.error(`validate: cannot load the parser (was npm ci run in dashboard/?): ${e instanceof Error ? e.message : e}`);
  process.exit(2);
}

const result = strict ? validation.validateRun(text, previous) : validation.validateOffice(text);
for (const w of result.warnings) console.log(`warning: ${w}`);
if (!result.ok) {
  for (const e of result.errors) console.error(`error: ${e}`);
  console.error(`validate: ${file} INVALID (${result.errors.length} errors)`);
  process.exit(1);
}
console.log(`validate: ${file} OK${strict ? ' (strict)' : ''} (${result.warnings.length} warnings)`);
