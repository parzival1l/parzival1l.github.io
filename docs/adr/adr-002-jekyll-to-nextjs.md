---
id: 002
title: Migrate Jekyll/Chirpy → Next.js + TypeScript
status: accepted
date: 2026-05-01
supersedes: []
superseded_by: []
---

## Context

The repo currently runs the Chirpy Jekyll theme. Chirpy is feature-rich
(sidebar, search, dark mode, tag cloud, comments widget) but its aesthetic
is generic and customization beyond CSS variables requires fighting the theme.

The blog will eventually need:

- Embedded interactive components (live demo widgets pinging Modal endpoints,
  chart components that re-render on user input, code playgrounds)
- A minimalist editorial layout (see ADR-006) that's fundamentally different
  from Chirpy's structure
- TypeScript and a modern dev workflow for any custom UI work

Jekyll can produce static markdown sites well, but adding stateful React
components inside posts requires bolting on a separate JS bundle and
hand-wiring hydration — work that Next.js does natively via MDX.

## Decision

Migrate the frontend to Next.js + TypeScript, using:

- `output: 'export'` for static site generation deployed to GitHub Pages
- MDX for post content (markdown + embedded React components)
- Tailwind CSS for styling
- `gray-matter` for frontmatter parsing
- File-based routing under `app/`

Posts move from `_posts/YYYY-MM-DD-Title.md` (Jekyll filename convention) to
`content/posts/<slug>.mdx` with the date in frontmatter.

## Consequences

**Positive:**
- Full UI flexibility — layouts, components, interactivity, all in TypeScript
- MDX enables interactive components inside posts when relevant
- Modern dev experience: TypeScript, hot reload, ESLint, modern build tooling
- Same hosting (GitHub Pages), same deploy model (push to main → Action →
  Pages), so the operational story is unchanged
- Aligns with ADR-006 (minimalist editorial UI) — easier to build a custom
  layout from scratch in Next.js than to override Chirpy

**Negative:**
- Migration cost: scaffold app, port 4 existing posts, rewrite layouts,
  swap deploy workflow. Estimated 1–2 evenings of focused work.
- Build time goes from ~15s (Jekyll) to ~30–60s (Next.js with `next build`).
  Still well under 2 minutes total deploy time.
- More moving parts in the build (Node + npm + Next + MDX pipeline) than
  Jekyll's single-binary build.
- Existing Chirpy-shaped URLs (e.g., `/posts/<slug>/`) will change unless
  explicitly preserved via routing — minor SEO concern given the small
  current footprint.

**Neutral:**
- The architecture diagram in `docs/architecture.md` is unchanged in shape;
  only the "frontend framework" box changes.
- Cross-posting (ADR-005) is decoupled from frontend choice — works
  identically with either stack.

## Alternatives considered

- **Stay on Chirpy, restyle with custom CSS** — rejected. Heavy CSS overrides
  to fight the theme cost as much as a clean rebuild and produce worse
  results. No path to interactive components without bolting on extra
  infrastructure.
- **Switch to a minimalist Jekyll theme (e.g., Klisé, Tale)** — viable for
  static-only, but rules out interactive components. Defers the migration
  cost without eliminating it.
- **Hugo** — fast, mature, but the templating language is unfamiliar and
  there's no MDX equivalent (Hugo shortcodes are not React components).
- **Astro** — strong contender; supports MDX and component islands. Rejected
  for now because Next.js is more familiar and the React ecosystem has more
  off-the-shelf components for AI demo widgets, but Astro is a reasonable
  alternative if Next.js becomes painful.
