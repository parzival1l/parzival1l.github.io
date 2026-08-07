---
date: 2026-05-01
status: active
related_adrs: [adr-005, adr-008]
tasks: [005, 006, 008]
supersedes: 2026-05-01-domain-and-cleanup
---

# Blog Platform Rebuild — Phase 2: Domain, Cleanup, and Syndication

Phase 1 shipped the Next.js + MDX site at `parzival1l.github.io`. The
original phase-2 plan (`2026-05-01-domain-and-cleanup.md`, superseded)
bundled four tasks: custom domain, Jekyll cleanup, distribution surfaces
(RSS / sitemap / GA4), and cross-posting. This plan was initially pared
down to just 006 + 008 with custom domain deferred; the domain decision
was then reversed (see ADR-008, 2026-05-24) and **005 brought back into
scope**. Distribution surfaces (007) remain deferred to a future plan.

## Tasks in this plan

- **005 — Custom domain migration to `parzival.blog`**
  Register `parzival.blog` through Squarespace Domains, configure DNS to
  point at GitHub Pages (apex A records + `www` CNAME), add
  `public/CNAME`, enable the custom domain in repo Pages settings, enforce
  HTTPS once Let's Encrypt provisions. See ADR-008 for the decision and
  task 005 for the full sequencing — DNS first, repo change second.

- **006 — Remove Jekyll artifacts**
  `git rm` the dead Chirpy files (`_config.yml`, `_posts/`, `_tabs/`,
  `_data/`, `_plugins/`, `Gemfile`, `index.html`, `.gitmodules`, the legacy
  `assets/` tree). Drop Jekyll-specific entries from `.gitignore`
  (`.bundle`, `vendor`, `Gemfile.lock`, `.jekyll-cache`, `.jekyll-metadata`,
  `_site`, `*.gem`, `_sass/dist`, `assets/js/dist`). Verify `npm run build`
  still passes and the live site remains intact. Final repo is Next.js-only.

- **008 — Cross-posting workflow**
  `.github/workflows/crosspost.yml` runs after a successful deploy on
  `main`, reads `syndicate.devto` / `syndicate.hashnode` flags from each
  MDX file, and POSTs to the platform APIs with `canonical_url` set to the
  canonical site URL. On first successful publish, writes the resulting
  platform URL back into the post's frontmatter (`syndicate.devto_url`,
  `syndicate.hashnode_url`) and commits to `main`, so re-runs become
  updates instead of duplicate posts. Idempotent.

The ID **007 is deliberately skipped** — it was referenced by the
superseded plan for RSS+sitemap+GA4 work that has been deferred. Per
`docs/tasks/CLAUDE.md`, IDs are never reused, so 007 stays reserved for
when those distribution surfaces come back.

## Sequencing

```
005 ──┐
006 ──┤── done
008 ──┘
```

All three are independent and can land in any order or in parallel.
A useful coincidence: if 005 ships before 008, the cross-poster picks
up `parzival.blog` as the `canonical_url` from day one with no
migration needed. If 008 ships first, the canonical URL is
`parzival1l.github.io` for any posts syndicated in the gap — at
cutover those need one-time updates via the platforms' edit APIs.
Since no posts have been syndicated yet, **landing 005 first is the
zero-effort path**, but not strictly required.

## Definition of done for this plan

- `https://parzival.blog/` serves the site over a valid TLS cert and
  `parzival1l.github.io` 301-redirects to it
- Repo contains zero Jekyll artifacts; `npm run build` is the only build
  pathway and the live site is unchanged
- A test post with `syndicate.devto: true` (and `syndicate.hashnode: true`
  if a Hashnode account exists) triggers `crosspost.yml` and produces
  platform posts whose `canonical_url` points at `parzival.blog`
- The platform URLs are written back into the post's frontmatter so a
  second push of the same post updates rather than duplicates
- Failure modes are handled: missing API key → workflow no-ops with a
  clear log line, not a hard failure

## Prerequisites the author needs to provide

- **Domain purchase**: `parzival.blog` registered through Squarespace
  Domains (needed for task 005)
- **dev.to API key** → repo secret `DEVTO_API_KEY` (needed for 008)
- **Hashnode personal access token + publication ID** → repo secrets
  `HASHNODE_TOKEN`, `HASHNODE_PUBLICATION_ID` (skip if no Hashnode account)

Without the API secrets, 008's workflow runs but no-ops on the missing
platform.

## What's deliberately not in this plan

(All deferred to future plans, not this one)

- **RSS feed / `sitemap.xml` / GA4** — its own future plan; pieces are
  small and independent (this is the reserved-but-skipped task 007)
- Hashnode-as-CMS — rejected per ADR-005
- Newsletter (Buttondown) — deferred
- Search (Pagefind / Fuse.js) — its own plan
- Comments (Giscus → GitHub Discussions) — its own plan
- Demo gallery aggregating Modal demos — its own plan
- Cross-posting to Medium — out of scope per ADR-005

## Small follow-up worth flagging

The phase-1 deploy log warned that `actions/deploy-pages@v4` runs on
Node 20, deprecated June 2nd, 2026. Whichever agent touches workflow
files for task 008 should bump `deploy-pages` to whatever the current
major is at that time (or set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`
on the runner). Not a separate task — fits inside 008's scope.
