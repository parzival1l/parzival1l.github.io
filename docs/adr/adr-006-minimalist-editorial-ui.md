---
id: 006
title: Minimalist editorial UI (Lee-style), not terminal
status: accepted
date: 2026-05-01
supersedes: []
superseded_by: []
---

## Context

An earlier architecture draft proposed a terminal/CLI-themed UI inspired by
thomasrice.com — monospace typography, dark theme, CLI command headers,
keyboard navigation. The goal was a strong developer-identity signal.

After reviewing alternatives (notably leehanchung.github.io and stylessh.dev),
the preference shifted toward a **minimalist editorial layout**: serif
typography, narrow content column, no sidebar, restrained color, focus on the
text itself.

Both aesthetics are valid "developer blog" signals. The choice is taste.

## Decision

Build the frontend in a minimalist editorial style modeled on
leehanchung.github.io. Specifically:

- **Header**: site name + nav (`Blogs / Publications / Projects / About`).
  Minimal; no search bar, no theme toggle.
- **Hero (homepage)**: short bio paragraph, optional pinned/featured content,
  recent posts list.
- **Post layout**: narrow column (~700px max), generous line-height, serif
  body font, no sidebar, no related-posts widget, no inline ads or popups.
- **Footer**: bio + social links (GitHub, LinkedIn, Twitter, RSS).
- **404 page**: image + simple message, no nav fallback noise.

Implementation primitives:
- Tailwind for utility-first styling
- A small set of layout components (`<SiteHeader />`, `<SiteFooter />`,
  `<PostLayout />`, `<PageLayout />`)
- One serif typeface for body (system serif stack acceptable; can upgrade to
  a hosted font like Charter or Source Serif 4 later)
- Single accent color, used sparingly

Nav structure differs slightly from Lee's — `Talks` becomes `Projects` since
this blog is paired with project demos rather than conference talks.

## Consequences

**Positive:**
- Subtractive aesthetic: nothing to fight. Posts get focus.
- Implementation is small — a few hundred lines of TypeScript + Tailwind for
  the entire layout. No dependency on heavy theme machinery.
- Plays well with embedded interactive components later (a Modal demo widget
  inserted in a post body has visual room to breathe).
- Easier to maintain over years than a feature-rich theme.

**Negative:**
- Less immediately distinctive than the terminal aesthetic. Won't stand out
  on first glance the way a CRT-themed site does.
- No built-in accommodations for Chirpy-style features (tag cloud, related
  posts, search bar). If we want them, we build them.

**Neutral:**
- This is a UI choice; underlying decisions (Next.js, GitHub Pages,
  syndication) are independent.
- A theme switch later is non-trivial but not blocked — layouts are
  components, not coupled to content.

## Alternatives considered

- **Terminal/CLI theme** — original proposal. Rejected because the editorial
  style felt closer to the kind of writing this blog will host (long-form
  technical essays, weekly tool roundups), and the implementation was no
  cheaper.
- **Chirpy-style feature-rich theme** — rejected as part of ADR-002. The
  whole reason to leave Chirpy is that its feature density works against
  reading focus.
- **Notion-style clean UI** — overlaps with editorial style; the Lee
  reference is a more specific, opinionated version of the same impulse.
