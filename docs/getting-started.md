# Getting started

## Requirements

- [Claude Code](https://code.claude.com/docs/en/setup), installed with one of the official methods from that page.
- A Claude plan that includes Claude Code, or an API key. Subagents share your usage limits, so a director that starts many specialists uses them up faster.
- Optional, for the GitHub workflow:
  - the [GitHub MCP server](https://github.com/github/github-mcp-server) registered in Claude Code under the name `github` (see below);
  - the [GitHub CLI](https://cli.github.com/) (`gh`), used as a fallback when an MCP call fails.

## GitHub MCP server: the name must be `github`

Claude Code names MCP tools `mcp__<server-name>__<tool>`. Every agent's `tools:` list and the MCP deny rules in `.claude/settings.json` use `mcp__github__*`, so the server must be registered as `github`. If you register it under another name (for example `github-mcp`), the agents silently lose all GitHub tools and the deny rules (such as `mcp__github__merge_pull_request`) no longer match anything. If you must use another name, rename the tools in every agent file and in `settings.json` too.

One way to register the remote server (see the [official guide](https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-claude.md) for the Docker variant and current options):

```sh
export GITHUB_MCP_TOKEN=...   # a fine-grained token, see below; do not commit it
claude mcp add --transport http github https://api.githubcopilot.com/mcp \
  -H "Authorization: Bearer $GITHUB_MCP_TOKEN"
```

- Keep the default `local` scope (or `user`). Do not use `--scope project` with a literal token: that writes it to `.mcp.json` in the repository.
- Use a fine-grained personal access token limited to the repositories the agents work on, with only the permissions they need (typically Contents, Issues and Pull requests read/write, Metadata read). No administration, secrets or workflow permissions. See "Least-privilege credentials" in [`SECURITY.md`](../SECURITY.md).
- Check the result with `claude mcp list` and, inside Claude Code, `/mcp`.

## First run

```sh
git clone https://github.com/<your-account>/<your-copy-of-this-template>.git ~/code/office
cd ~/code/office
claude --agent director
```

Inside Claude Code:

- `/agents` lists the agents in `.claude/agents/`;
- `/status` shows how you are logged in;
- `/permissions` shows the effective permission rules.

To talk to one specialist directly, start it as the main agent, for example `claude --agent researcher`. To resume a conversation, run `claude --resume` in the same folder and pick the session.

## Example prompts

```
Analyze the launch of a new product. Delegate research to researcher,
strategy to strategist and the budget to finance. Merge the results and
separate facts from assumptions. Save the result in reports/.
```

```
Run the weekly review of example-org/example-site: open issues and PRs,
proposed priorities for this week. Wait for my approval before delegating.
```

## Make it yours

1. Edit `CLAUDE.md` (shared rules) and the agents in `.claude/agents/`.
2. Replace `developer-example` with a developer for your real project (`docs/adding-an-agent.md`).
3. Put briefs and checklists into `knowledge/<agent-name>/`.
4. Review `.claude/settings.json` and add machine-specific rules to `.claude/settings.local.json` (git-ignored); see `.claude/settings.local.json.example`.
5. On GitHub: protect the default branch (`SECURITY.md`) and create the labels from `.github/LABELS.md`.
