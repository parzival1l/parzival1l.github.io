# docs/plans/

Time-boxed execution plans. Each plan covers **3–4 tasks** and represents a
shippable batch of work.

## Active plan

The currently active plan is whichever file has `status: active` in frontmatter.
There should normally be exactly one active plan at a time.

## Index

| Date       | Plan                          | Status   |
|------------|-------------------------------|----------|
| 2026-05-01 | blog-platform-rebuild         | active   |

## Format

Filename: `YYYY-MM-DD-<kebab-slug>.md` — dated for chronological ordering.

Frontmatter:

```markdown
---
date: YYYY-MM-DD
status: active                 # active | completed | archived | superseded
related_adrs: [adr-NNN, ...]
tasks: [NNN, NNN, NNN, NNN]
---
```

Body should be **concise**. The plan is a coordination document, not a spec:

- One-paragraph summary of what this batch ships
- 3–4 task references with one-line descriptions of what each delivers
- Any sequencing dependencies between tasks
- A definition of "done" for the whole batch

The plan does **not** repeat task details. Each task file owns its full
context — acceptance criteria, implementation notes, file references. The
plan just sequences them.

## Rules

- Plans are dated and immutable once `status: completed`. Do not edit; write a
  new plan for follow-up work.
- A plan covers 3–4 tasks max. If a batch needs more, split it into sequential
  plans.
- When all referenced tasks reach `status: done`, flip the plan to
  `status: completed` and write the next plan.
