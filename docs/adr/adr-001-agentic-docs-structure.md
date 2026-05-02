---
id: 001
title: Agentic-dev docs structure
status: accepted
date: 2026-05-01
supersedes: []
superseded_by: []
---

## Context

This repository is being rebuilt to support agentic development — work executed
across many sessions, often by fresh agents with no prior conversational
context. The previous state was a single sprawling `blog-architecture.md` at
the repo root: useful as a reference but not structured to drive execution.

We need a documentation system that:

- Lets a fresh agent land cold in the repo and resume work without re-deriving
  past decisions
- Separates *what we're building* (evergreen) from *why we chose this*
  (immutable history) from *what to do next* (active work)
- Scales past a few decisions without becoming unscannable
- Is greppable and frontmatter-parseable for tooling

## Decision

Adopt a four-layer documentation structure under `docs/`:

- **`docs/architecture.md`** — single evergreen reference for current state
- **`docs/adr/`** — Architecture Decision Records, one per file, immutable
  once accepted. Superseded ADRs move to `adr/superseded/`.
- **`docs/plans/`** — dated execution plans, each covering 3–4 tasks
- **`docs/tasks/`** — discrete work units, one per file. Completed tasks move
  to `tasks/completed/`.

Each subfolder has a `CLAUDE.md` (not `README.md`) describing its purpose,
format, and rules — so an agent that reads CLAUDE.md files automatically
discovers the conventions.

Tasks contain enough detail that an agent can execute one without reading the
plan; plans stay short and act as coordination documents.

## Consequences

**Positive:**
- Fresh-context handoff is clean: read `docs/CLAUDE.md` → architecture → active
  plan → relevant task. ~5 files, ~10 minutes to onboard.
- ADRs preserve decision history without bloating the architecture doc.
- Per-task files allow precise agent prompts ("read `docs/tasks/005-foo.md`
  and execute") instead of fragile line ranges.
- Frontmatter `status` fields make state machine-readable for tooling.

**Negative:**
- More files to maintain than a single `TODO.md` + `NOTES.md`.
- Discipline required: ADRs must be written when decisions are made, not
  retroactively. Plans must close out before new ones start.
- Solo-dev overhead is real for small changes — the structure assumes
  meaningful work is happening.

**Neutral:**
- This is a documentation-only convention. No tooling depends on it (yet);
  scripts that read frontmatter status fields are a future enhancement.

## Alternatives considered

- **Single appending `TODO.md` / `NOTES.md`** — rejected. Becomes unscannable
  past 50 entries. Hostile to per-task agent prompts.
- **GitHub Issues for tasks** — rejected. Decouples task state from repo
  state; harder for agents to reason about when working offline or on a
  specific commit. Issues are good for external collaboration; not for
  internal execution tracking on a solo project.
- **Single `architecture.md` with an appended decision log section** —
  rejected. Conflates evergreen state with historical decisions; encourages
  editing past decisions in place rather than superseding them.
