# parzival1l.github.io

Personal technical blog for AI engineering content. Hosted on GitHub Pages,
moving to the custom domain `stepback.dev`. Source of truth for posts is
markdown in this repo.

## Current state (2026-05-01)

The repo is mid-rebuild. The **live site** still runs Jekyll/Chirpy (you'll
see `_config.yml`, `_posts/`, `Gemfile`, `_tabs/`, `index.html` in the
root — those serve the current production site).

The **target state** is a Next.js + TypeScript + MDX app, statically exported
to GitHub Pages, in a Lee Hanchung-inspired minimalist editorial layout. See
`docs/architecture.md` for the full target architecture.

If you're a fresh agent landing here to do work, **start with
`docs/CLAUDE.md`**. It explains the docs structure and gets you to the
active plan and tasks.

## Where to look first

| If you want to... | Read |
|---|---|
| Understand what this project is | `docs/architecture.md` |
| Understand why decisions were made | `docs/adr/` (ADR-001 through ADR-007) |
| Find what work to do next | `docs/plans/` (the file with `status: active`) |
| Execute a specific task | `docs/tasks/NNN-*.md` referenced by the active plan |

## Repo conventions

- **Posts** currently live in `_posts/` (Jekyll). After the migration, they
  move to `content/posts/*.mdx` per ADR-002.
- **Documentation** lives under `docs/` and follows the agentic-dev structure
  defined in ADR-001. Use CLAUDE.md (not README.md) for folder navigation.
- **ADRs are immutable** once accepted. To change a decision, write a new
  ADR that supersedes the old one and `git mv` the old file to
  `docs/adr/superseded/`.
- **Tasks** are detailed enough to be executed without reading the plan.
  Plans are short coordination documents covering 3–4 tasks.
- **Completed tasks** move to `docs/tasks/completed/`. Their IDs are never
  reused.

## Active work

Active plan: **`docs/plans/2026-05-01-blog-platform-rebuild.md`** —
covers tasks 001–004 (scaffold Next.js, port posts, build layout, replace
deploy workflow). End state: `parzival1l.github.io` serves the new Next.js
site with all four existing posts.

The custom domain (`stepback.dev`), cross-posting workflow, and Jekyll
cleanup are deliberately deferred to a follow-up plan.

## Hosting and deploy

- Deploy: GitHub Actions → GitHub Pages (see ADR-003)
- Current workflow: `.github/workflows/pages-deploy.yml` (Jekyll builder)
- Future workflow: `.github/workflows/deploy.yml` (Next.js, see task 004)
- Domain after migration: `stepback.dev` (see ADR-004)

## Don't

- Don't edit existing ADRs in place — supersede them.
- Don't delete Chirpy artifacts (`_config.yml`, `_posts/`, `_tabs/`,
  `Gemfile`, `index.html`) until the cleanup task in a later plan. The new
  build will simply ignore them; deleting prematurely risks breaking the
  current live site if a rollback is needed.
- Don't add a `CNAME` file or `stepback.dev` config until the dedicated
  task in a later plan — domain cutover is its own coordinated step.
