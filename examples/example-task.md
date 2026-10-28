# Example task (fictional)

An issue in `example-org/example-site`, written by `product-owner` with `.github/ISSUE_TEMPLATE/task.md`.

Labels: `role:developer`, `type:feature`, `P2`

---

## Context
Visitors ask how to reach us; the site has no contact page. Decision in the head office issue: a static page with an email link, no form for now.

## Goal
A `/contact` page linked from the footer.

## Done criteria
- [ ] `/contact` shows `owner@example.com` as a `mailto:` link.
- [ ] The footer links to `/contact` on every page.
- [ ] `npm run type-check && npm run lint && npm test && npm run build` pass.
- [ ] No new dependencies.

## Output format
PR against `main` with `Closes #<number>`.

## Dependencies and constraints
No contact form, no third-party scripts. Do not change the existing footer layout.
