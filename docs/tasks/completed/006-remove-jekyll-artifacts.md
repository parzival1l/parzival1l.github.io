---
id: 006
title: Remove Jekyll artifacts
status: done
created: 2026-05-01
plan: 2026-05-01-cleanup-and-syndication
adrs: [adr-002]
depends_on: []
---

## Context

Phase 1 (plan `2026-05-01-blog-platform-rebuild.md`) cut the live site over
to the Next.js + MDX build. The Chirpy/Jekyll source files are still in the
repo but unused — they were intentionally left in place during phase 1 so
that a quick `git revert` of the phase-1 merge would restore the old site
if anything went wrong. The rollback window has now passed; the new site
is stable.

This task removes the dead weight. Final repo is Next.js-only with no
trace of the Jekyll toolchain.

## Acceptance criteria

- [ ] `git rm` removes all of these (existence verified before delete):
  - `_config.yml`
  - `_posts/` (directory and all contents)
  - `_tabs/`
  - `_data/`
  - `_plugins/`
  - `Gemfile`
  - `index.html` (the Chirpy entry HTML at the repo root — the Next.js
    homepage lives at `app/page.tsx` and is unrelated)
  - `.gitmodules` (Chirpy starter referenced an `assets` submodule)
  - The legacy `assets/` tree (the lone post image was already migrated
    to `public/images/posts/2025-01-08/aliabdaalframework.png` in task 002;
    `assets/` should contain no still-referenced files)
- [ ] `.gitignore` has these Jekyll-specific lines removed:
  - `# Bundler cache` block: `.bundle`, `vendor`, `Gemfile.lock`
  - `# Jekyll cache` block: `.jekyll-cache`, `.jekyll-metadata`, `_site`
  - `# RubyGems`: `*.gem`
  - `# Misc`: `_sass/dist`, `assets/js/dist`
- [ ] `npm run build` still passes — same 12 routes prerendered as before
- [ ] Live site at `parzival1l.github.io` still renders correctly after
      the cleanup commit deploys (spot-check homepage, one post, 404)
- [ ] No grep hits for `jekyll`, `chirpy`, `Gemfile`, `_posts/`,
      `_config.yml` anywhere in the repo (excluding `docs/` which retains
      historical references in ADRs and prior task files — those are
      legitimate audit trail)

## Implementation notes

### Pre-flight check before deleting anything

```bash
# Confirm the legacy assets/ tree has no still-referenced files
grep -r "/assets/" --include="*.mdx" content/
grep -r "/assets/" --include="*.tsx" app/ components/
# Both should return nothing. The 2025-year-ahead post was migrated to
# /images/posts/... in task 002.
```

If either returns hits, port the referenced file into `public/` before
deleting `assets/`.

### Deletion sequence

```bash
git rm -r _config.yml _posts/ _tabs/ _data/ _plugins/ Gemfile \
         index.html .gitmodules assets/
```

### `.gitignore` update

Open `.gitignore` and remove the Jekyll-specific blocks. After the edit,
the file should contain only Next.js-relevant entries plus the existing
Playwright-screenshot ignores. The relevant trimmed sections:

```
# Remove these blocks entirely:
# Bundler cache
.bundle
vendor
Gemfile.lock

# Jekyll cache
.jekyll-cache
.jekyll-metadata
_site

# RubyGems
*.gem
```

And the `_sass/dist`, `assets/js/dist` lines under `# Misc`.

### Verification

```bash
rm -rf .next out
npm run build               # must pass with same route table as before
npx serve out -l 5000       # spot-check homepage and a post page
```

### `.github/workflows/pages-deploy.yml` is already gone

Task 004 deleted the legacy workflow. No action needed in `.github/`.

### Don't touch

- The `.nojekyll` file at the repo root, if any — it's harmless and gets
  re-created in `out/` by the deploy workflow regardless.
- `README.md` — leave the existing content. A future plan may rewrite it
  but this task doesn't.

## Out of scope

- Custom domain migration (task 005 — independent; can ship before
  or after this one)
- RSS feed / `sitemap.xml` / GA4 (its own future plan, ID 007)
- Cross-posting workflow (task 008)
- Updating `README.md` (separate concern; not blocking anything)

## When done

1. Set frontmatter `status: done`
2. `git mv docs/tasks/006-remove-jekyll-artifacts.md docs/tasks/completed/`
3. Update the index in `docs/tasks/CLAUDE.md`:
   - remove the row from the active table (or mark "no active tasks" if
     008 is also done)
   - add a row under "Recently completed"
4. If task 008 is also done, flip the plan
   `2026-05-01-cleanup-and-syndication.md` to `status: completed` and
   write the next plan covering custom domain and RSS+sitemap+GA4
