# Memory

Every agent has `memory: project` in its front matter. Claude Code then gives the agent its own memory folder, `.claude/agent-memory/<agent-name>/`, and loads the beginning of the agent's `MEMORY.md` index into its context at the start of each run. The agent reads and writes its memory files itself.

## Why memory is git-ignored here

Claude Code designs `project` memory to be shared through version control. In a template that people fork and often keep public, that is a leak waiting to happen: agents remember project names, client names, decisions, local paths and preferences. This template therefore lists `.claude/agent-memory/` in `.gitignore`.

Your options:

| Option | Front matter | Location | Versioned |
|---|---|---|---|
| Template default | `memory: project` | `.claude/agent-memory/<name>/` | no (git-ignored) |
| Share with your team | `memory: project` | same | yes, after removing the line from `.gitignore`, in a **private** repository |
| Local only, by design | `memory: local` | `.claude/agent-memory-local/<name>/` | no |
| Across all projects | `memory: user` | in your home directory | no |

## What belongs in memory

- durable findings: repository architecture, test commands, pitfalls;
- preferences and decisions the user stated, with the reason;
- pointers to where information lives.

## What does not

- secrets of any kind (passwords, API keys, tokens);
- full transcripts or temporary task state;
- facts that can be read from the code or git history.

## Memory is not a security boundary

An agent may forget, misread or ignore a memory note. Rules that must hold belong in the agent prompt, in `.claude/settings.json` and, above all, in repository settings on GitHub (`SECURITY.md`).

## Knowledge vs memory

`knowledge/<agent-name>/` is curated by you and versioned; memory is written by the agent. Move a memory note into `knowledge/` once you want it reviewed and kept.
