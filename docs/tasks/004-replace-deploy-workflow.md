---
id: 004
title: Replace deploy workflow
status: todo
created: 2026-05-01
plan: 2026-05-01-blog-platform-rebuild
adrs: [adr-002, adr-003]
depends_on: [003]
---

## Context

The current deploy workflow at `.github/workflows/pages-deploy.yml` uses
GitHub's Jekyll builder. It needs to be replaced with a Next.js
build+deploy workflow that runs on push to `main`.

This is the cutover task: when this lands, `parzival1l.github.io` stops
serving the Chirpy site and starts serving the Next.js site. All previous
tasks (001–003) happen on a feature branch with the live site untouched;
this task merges the branch and switches the deploy.

## Acceptance criteria

- [ ] `.github/workflows/pages-deploy.yml` replaced with a Next.js
      workflow (suggested rename to `deploy.yml` for clarity, but not
      required)
- [ ] Workflow triggers on push to `main` and on `workflow_dispatch`
- [ ] Workflow has two jobs: `build` and `deploy`
- [ ] Build job:
  - [ ] `actions/checkout@v4`
  - [ ] `actions/setup-node@v4` with Node 20.x or 22.x and npm cache
  - [ ] `npm ci` to install deps
  - [ ] `npm run build` to produce `out/`
  - [ ] `touch out/.nojekyll` to disable Pages re-processing
  - [ ] `actions/configure-pages@v5`
  - [ ] `actions/upload-pages-artifact@v3` with `path: ./out`
- [ ] Deploy job:
  - [ ] `needs: build`
  - [ ] `actions/deploy-pages@v4`
  - [ ] Correct `permissions` block (`pages: write`, `id-token: write`)
  - [ ] Correct `environment: github-pages` config
- [ ] Repo Settings → Pages source set to **GitHub Actions** (not "Deploy
      from a branch")
- [ ] Feature branch merged to `main`
- [ ] Workflow runs successfully on the merge commit
- [ ] `https://parzival1l.github.io/` serves the new Next.js site
- [ ] Each ported post is reachable at `/blog/<slug>/`
- [ ] 404 page renders the custom not-found content for an unknown URL

## Implementation notes

### Suggested workflow file

```yaml
name: Deploy site

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: touch out/.nojekyll
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Repo settings change required

The current Pages source is "Deploy from a branch" (Jekyll default). This
must be flipped to "GitHub Actions" in:

```
Settings → Pages → Build and deployment → Source: GitHub Actions
```

This is a manual step in the GitHub UI; document it in the PR description
so it isn't missed.

### Branch + merge workflow

1. Branch state: tasks 001–003 all complete, app builds and looks right
   locally
2. Replace the workflow file in the same branch (this task)
3. Push branch, open PR
4. Manually flip the Pages source to "GitHub Actions" in Settings (do this
   *before* merging, otherwise the first deploy on `main` may fail)
5. Merge PR
6. Watch the Action run; verify the new site at `parzival1l.github.io`

### Don't:
- Don't add the `CNAME` file or any `stepback.dev` config in this task —
  custom domain is a later plan.
- Don't delete `Gemfile`, `_config.yml`, `_posts/`, etc. yet — that's a
  later plan. They simply stop being used; the new build ignores them.
- Don't skip the `touch out/.nojekyll` step — without it, Pages may try to
  process the export as a Jekyll site and break.

### Rollback plan

If the deploy fails or the new site is broken in a way that can't be
patched in <10 minutes:

1. Revert the merge commit
2. The previous `pages-deploy.yml` (Jekyll) takes over again
3. Site returns to Chirpy state

The old workflow file can be saved off as `pages-deploy.yml.bak` in the
same commit if extra safety is desired.

## Out of scope

- Custom domain `stepback.dev` (later plan)
- Cross-posting workflow `crosspost.yml` (later plan)
- Removing Chirpy artifacts (later plan)
- GA4 integration (later plan)
- RSS feed
- Sitemap generation

## When done

1. Set frontmatter `status: done`
2. `git mv docs/tasks/004-replace-deploy-workflow.md docs/tasks/completed/`
3. Update the index table in `docs/tasks/CLAUDE.md`
4. Flip the plan `2026-05-01-blog-platform-rebuild.md` to
   `status: completed`
5. Write the next plan covering: custom domain, cross-posting, Jekyll
   cleanup, GA4
