# Labels shared by all repositories

| Group | Labels | Rule |
|---|---|---|
| Role | `role:developer`, `role:marketing`, `role:strategist`, `role:researcher`, `role:finance`, `role:product-owner`, `role:translator`, `role:human` | exactly one |
| Type | `type:feature`, `type:bug`, `type:research`, `type:content`, `type:tech-debt`, `type:decision` | exactly one |
| Priority | `P1` (this week), `P2` (this month), `P3` (some day) | exactly one |
| Status | `status:needs-approval`, `status:blocked`, `status:in-progress` | optional |

`role:human`: tasks the agents cannot do (merging, payments, external contacts, decisions).

The template does not create labels automatically. Create them once per repository in the GitHub UI, or with `gh label create <name>` if you use the GitHub CLI.
