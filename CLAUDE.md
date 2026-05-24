# parzival1l.github.io

Personal technical blog for AI engineering content. Hosted on GitHub Pages,
moving to the custom domain `parzival.blog` (registered through Squarespace
Domains, see ADR-008). Source of truth for posts is markdown in this repo.

## Current state (2026-05-01)

**Phase 1 of the rebuild has shipped.** The live site at
`parzival1l.github.io` is now the Next.js + TypeScript + MDX app described in
`docs/architecture.md`, in a Lee Hanchung-inspired minimalist editorial
layout. Posts live in `content/posts/*.mdx`. Build and deploy run through
`.github/workflows/deploy.yml` on push to `main`.

The legacy Jekyll/Chirpy artifacts (`_config.yml`, `_posts/`, `_tabs/`,
`Gemfile`, `_plugins/`, `_data/`, `index.html`, the legacy `assets/` tree)
are still in the repo but unused — they sit untouched until the cleanup task
in the active phase-2 plan. They should be left alone for now so a quick
revert is possible.

If you're a fresh agent landing here to do work, **start with
`docs/CLAUDE.md`**. It explains the docs structure and gets you to the
active plan and tasks.

## Where to look first

| If you want to... | Read |
|---|---|
| Understand what this project is | `docs/architecture.md` |
| Understand why decisions were made | `docs/adr/` (ADR-001 through ADR-008; ADR-004 superseded by 008) |
| Find what work to do next | `docs/plans/` (the file with `status: active`) |
| Execute a specific task | `docs/tasks/NNN-*.md` referenced by the active plan |
| See what's been shipped | `docs/tasks/completed/` and plans with `status: completed` |

## Repo conventions

- **Posts** live in `content/posts/*.mdx` per ADR-002. Frontmatter shape is
  in `lib/posts.ts` (`PostFrontmatter`); see `docs/architecture.md` for the
  intended `syndicate.*` fields used by the cross-posting workflow.
- **Drafts** are MDX files with `draft: true` in frontmatter. They're
  filtered out of `getAllPosts()` (so the homepage and `/blog/` index hide
  them) but `generateStaticParams` includes them, so direct URLs resolve.
- **Documentation** lives under `docs/` and follows the agentic-dev structure
  defined in ADR-001. Use CLAUDE.md (not README.md) for folder navigation.
- **ADRs are immutable** once accepted. To change a decision, write a new
  ADR that supersedes the old one and `git mv` the old file to
  `docs/adr/superseded/`. Lifecycle details in `docs/adr/CLAUDE.md`.
- **Plans are immutable** once `status: completed`. Write a new dated plan
  for follow-up work. Lifecycle in `docs/plans/CLAUDE.md`.
- **Tasks** flip `status: todo` → `in-progress` → `done`, then get
  `git mv`'d to `docs/tasks/completed/`. IDs are never reused. Lifecycle
  and full rules in `docs/tasks/CLAUDE.md`.

## Active work

Active plan: **`docs/plans/2026-05-01-cleanup-and-syndication.md`** (phase
2) — covers tasks **005** (custom domain migration to `parzival.blog`,
per ADR-008), **006** (remove Jekyll artifacts), and **008**
(cross-posting workflow per ADR-005). ID 007 (RSS + sitemap + GA4) is
deliberately skipped and reserved — distribution surfaces are deferred
to a future plan. Task files for 005, 006, and 008 all exist as todo.

The original phase-2 plan
(`docs/plans/2026-05-01-domain-and-cleanup.md`, `status: superseded`)
bundled all four tasks; it was scoped down to defer the domain and
distribution work. The domain decision was later reversed (see ADR-008,
2026-05-24) and 005 brought back into scope; distribution surfaces (007)
remain deferred.

Phase 1 (`docs/plans/2026-05-01-blog-platform-rebuild.md`,
`status: completed`) covered tasks 001–004 — those task files are in
`docs/tasks/completed/`.

## Hosting and deploy

- Deploy: GitHub Actions → GitHub Pages (see ADR-003)
- Active workflow: **`.github/workflows/deploy.yml`** (`next build` → static
  export → `actions/deploy-pages@v4`)
- Pages source: should be set to **"GitHub Actions"** in
  `Settings → Pages → Build and deployment` to stop the redundant legacy
  branch-build from running on every push. (As of phase-1 ship the API
  still reports `build_type: legacy`, but the new artifact wins because it
  deploys after.)
- Domain after phase-2 cutover: `parzival.blog` (see ADR-008 and task 005)

## Don't

- Don't edit existing ADRs in place — supersede them.
- Don't delete Chirpy artifacts (`_config.yml`, `_posts/`, `_tabs/`,
  `_data/`, `_plugins/`, `Gemfile`, `index.html`, `.gitmodules`, the legacy
  `assets/` tree) outside of task 006 in the active plan. The new build
  ignores them; deleting prematurely complicates rollback.
- Don't add a `CNAME` file or `parzival.blog` config until task 005 in the
  active plan — domain cutover is its own coordinated step (DNS at
  Squarespace must resolve before the repo change lands).
- Don't add `package-lock.json` to `.gitignore`. The deploy workflow uses
  `npm ci`, which requires the lockfile to be committed.
