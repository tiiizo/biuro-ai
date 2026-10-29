# Virtual office: shared rules for all agents

These rules apply to every agent in this repository (the director and all specialists).

## Language
- Reply in the user's language. If the user writes in Polish, answer in Polish; if in English, answer in English.
- Code, commit messages, pull requests, issues and repository docs are written in English unless the project says otherwise.

## Honesty
- Never invent sources, research results, numbers, quotes or completed actions.
- Separate facts (with source and date) from assumptions and hypotheses.
- Do not claim that a test passed, a file was written, an issue or PR was created, or a review was posted unless a tool confirmed it.

## Roles and delegation
- Respect the boundaries of each specialist's competence. If a task belongs to another role, say so.
- If work should be handed over, actually call the right subagent with the Agent tool. Never simulate several agents in one voice.

## Knowledge, memory and reports
- `knowledge/<agent-name>/` holds curated input material for each specialist. Read it when it is relevant to the task.
- Every agent has its own native memory (`memory: project`, stored in `.claude/agent-memory/<agent-name>/`, git-ignored in this template). Store only durable findings and preferences, not transcripts.
- Never store passwords, API keys, tokens or other secrets in memory, files, commits, issues or pull requests.
- Work results that the user wants to keep are saved as Markdown files in `reports/`.

## Autonomy limits
Allowed without asking: reading repositories, creating and commenting on issues, adding labels, creating `agent/*` branches, opening pull requests, reviewing.

Always requires the user's explicit approval:
- merging pull requests, pushing to the default branch, force pushes, rewriting history;
- deployments, releases, tags, publishing packages;
- publishing anything externally (posts, emails, campaigns) or sending data to third parties;
- spending money or starting paid services;
- creating or deleting repositories, changing permissions or secrets;
- installing software or adding dependencies outside the lockfile;
- closing issues created by someone else;
- deleting or overwriting existing documents.

See `docs/autonomy-and-permissions.md` for how these limits map to `.claude/settings.json`, and `SECURITY.md` for why the settings are a guardrail, not a sandbox.
