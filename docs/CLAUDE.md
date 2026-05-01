# docs/

Source of truth for architecture, decisions, and execution state of this blog.
This folder is structured for **agentic development** — a fresh agent (or human)
should be able to land here cold and resume work without prior context.

## Layout

```
docs/
├── CLAUDE.md              ← you are here (navigation)
├── architecture.md        ← evergreen "what we are building"
├── adr/                   ← Architecture Decision Records (the "why")
│   ├── CLAUDE.md
│   ├── adr-NNN-*.md       ← one decision per file, immutable once accepted
│   └── superseded/        ← ADRs replaced by later decisions
├── plans/                 ← time-boxed execution plans (the "how, this batch")
│   ├── CLAUDE.md
│   └── YYYY-MM-DD-name.md ← dated; each plan covers 3–4 tasks
└── tasks/                 ← discrete units of work (the "do this")
    ├── CLAUDE.md
    ├── NNN-*.md           ← one task per file, agent-executable
    └── completed/         ← tasks moved here when status=done
```

## Reading order for a fresh agent

1. **`architecture.md`** — what this project is and what it should look like
2. **`adr/CLAUDE.md`** then the ADR index — why current state is the way it is
3. **`plans/CLAUDE.md`** — find the most recent active plan
4. **`tasks/CLAUDE.md`** — find tasks referenced by that plan

The plan tells you *what batch of work to do next*. The task files tell you
*exactly how to do each piece*. ADRs explain *why constraints exist* if a task
seems to conflict with something.

## Writing rules

- **Architecture** is rewritten when reality drifts from the doc. It always
  reflects the current intended state, not history.
- **ADRs** are append-only. To change a decision, write a new ADR that supersedes
  the old one and move the old file to `adr/superseded/`.
- **Plans** are dated and immutable once status flips to `completed`. Don't edit
  old plans; write a new one.
- **Tasks** are detailed enough that the plan doesn't need to repeat their
  context. The plan lists task IDs; the task file owns the full spec.

## Status conventions

Frontmatter `status` field on plans, ADRs, and tasks:

| Doc type | Valid status values |
|---|---|
| ADR | `proposed`, `accepted`, `superseded`, `deprecated` |
| Plan | `active`, `completed`, `archived`, `superseded` |
| Task | `todo`, `in-progress`, `done`, `blocked`, `abandoned` |
