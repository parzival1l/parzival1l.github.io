---
date: 2026-05-01
status: active
related_adrs: [adr-005]
tasks: [006, 008]
supersedes: 2026-05-01-domain-and-cleanup
---

# Blog Platform Rebuild — Phase 2 (Pared Down): Cleanup and Syndication

Phase 1 shipped the Next.js + MDX site at `parzival1l.github.io`. The
original phase-2 plan (`2026-05-01-domain-and-cleanup.md`, now superseded)
bundled four tasks: custom domain, Jekyll cleanup, distribution surfaces
(RSS / sitemap / GA4), and cross-posting. This pared-down plan keeps only
the two the author wants right now — clear out the dead Jekyll artifacts,
and wire up cross-posting per ADR-005.

Custom domain (`stepback.dev`) and distribution surfaces are deferred to
future plans. They're orthogonal to these two and can land at any time.

## Tasks in this plan

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

Task files for 006 and 008 don't exist yet. The next agent picking up this
plan should create `docs/tasks/006-*.md` and `docs/tasks/008-*.md` per the
format in `docs/tasks/CLAUDE.md` before starting work, then add a row per
task to the active index in that file.

The IDs **005 and 007 are deliberately skipped** — they were referenced by
the superseded plan for custom-domain and RSS+sitemap+GA4 work that has
been deferred. Per `docs/tasks/CLAUDE.md`, IDs are never reused, so 005
and 007 stay reserved for if/when those tasks come back.

## Sequencing

```
006 ─┐
     ├─▶ done
008 ─┘
```

Independent — 006 and 008 can land in either order or in parallel. 008
does **not** depend on the custom domain: it uses
`https://parzival1l.github.io` as the canonical URL for now. A future
domain plan will need a one-time migration to update existing platform
posts when the canonical URL changes, but that's handled there.

## Definition of done for this plan

- Repo contains zero Jekyll artifacts; `npm run build` is the only build
  pathway and the live site is unchanged
- A test post with `syndicate.devto: true` (and `syndicate.hashnode: true`
  if a Hashnode account exists) triggers `crosspost.yml` and produces
  platform posts whose `canonical_url` points at the github.io URL
- The platform URLs are written back into the post's frontmatter so a
  second push of the same post updates rather than duplicates
- Failure modes are handled: missing API key → workflow no-ops with a
  clear log line, not a hard failure

## Prerequisites the author needs to provide

- **dev.to API key** → repo secret `DEVTO_API_KEY`
- **Hashnode personal access token + publication ID** → repo secrets
  `HASHNODE_TOKEN`, `HASHNODE_PUBLICATION_ID` (skip if no Hashnode account)

Without those secrets the workflow runs but no-ops on the missing platform.

## What's deliberately not in this plan

(All deferred to future plans, not this one)

- **Custom domain `stepback.dev`** — author chose to defer the migration
- **RSS feed / `sitemap.xml` / GA4** — its own future plan; pieces are
  small and independent
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
