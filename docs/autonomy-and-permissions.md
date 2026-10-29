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

- **deny**: merging (`gh pr merge`, MCP `merge_pull_request`), force push, pushes that name `main`/`master`, explicit `refs/...` refspecs, `--tags`, `--follow-tags`, `--all`, `--mirror`, `--prune`, `--delete`/`-d`, history rewriting, repository creation/deletion/editing, releases, secrets and variables, `gh auth`, raw `gh api`, package publishing, `sudo`, piping downloads into a shell, reading `.env` files and credential stores (`~/.ssh`, `~/.aws`, `~/.config/gh`, `~/.config/gcloud`, `~/.kube`, `~/.docker/config.json`, `~/.netrc`, `~/.npmrc`), and MCP tools that write files directly to a branch.
- **allow**: `git push origin agent/<slug>` (also with `-u` or `--set-upstream`), so developers can open PRs without a prompt. This is a text pattern, not a branch check: the `*` matches any characters, so see "Limits of the push rules" below.
- **ask**: a push of an `agent/*` branch followed by any further argument (another branch, a tag name, an option), destructive git commands (`reset --hard`, `clean`, `rebase`, `tag`), `rm -rf`, package installation and download-and-run tools (`npm`/`pnpm`/`yarn`/`bun` installs, `npx`, `pnpm dlx`, `yarn dlx`, `bunx`, `pip`, `pipx`, `uv add`, `uvx`, `poetry add`, `gem install`, `composer require`, `brew`, `cargo install`, `go install`), containers and cloud CLIs.

Rule precedence in Claude Code is deny, then ask, then allow. An allow rule cannot carve an exception out of a deny or ask rule.

### Limits of the push rules

- In a `Bash(...)` rule, `*` matches any characters, including spaces and colons. `Bash(git push origin agent/*)` on its own would also approve `git push origin agent/1-x:refs/heads/main` or `git push origin agent/1-x --tags`. The deny and ask rules above exist to catch those extra refspecs and options.
- A `:*` at the very end of a rule is the legacy prefix syntax (`Bash(ls:*)` means `Bash(ls *)`). A rule such as `Bash(git push *:*)` therefore does **not** mean "any refspec with a colon": it matches every push with an argument, including plain `agent/*` pushes. That is why the colon rules name a target (`*:main*`, `*:master*`, `*refs/*`) instead.
- Still approved without a prompt: a `src:dst` refspec to another, unprotected branch name in the same argument, for example `git push origin agent/1-x:some-branch`. Only branch protection or a ruleset on GitHub stops that reliably.
- Pushes that match neither the allow nor the deny rules (other remotes, URLs, options placed before `origin`, other spellings such as `git -C <dir> push ...`) get the normal permission prompt in the default mode. In modes that skip prompts they are not blocked by these rules at all; see `SECURITY.md`.

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

The shared file denies `Read(**/.env*)` and `Edit(**/.env*)` inside the project. Add a rule for the folder where your other clones live (for example `~/code`) in your local file, as in the example above. Note that `**/.env*` also blocks `.env.example`; an allow rule cannot override that, so remove or narrow the deny rule locally if your agents need to read example env files.

## The rules are a guardrail, not a sandbox

`Bash(...)` rules match the command text. They stop honest mistakes, not a determined bypass. See `SECURITY.md` for examples and for the protections that really hold: branch protection, least-privilege tokens and human review.
