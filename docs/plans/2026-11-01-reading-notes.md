---
date: 2026-11-01
status: active
related_adrs: [adr-002]
tasks: [009, 010]
---

# Reading page: log, long notes, and generated tags

The `/reading/` page is a three-column feed where my thought and the
source compete for attention. This batch replaces it with a single-column
log, gives long notes their own page, and later hands tagging to Jev
(TypeSafe AI) so adding an entry stays cheap. The design was settled in
Paper (file `Personal-Blog`, page `Reading-Page`, the four "A" artboards).

This plan runs alongside `2026-05-01-cleanup-and-syndication`, whose tasks
(005, 008) are on hold. That is a deliberate exception to "one active
plan at a time".

## Tasks

- **009 — Reading log and note pages.** Single-column log grouped by
  month, type tabs with counts, "Show older entries", and a
  `/reading/<slug>/` page for long notes stored as `.mdx`.
- **010 — Generate reading tags with Jev.** An authoring-time script asks
  Jev for tags on entries that have none and writes them back to the
  source files.

## Sequencing

010 depends on 009. Task 009 makes `tags` optional and turns each tag into
a link; 010 fills them in.

## Done

Both tasks are `done`, the live `/reading/` page matches the Paper "A"
artboards on desktop and phone, and an entry added with no tags gets tags
from one script run.
