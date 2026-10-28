# Getting started

## Requirements

- [Claude Code](https://code.claude.com/docs/en/setup), installed with one of the official methods from that page.
- A Claude plan that includes Claude Code, or an API key. Subagents share your usage limits, so a director that starts many specialists uses them up faster.
- Optional, for the GitHub workflow:
  - the [GitHub MCP server](https://github.com/github/github-mcp-server) configured in Claude Code;
  - the [GitHub CLI](https://cli.github.com/) (`gh`), used as a fallback when an MCP call fails.

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
Analyse the launch of a new product. Delegate research to researcher,
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
