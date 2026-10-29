# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private vulnerability reporting ("Security" tab -> "Report a vulnerability") on this repository. If it is not enabled, open an issue that asks for a private contact channel without including the details.

## Threat model in short

This template lets AI agents run shell commands, edit files and act on GitHub with your credentials. Treat every agent as a fast, well-meaning junior colleague who can be confused by a misleading instruction, including instructions hidden in web pages, issues or files it reads (prompt injection).

## Permission rules are a guardrail, not a sandbox

The `deny` / `ask` / `allow` rules for `Bash(...)` in `.claude/settings.json` match the text of a command. They catch honest mistakes. They **can be bypassed**, for example:

- a different spelling of the same operation: `git -C <dir> push --force`, `git push origin HEAD` while on `main`, a refspec the patterns do not cover, a git alias;
- wrapping: `bash -c "..."`, `sh -c "..."`, `env ... git push ...`, a script file that the agent writes and then runs;
- a different tool for the same effect: `curl` against the GitHub REST API instead of `gh`.

The opposite problem matters just as much: an `allow` rule can approve more than it seems to. In `Bash(...)` rules `*` matches any characters, including spaces and colons, so `Bash(git push origin agent/*)` alone also approves `git push origin agent/x:refs/heads/main` (updates `main`), `git push origin agent/x :refs/heads/main` (deletes `main`) and `git push origin agent/x --tags`. The template adds deny and ask rules for these forms (see `docs/autonomy-and-permissions.md`), but a pattern list can never enumerate every refspec. Treat every `allow` rule as "this may run without a prompt in any form that matches the text", keep the list short, and check new rules against such variants.

Agent memory and prompt instructions are not a security boundary either.

## What actually protects you

1. **Branch protection or a ruleset on the default branch** (GitHub -> Settings -> Rules -> Rulesets, or Branches -> branch protection rules): require a pull request before merging, block force pushes and deletions, and require status checks (for example the `gitleaks` workflow). Consider a tag ruleset too, so tags cannot be created or moved without review. This is enforced by GitHub, whatever command an agent runs, and it is the only reliable answer to over-broad `allow` rules. Turn it on before agents start working on the repository, not after the first merge.
2. **Least-privilege credentials.** Give the GitHub MCP server and `gh` a token limited to the repositories and scopes the agents need. Do not give agents tokens that can change repository settings, secrets or billing.
3. **Human review and merge.** Only a human merges, deploys and releases.
4. **No secrets in the working tree.** Keep `.env` files out of git (`.gitignore`), and keep `Read(**/.env*)` in `deny`. Store secrets in your platform's secret store.
5. **Secret scanning.** `.github/workflows/gitleaks.yml` scans every push to `main` and every pull request. Repositories owned by a GitHub organization need a free `GITLEAKS_LICENSE` secret; personal accounts do not. Note that `gitleaks/gitleaks-action` is distributed under its own end-user license agreement (EULA, `LICENSE.txt` in the action's repository), unlike the MIT-licensed `gitleaks` CLI; read it before using the action in an organization, or run the CLI directly in the workflow instead. Also enable GitHub's own secret scanning and push protection if available.
6. **Sandboxing.** For untrusted work, run Claude Code in a container or VM, or enable its sandbox mode, so a bypassed rule cannot reach your whole machine.

## Public repositories

If your copy of this template is public:

- everything you push is public immediately, including `agent/*` branches, commit author emails and PR descriptions, before anything is merged;
- set a no-reply commit email for the repository (`git config user.email <id>+<login>@users.noreply.github.com`);
- keep agent memory and reports out of git (the default `.gitignore` does this);
- scan the tree and history for personal data, local paths and secrets before the first push.
