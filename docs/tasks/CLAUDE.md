# docs/tasks/

Discrete units of work, each agent-executable in isolation.

## Active tasks

Tasks not in `completed/` and with `status` other than `done`.

## Index

| ID  | Title                                  | Status | Plan       |
|-----|----------------------------------------|--------|------------|
| 001 | Scaffold Next.js app                   | todo   | 2026-05-01 |
| 002 | Port existing posts to MDX             | todo   | 2026-05-01 |
| 003 | Build layout and theme (Lee-style)     | todo   | 2026-05-01 |
| 004 | Replace deploy workflow                | todo   | 2026-05-01 |

(Completed tasks live in `completed/` — their IDs remain unique forever; never
reused.)

## Format

Filename: `NNN-<kebab-slug>.md` — three-digit ID, zero-padded.

Frontmatter:

```markdown
---
id: NNN
title: <imperative description>
status: todo                   # todo | in-progress | done | blocked | abandoned
created: YYYY-MM-DD
plan: YYYY-MM-DD-<plan-slug>
adrs: [adr-NNN, ...]           # ADRs this task implements or depends on
depends_on: [NNN, ...]         # task IDs that must complete first
---
```

Body must contain enough information that a fresh agent can execute the task
without reading the plan. Required sections:

- **Context** — why this task exists, link to plan and relevant ADRs
- **Acceptance criteria** — checklist of observable outcomes
- **Implementation notes** — approach, gotchas, file references, code shape
- **Out of scope** — explicit non-goals to prevent scope creep

## Lifecycle

1. Created with `status: todo` when a plan references it.
2. Agent picks it up → flips to `status: in-progress`.
3. Work completes → flips to `status: done`, then file is moved:
   ```
   git mv docs/tasks/NNN-slug.md docs/tasks/completed/
   ```
4. If blocked, flip to `status: blocked` and add a note explaining what
   unblocks it.
5. If no longer relevant, flip to `status: abandoned` and move to `completed/`
   with a note explaining why.

## Rules

- IDs are sequential (001, 002, ...) and **never reused** even after a task is
  abandoned. Find the next ID by `ls` of both `tasks/` and `tasks/completed/`.
- One agent owns one task at a time. Don't fan out within a single task — if
  the work is parallel, split into multiple tasks.
- Update the index table above when creating, completing, or moving tasks.
