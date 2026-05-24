# docs/tasks/

Discrete units of work, each agent-executable in isolation.

## Active tasks

Tasks not in `completed/` and with `status` other than `done`.

## Index

| ID  | Title                          | Status | Plan       |
|-----|--------------------------------|--------|------------|
| 006 | Remove Jekyll artifacts        | todo   | 2026-05-01 |
| 008 | Cross-posting workflow         | todo   | 2026-05-01 |

The active plan
(`docs/plans/2026-05-01-cleanup-and-syndication.md`) references tasks
**006** and **008**. IDs **005** (custom domain) and **007**
(RSS + sitemap + GA4) are deliberately skipped and reserved — they were
referenced by the now-superseded `2026-05-01-domain-and-cleanup.md` plan
and will be picked up by future plans.

(Completed tasks live in `completed/` — their IDs remain unique forever;
never reused. Find the next free ID by `ls`-ing both `tasks/` and
`tasks/completed/`.)

### Recently completed

| ID  | Title                                  | Plan       | Location                          |
|-----|----------------------------------------|------------|-----------------------------------|
| 001 | Scaffold Next.js app                   | 2026-05-01 | `completed/001-scaffold-nextjs-app.md` |
| 002 | Port existing posts to MDX             | 2026-05-01 | `completed/002-port-existing-posts.md` |
| 003 | Build layout and theme (Lee-style)     | 2026-05-01 | `completed/003-build-layout-and-theme.md` |
| 004 | Replace deploy workflow                | 2026-05-01 | `completed/004-replace-deploy-workflow.md` |

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
