# knowledge/

One folder per agent (`knowledge/<agent-name>/`). This is curated, human-maintained input that the agent reads when it is relevant.

| | `knowledge/` | Agent memory |
|---|---|---|
| Who writes | you (the user) | the agent itself |
| Location | `knowledge/<agent-name>/` | `.claude/agent-memory/<agent-name>/` |
| Versioned in this template | yes | no (git-ignored) |
| Content | briefs, checklists, product facts, style guides | durable findings, preferences, pitfalls |

See `docs/memory.md` for details.
