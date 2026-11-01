---
id: 009
title: Agentic-dev docs structure, with AGENTS.md
status: accepted
date: 2026-11-01
supersedes: [adr-001]
superseded_by: []
---

## Context

ADR-001 set up the four-layer docs structure and named each folder's
navigation file `CLAUDE.md`. That name ties the convention to one agent.
The author works with several (Claude Code, Codex, Cursor, Kimi), and
`AGENTS.md` is the name most agent tools look for. Next.js also writes its
managed agent rules into `AGENTS.md` when that file exists
(`node_modules/next/dist/server/lib/generate-agent-files.js`).

## Decision

Keep ADR-001's structure unchanged, and name every navigation file
`AGENTS.md` instead of `CLAUDE.md`.

- **`docs/architecture.md`**: the single evergreen reference for current
  state.
- **`docs/adr/`**: Architecture Decision Records, one per file, immutable
  once accepted. Superseded ADRs move to `adr/superseded/`.
- **`docs/plans/`**: dated execution plans, each covering 3–4 tasks.
- **`docs/tasks/`**: discrete work units, one per file. Completed tasks move
  to `tasks/completed/`.
- The repo root and each `docs/` folder have an `AGENTS.md`, not a
  `README.md` or `CLAUDE.md`, describing its purpose, format and rules.
- The repo has no `CLAUDE.md` files.

## Consequences

**Positive:**
- One file name works for every agent tool the author uses.
- `next dev` maintains its rules block in the root `AGENTS.md`. It does not
  recreate `CLAUDE.md` while `AGENTS.md` exists.
- Fresh-context handoff is unchanged: read `docs/AGENTS.md`, then
  architecture, the active plan and the relevant task.

**Negative:**
- An agent that only auto-loads `CLAUDE.md` does not read these files by
  itself. It has to be pointed at `AGENTS.md`, or the tool has to support
  `AGENTS.md`.
- Completed tasks and accepted ADRs still say `CLAUDE.md`. They are
  immutable history, so the old name stays in them.

**Neutral:**
- Only file names change. Folder layout, frontmatter and lifecycles are as
  ADR-001 described.

## Alternatives considered

- **Keep `CLAUDE.md`**: rejected. It names one tool for a repo worked on by
  several.
- **`AGENTS.md` plus a one-line root `CLAUDE.md` containing `@AGENTS.md`**:
  rejected at the author's request (2026-11-01: "no claude.md"). It is the
  fallback if Claude Code sessions stop picking up the root instructions.
