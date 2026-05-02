# Blog Platform — Architecture

Evergreen reference for what this project is. Reflects the current intended
state, not historical drafts. For the *why* of any specific decision, see the
matching ADR in `adr/`.

## What this is

A personal technical blog for AI engineering content, hosted on GitHub Pages
under the custom domain `stepback.dev`, with selective syndication to
developer platforms (dev.to, Hashnode, optionally Medium).

The repository is the canonical source of truth: posts are markdown files in
git, the site is statically built and deployed by GitHub Actions, and
cross-posting to other platforms is itself a workflow that reads frontmatter
flags from the same markdown files.

Live AI/ML demos for projects covered by the blog are hosted separately on
Modal (serverless), linked from project landing pages and post bodies.

## High-level architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Repo: parzival1l/parzival1l.github.io                            │
│                                                                   │
│  content/posts/*.mdx          ← canonical source of truth         │
│  app/, components/, public/   ← Next.js + TypeScript frontend     │
│  docs/                        ← architecture, ADRs, plans, tasks  │
│                                                                   │
│  .github/workflows/                                               │
│    deploy.yml      ──▶ next build + export ──▶ GitHub Pages       │
│    crosspost.yml   ──▶ read syndicate.* flags ──▶ external APIs   │
└──────────────────────────────────────────────────────────────────┘
                       │                              │
              build & deploy                 syndicate (selective)
                       ▼                              ▼
        ┌──────────────────────────┐       ┌────────────────────┐
        │  GitHub Pages             │       │  dev.to            │
        │  → stepback.dev (canonical)│       │  Hashnode          │
        │  ← parzival1l.github.io    │       │  Medium (optional) │
        │     (301 redirect)         │       │  (canonical → us)  │
        └──────────────────────────┘       └────────────────────┘
                       │
                       │  posts may link to
                       ▼
              ┌────────────────────┐
              │  Modal              │
              │  (live AI demos)    │
              │  scales to zero     │
              └────────────────────┘
```

## Component roles

| Component | Role | Cost | Notes |
|---|---|---|---|
| **Next.js (static export)** | Frontend; renders MDX posts at build time | — | TypeScript, Tailwind, MDX |
| **GitHub Pages** | Static hosting with custom domain + free SSL | Free | 100 GB/mo soft cap; no billing surprises |
| **GitHub Actions** | Build + deploy on push, cross-posting workflow | Free (within Pro/Student limits) | Two workflows, decoupled |
| **stepback.dev** | Canonical custom domain | Domain cost only | github.io 301-redirects to it |
| **Cross-posting workflow** | Reads `syndicate.*` frontmatter, POSTs to platform APIs with canonical URL | Free | Per-platform booleans; opt-in |
| **dev.to / Hashnode** | Distribution surface | Free | Both respect canonical URL for SEO |
| **Modal** | Serverless hosting for live AI/ML demos | $30/mo free tier + student credits | Linked from posts/projects, not coupled to blog |
| **GA4** | Visitor analytics | Free | Embedded in Next.js layout |

## Content workflow

```
1. Write post as content/posts/<slug>.mdx
2. Set frontmatter: title, date, categories, tags, syndicate.*
3. git push
4. deploy.yml → build → GitHub Pages → live on stepback.dev (~1–2 min)
5. crosspost.yml → for each syndicate.<platform>: true, POST to API
6. (optional) Modal demo deployed separately when relevant
```

Per-post effort: write → push → done. Cross-posting and deploy are automated.

## Frontmatter shape

```yaml
---
title: structlog — structured logging in Python
date: 2026-05-15
categories: [Good Patterns]
tags: [python, observability]
syndicate:
  devto: true
  hashnode: true
  medium: false
  # populated automatically by crosspost.yml after first publish:
  devto_url:
  hashnode_url:
---
```

Default behavior: no `syndicate` block ⇒ no cross-posting. Opt-in per platform.

## URL strategy

| URL | Purpose |
|---|---|
| `stepback.dev` | Canonical. All real traffic. |
| `parzival1l.github.io` | 301-redirects to `stepback.dev` (preserves old links) |
| `stepback.dev/blog/<slug>` | Individual posts (final URL pattern TBD; see ADR-002) |
| `stepback.dev/projects` | Index of project pages |
| `<project>.modal.run` | Live demo endpoints, linked from post bodies |

## Planned content series

**Tools I tried this week** — weekly roundup of developer tools, libraries,
services explored. Good candidate for syndication; lighter posts.

**Good Patterns** — standalone deep-dives on engineering practices, libraries,
or workflows worth adopting. Selective syndication based on broad relevance.

## Analytics

- GA4 embedded in Next.js layout
- Hashnode's per-post analytics for syndicated copies
- dev.to's reaction/comment counts as engagement signal

## Out of scope (for now)

These are valid future enhancements but not part of the current design:

- Newsletter system (deferred — Buttondown when ready)
- Hashnode-as-CMS (rejected; see ADR-005)
- Search (would add Pagefind or Fuse.js client-side)
- Comments (would add Giscus → GitHub Discussions)
- RSS auto-generated by Next.js (will add as small follow-up)
- Demo gallery page aggregating Modal demos
- Cross-posting to Medium

## Related documents

- ADRs in `docs/adr/` for the *why* of every decision above
- Active plan in `docs/plans/` for what's being built now
- Task files in `docs/tasks/` for individual units of work
