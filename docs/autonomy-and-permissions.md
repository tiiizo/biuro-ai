# Autonomy and permissions

The office runs on one principle: agents may prepare anything, but a human decides anything that is hard to undo, public or costs money.

## Autonomy limits

| Agents may do without asking | Always needs the user's approval |
|---|---|
| read repositories | merge pull requests, push to the default branch |
| create and comment on issues, add labels | force push, rewrite history |
| create `agent/*` branches and push them | deployments, releases, tags, publishing packages |
| open pull requests | external publishing (posts, emails, campaigns) |
| review pull requests | spending money, paid services |
| write reports in `reports/` | creating or deleting repositories |
| | changing permissions or secrets |
| | installing software or new dependencies |
| | closing issues created by someone else |

These limits are written in `CLAUDE.md` and in each agent's prompt, and partly enforced by `.claude/settings.json`.

## How `.claude/settings.json` maps to the limits

- **deny**: merging (`gh pr merge`, MCP `merge_pull_request`), force push and push to `main`/`master`, history rewriting, repository creation/deletion/editing, releases, secrets and variables, `gh auth`, raw `gh api`, package publishing, `sudo`, piping downloads into a shell, reading `.env` files and credentials folders (`~/.ssh`, `~/.aws`, `~/.config/gh`), and MCP tools that write files directly to a branch.
- **allow**: `git push` of `agent/*` branches only, so developers can open PRs without a prompt.
- **ask**: destructive git commands (`reset --hard`, `clean`, `rebase`, `tag`), `rm -rf`, every package installation, containers and cloud CLIs.

Rule precedence in Claude Code is deny, then ask, then allow.

## Machine-specific rules

Paths that depend on your machine (your code folder, a scratch directory) do not belong in the shared `settings.json`. Put them into `.claude/settings.local.json`, which is git-ignored. `.claude/settings.local.json.example` shows the shape:

```json
{
  "permissions": {
    "allow": ["Bash(rm -r <your-scratch-directory>/*)"],
    "deny": ["Read(<path-to-your-code-root>/**/.env*)"]
  }
}
```

The shared file already denies `Read(~/code/**/.env*)`, matching the `~/code/<repo>` layout used in the docs. Change it if your clones live elsewhere.

## The rules are a guardrail, not a sandbox

`Bash(...)` rules match the command text. They stop honest mistakes, not a determined bypass. See `SECURITY.md` for examples and for the protections that really hold: branch protection, least-privilege tokens and human review.
