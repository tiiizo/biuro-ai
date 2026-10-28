# Lessons learned

Rules that came out of running this office on real projects. Each one is already built into the agent prompts; this page explains why.

## 1. No chains of pull requests

**Rule:** every PR targets the default branch. If tasks depend on each other, put them into one PR with several commits, or open the next PR only after the previous one is merged.

**Why:** with stacked PRs (PR B based on the branch of PR A), a human who merges quickly and in a different order merges B into A's branch instead of `main`. The changes then sit outside the default branch, the linked issues stay open, and a repair PR is needed.

## 2. Draft before adding to a PR

**Rule:** before adding commits to a PR that is ready for merge, switch it to draft (`gh pr ready --undo <n>`) and tell the user "do not merge #N yet". If it has already been merged, open a new PR from a fresh branch.

**Why:** the user may merge a PR while an agent is still pushing fixes to it. The late commits are then stranded on a merged branch and need another PR.

## 3. Review public content before it goes into a repository

**Rule:** articles, posts and other public text drafted by agents go to `reports/` first. `reviewer` checks facts, sources, invented numbers and tone. Only then does a developer move the text into the project repository and open a PR, and only the user publishes.

**Why:** public content appears under a real person's or company's name. Language models can produce plausible but invented facts, numbers or quotes, and a code review alone does not catch them.

## 4. A new branch instead of a force push

**Rule:** never force push. If a branch needs a rebase or its history is wrong, create a new branch from the default branch (for example `agent/<n>-<slug>-v2`), open a new PR and close the old one with a link to the new one.

**Why:** a force push rewrites history that others (people, agents, CI) may already rely on, and it is denied in `.claude/settings.json`. A new branch keeps the old state visible and the change reviewable.

## 5. Smaller rules

- **Every repository ignores IDE and OS files.** `.idea/` and `.DS_Store` are always in `.gitignore`; developers add them when missing.
- **MCP first, `gh` as fallback.** GitHub MCP calls sometimes fail (for example creating a PR with "not all refs are readable"); `gh pr create --body-file <file>` works in those cases.
- **Separate worktrees for parallel agents.** Two agents in one clone must not switch branches under each other; use `git worktree add` in a sibling directory.
- **Issue numbers are not PR numbers.** Issues and PRs share one counter on GitHub; in PR descriptions write "PR #15 (issue #3)" when it can be confusing.
- **Public repository means public from the first push.** Branches, commit metadata and PR descriptions are visible before anything is merged. Scan for personal data before pushing, and set a no-reply commit email for the repository.
- **Never claim unconfirmed work.** An agent reports a PR, a passed test or a posted review only if a tool confirmed it.
