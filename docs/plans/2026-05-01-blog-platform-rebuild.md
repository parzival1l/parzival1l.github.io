---
date: 2026-05-01
status: active
related_adrs: [adr-002, adr-003, adr-006]
tasks: [001, 002, 003, 004]
---

# Blog Platform Rebuild — Phase 1: Framework Migration

Replace the Jekyll/Chirpy frontend with a Next.js + TypeScript app on the same
GitHub Pages hosting, in a Lee-style minimalist editorial layout. By the end
of this plan the new site is live at `parzival1l.github.io` with the four
existing posts ported and the build pipeline cut over.

This is the first of two plans for the broader rebuild. A subsequent plan
covers the custom domain, cross-posting workflow, and Jekyll cleanup —
deliberately scoped out of this batch to keep it shippable.

## Tasks in this plan

- **001 — Scaffold Next.js app**
  Create the Next.js + TypeScript + Tailwind + MDX project structure on a
  branch. No content yet; just a working dev server and a passing build.

- **002 — Port existing posts to MDX**
  Move the four posts from `_posts/*.md` to `content/posts/*.mdx`, adjust
  frontmatter for the new schema, verify they render.

- **003 — Build layout and theme (Lee-style)**
  Implement the site shell: header nav, narrow post column, footer, custom
  404. Pure static rendering — no interactive components yet.

- **004 — Replace deploy workflow**
  Replace `.github/workflows/pages-deploy.yml` with a Next.js build+deploy
  workflow. Verify the new site serves at `parzival1l.github.io`.

Each task file in `docs/tasks/NNN-*.md` contains the full spec — acceptance
criteria, implementation notes, file references, out-of-scope items.

## Sequencing

```
001 ──▶ 002 ──▶ 003 ──▶ 004
```

Strictly sequential. Each task assumes the previous one is complete.

001–003 happen on a feature branch with the live Chirpy site untouched. Only
task 004 cuts over the live deploy.

## Definition of done for this plan

- New Next.js site builds locally with `npm run build`
- Four existing posts render at expected URLs
- Layout matches the Lee-style aesthetic from ADR-006
- `parzival1l.github.io` serves the new site (Chirpy fully replaced)
- Old `_posts/`, `_tabs/`, `_config.yml`, `Gemfile`, `_plugins/`, `_data/`
  remain in repo for now (cleanup happens in the next plan, not here)

## What's deliberately not in this plan

These are coming in the **next plan**, not this one:

- Custom domain `stepback.dev` setup (DNS, CNAME, HTTPS)
- Cross-posting workflow (`crosspost.yml`)
- Removing Jekyll artifacts from the repo
- GA4 integration
- RSS feed

Keeping this plan to four tasks ensures it's shippable in a focused session.
