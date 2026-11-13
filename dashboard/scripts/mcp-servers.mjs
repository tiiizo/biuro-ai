#!/usr/bin/env node
// Lists the MCP servers that a Claude Code session could load or that have permission rules, so that
// update-office.sh can deny every server except `github` in the unattended run.
//
// Usage: node scripts/mcp-servers.mjs FILE...
// For every FILE that exists (missing files are skipped):
//   - names from permission rules and tool names anywhere in the text: `mcp__<server>` / `mcp__<server>__<tool>`;
//   - JSON keys of `mcpServers` at the top level (.mcp.json, managed-mcp.json, ~/.claude.json user scope)
//     and in `projects.<path>.mcpServers` (~/.claude.json local scope, every project).
// Prints one server name per line, sorted, without duplicates, in the form Claude Code uses in tool names
// (characters other than letters, digits, `_` and `-` become `_`). A file that is not valid JSON is still
// scanned for `mcp__` names. Exit code 0; 2 only for a usage error.
import { existsSync, readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('mcp-servers: usage: mcp-servers.mjs FILE...');
  process.exit(2);
}

/** The server name as it appears in tool names (`my.server` -> `my_server`). */
function normalize(name) {
  return name.replace(/[^A-Za-z0-9_-]/g, '_');
}

const servers = new Set();
const keys = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.keys(o) : []);

for (const file of files) {
  if (!existsSync(file)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const m of text.matchAll(/mcp__([A-Za-z0-9_-]+)/g)) {
    const server = m[1].split('__')[0];
    if (server) servers.add(server);
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    continue;
  }
  for (const k of keys(json?.mcpServers)) servers.add(normalize(k));
  for (const p of keys(json?.projects)) for (const k of keys(json.projects[p]?.mcpServers)) servers.add(normalize(k));
}

for (const s of [...servers].filter(Boolean).sort()) console.log(s);
