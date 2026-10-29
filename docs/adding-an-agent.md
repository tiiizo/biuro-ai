# Adding an agent

## Project developer

1. Copy `.claude/agents/developer-example.md` to `.claude/agents/developer-<project>.md`.
2. In the front matter, change `name` to `developer-<project>` and rewrite `description`. The director uses the description to decide when to use the agent, so name the repository in it.
3. In the body, replace:
   - the repository (`example-org/example-site`) and local clone path (`~/code/example-site`);
   - the checks to run before a PR;
   - the project context (what merging means, budget rules, content rules).
   Remove the template comment.
4. Create `knowledge/developer-<project>/README.md` with anything the developer should know (architecture notes, decisions, pitfalls).
5. In `.claude/agents/director.md`:
   - add `developer-<project>` to `tools: Agent(...)`;
   - add a routing line in "Working with GitHub", for example `issues in your-org/your-repo -> developer-<project>`.
6. Update `developer.md` if the new project should no longer be handled by the general developer.
7. Restart Claude Code or check `/agents`.

## Any other specialist

1. Create `.claude/agents/<name>.md`:

   ```markdown
   ---
   name: <name>
   description: <one sentence: what this agent does and when to use it>
   tools: Read, Glob, Grep, Write, Edit
   memory: project
   ---
   You are <role>. Reply in the user's language.
   Start with `knowledge/<name>/` if it exists.
   ...
   ```

2. Give the agent only the tools it needs. Leave out `Bash` unless the role really runs commands; leave out GitHub write tools unless it writes issues or PRs.
3. Create `knowledge/<name>/README.md`.
4. Add the agent to the director's `Agent(...)` list and describe when to use it.
5. If the agent writes to GitHub, add a `role:<name>` label to `.github/LABELS.md`.

## Checklist

- [ ] `name` matches the file name.
- [ ] `description` is specific enough for routing.
- [ ] Tools are minimal.
- [ ] The prompt states what the agent must never do and that it must not claim unconfirmed actions.
- [ ] No real paths, emails, client names or secrets if the repository is public.
