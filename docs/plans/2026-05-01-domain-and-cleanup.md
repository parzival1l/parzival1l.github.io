---
date: 2026-05-01
status: active
related_adrs: [adr-004, adr-005]
tasks: [005, 006, 007, 008]
---

# Blog Platform Rebuild — Phase 2: Domain, Cleanup, Distribution

Phase 1 (`2026-05-01-blog-platform-rebuild.md`) replaced the Jekyll/Chirpy
frontend with a Next.js + MDX site live at `parzival1l.github.io`. Phase 2
takes the site to its long-term home: cuts over to the custom domain
`stepback.dev`, removes the now-unused Jekyll artifacts from the repo, wires
up basic distribution surfaces (RSS, GA4), and adds the cross-posting
workflow that ADR-005 calls for.

## Tasks in this plan

- **005 — Custom domain `stepback.dev`**
  Add `public/CNAME`, configure DNS records, wait for HTTPS provisioning,
  verify the github.io URL 301-redirects to the canonical domain.

- **006 — Remove Jekyll artifacts**
  Delete `_config.yml`, `_posts/`, `_tabs/`, `_data/`, `_plugins/`, `Gemfile`,
  `index.html`, `.gitmodules`, and the legacy `assets/` tree. Update
  `.gitignore` to drop Jekyll-specific entries. Final repo is Next.js-only.

- **007 — RSS feed + sitemap + GA4**
  Build-time `feed.xml` and `sitemap.xml` generation from `getAllPosts()`;
  GA4 script in `app/layout.tsx` gated on a `NEXT_PUBLIC_GA_ID` env var so
  local dev stays clean. Wire the footer RSS link to `/feed.xml`.

- **008 — Cross-posting workflow**
  `.github/workflows/crosspost.yml` reads `syndicate.devto` / `syndicate.hashnode`
  flags from MDX frontmatter and POSTs to platform APIs with the canonical
  URL set. Writes the resulting platform URLs back into the post frontmatter
  on success.

Each task file in `docs/tasks/NNN-*.md` owns the full spec — acceptance
criteria, implementation notes, file references, out-of-scope items.

## Sequencing

```
005 ──▶ 006 ──▶ 007
                 │
                 └──▶ 008
```

005 must land first so the canonical URL exists before cross-posting starts
pointing at it. 006 can land any time after 005 (it's independent of 007/008
but pleasant to clear the deck before adding new files). 007 and 008 can be
parallelized after 006.

## Definition of done for this plan

- `stepback.dev` serves the site over HTTPS, with `parzival1l.github.io`
  301-redirecting to it
- Repo contains zero Jekyll artifacts; `npm run build` is the only build
  pathway
- `/feed.xml` and `/sitemap.xml` exist and validate; RSS readers can subscribe
- GA4 emits pageviews when `NEXT_PUBLIC_GA_ID` is set, no script when unset
- A test post with `syndicate.devto: true` triggers `crosspost.yml` and
  produces a dev.to post with the canonical URL pointing to `stepback.dev`

## What's deliberately not in this plan

- Hashnode-as-CMS (rejected; see ADR-005)
- Newsletter system (deferred — Buttondown when ready)
- Search (Pagefind / Fuse.js — would be its own plan)
- Comments (Giscus — its own plan)
- Demo gallery aggregating Modal demos
- Cross-posting to Medium (out of scope per ADR-005)
