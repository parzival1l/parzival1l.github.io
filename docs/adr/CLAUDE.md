# docs/adr/

Architecture Decision Records — one decision per file, immutable once accepted.

## Index

| ID  | Title                                             | Status   | Date       |
|-----|---------------------------------------------------|----------|------------|
| 001 | Agentic-dev docs structure                        | accepted | 2026-05-01 |
| 002 | Migrate Jekyll/Chirpy → Next.js + TypeScript      | accepted | 2026-05-01 |
| 003 | GitHub Pages for hosting (over Vercel)            | accepted | 2026-05-01 |
| 004 | Custom domain `stepback.dev` with 301 from github.io | accepted | 2026-05-01 |
| 005 | Markdown-first content with selective syndication | accepted | 2026-05-01 |
| 006 | Minimalist editorial UI (Lee-style), not terminal | accepted | 2026-05-01 |
| 007 | Modal for live AI/ML demos                        | accepted | 2026-05-01 |

## Format

Every ADR uses this frontmatter and structure:

```markdown
---
id: NNN
title: <decision name>
status: accepted               # proposed | accepted | superseded | deprecated
date: YYYY-MM-DD
supersedes: []                 # list of ADR ids this replaces
superseded_by: []              # populated when this ADR is itself superseded
---

## Context
What situation forced this decision? What constraints exist?

## Decision
The decision in one sentence, then bullets if needed.

## Consequences
**Positive:** ...
**Negative:** ...
**Neutral:** ...

## Alternatives considered
- Option A — rejected because ...
- Option B — rejected because ...
```

## Rules

- ADRs are **immutable** after `status: accepted`. Never edit content; write a
  new ADR that supersedes the old one.
- When superseding: set old ADR's `status: superseded`, populate
  `superseded_by`, then `git mv` the old file into `superseded/`.
- The new ADR's `supersedes` array references the old IDs.
- Update the index table above when adding/superseding ADRs.
- Filename pattern: `adr-NNN-<kebab-slug>.md` — ID matches frontmatter.
