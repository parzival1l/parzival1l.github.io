---
id: 008
title: Cross-posting workflow
status: todo
created: 2026-05-01
plan: 2026-05-01-cleanup-and-syndication
adrs: [adr-005]
depends_on: []
---

## Context

ADR-005 commits to **markdown-first content with selective syndication**:
the canonical post lives in this repo at `content/posts/<slug>.mdx`, and a
GitHub Actions workflow reads opt-in `syndicate.*` flags from the
frontmatter and republishes the post to dev.to and Hashnode with
`canonical_url` set back to the canonical site. Both platforms respect the
canonical link for SEO so we don't fragment search authority.

This task wires up that workflow end-to-end. The canonical URL stays at
`https://parzival1l.github.io` for now — when the custom domain
(`stepback.dev`) lands in a future plan, a one-time migration will need to
rewrite already-published platform posts; that migration is out of scope
here.

## Acceptance criteria

- [ ] `.github/workflows/crosspost.yml` exists and:
  - [ ] Triggers after `Deploy site` succeeds on `main` (via
        `workflow_run`), and on `workflow_dispatch` for manual reruns
  - [ ] Has `permissions: contents: write` so it can commit frontmatter
        updates back to `main`
  - [ ] Skips silently (logs a clear "no API key for X — skipping" line
        and exits 0) when a platform's secret is missing
- [ ] `scripts/crosspost.mjs` exists and:
  - [ ] Reads every `content/posts/*.mdx`
  - [ ] For each post where `syndicate.devto === true` and
        `syndicate.devto_url` is empty: POSTs to dev.to API with
        `canonical_url` set, `published: true`
  - [ ] For each post where `syndicate.hashnode === true` and
        `syndicate.hashnode_url` is empty: publishes via Hashnode GraphQL
        with `originalArticleURL` set
  - [ ] On success, writes the platform URL back into the post's
        frontmatter (`syndicate.devto_url` / `syndicate.hashnode_url`)
        and commits the change to `main` (single commit per run, even if
        multiple posts cross-posted)
  - [ ] On API error for a single post, logs the error and continues —
        does not abort the whole run
  - [ ] Idempotent: a re-run after a successful publish is a no-op for
        already-syndicated posts
- [ ] A test post with `syndicate.devto: true` triggers the workflow on
      next deploy and produces a dev.to article whose canonical link
      points at the github.io URL; same for Hashnode if a token is
      configured
- [ ] `actions/deploy-pages` in `.github/workflows/deploy.yml` is bumped
      to whichever major supports Node 24 (current `@v4` runs on Node 20,
      deprecated 2026-06-02). Acceptable alternative: add
      `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` to the deploy job env
      until the action ships native Node 24 support.

## Implementation notes

### Frontmatter shape

Per ADR-005 / `docs/architecture.md`, the syndicate block is optional and
opt-in per platform. Posts without a `syndicate` block are never
cross-posted.

```yaml
---
title: Example
date: 2026-05-15
categories: [Good Patterns]
tags: [python]
syndicate:
  devto: true        # opt-in per platform
  hashnode: true
  # filled in by crosspost.yml on first successful publish:
  devto_url:
  hashnode_url:
---
```

### Why a Node script and not pure shell

The workflow could shell out to `curl | jq` for dev.to, but Hashnode is
GraphQL and writing back YAML frontmatter from shell is fragile. A small
Node script with `gray-matter` (already a dependency from task 002) keeps
the read/transform/write loop boring and testable.

### Workflow file shape

`.github/workflows/crosspost.yml`:

```yaml
name: Cross-post to platforms

on:
  workflow_run:
    workflows: ["Deploy site"]
    types: [completed]
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: crosspost
  cancel-in-progress: false

jobs:
  crosspost:
    # Only run if the deploy actually succeeded
    if: ${{ github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          # We commit back to main; need a token with write access.
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Cross-post
        env:
          DEVTO_API_KEY: ${{ secrets.DEVTO_API_KEY }}
          HASHNODE_TOKEN: ${{ secrets.HASHNODE_TOKEN }}
          HASHNODE_PUBLICATION_ID: ${{ secrets.HASHNODE_PUBLICATION_ID }}
          CANONICAL_BASE_URL: https://parzival1l.github.io
        run: node scripts/crosspost.mjs

      - name: Commit frontmatter updates
        run: |
          if [ -n "$(git status --porcelain content/posts/)" ]; then
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git add content/posts/
            git commit -m "chore(crosspost): update syndication URLs"
            git push
          else
            echo "No frontmatter changes to commit."
          fi
```

### `scripts/crosspost.mjs` skeleton

```js
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const POSTS_DIR = path.join(process.cwd(), 'content/posts')
const BASE = process.env.CANONICAL_BASE_URL ?? 'https://parzival1l.github.io'

async function postToDevto({ title, body, canonical, tags }) {
  const res = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: {
      'api-key': process.env.DEVTO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      article: {
        title,
        body_markdown: body,
        canonical_url: canonical,
        tags: tags?.slice(0, 4) ?? [],   // dev.to: max 4 tags
        published: true,
      },
    }),
  })
  if (!res.ok) throw new Error(`dev.to ${res.status}: ${await res.text()}`)
  return (await res.json()).url
}

async function postToHashnode({ title, body, canonical, tags }) {
  const query = `mutation Publish($input: PublishPostInput!) {
    publishPost(input: $input) { post { url } }
  }`
  const res = await fetch('https://gql.hashnode.com/', {
    method: 'POST',
    headers: {
      authorization: process.env.HASHNODE_TOKEN,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        input: {
          title,
          contentMarkdown: body,
          publicationId: process.env.HASHNODE_PUBLICATION_ID,
          originalArticleURL: canonical,
          tags: (tags ?? []).map(slug => ({ slug, name: slug })),
        },
      },
    }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data.publishPost.post.url
}

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'))
for (const file of files) {
  const filePath = path.join(POSTS_DIR, file)
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = matter(raw)
  const fm = parsed.data
  const slug = file.replace(/\.mdx$/, '')
  const canonical = `${BASE}/blog/${slug}/`

  if (fm.draft) continue
  if (!fm.syndicate) continue

  let updated = false
  const updatedSyndicate = { ...fm.syndicate }

  // dev.to
  if (fm.syndicate.devto && !fm.syndicate.devto_url) {
    if (!process.env.DEVTO_API_KEY) {
      console.log(`[devto] no API key — skipping ${slug}`)
    } else {
      try {
        const url = await postToDevto({
          title: fm.title,
          body: parsed.content,
          canonical,
          tags: fm.tags,
        })
        updatedSyndicate.devto_url = url
        updated = true
        console.log(`[devto] ${slug} → ${url}`)
      } catch (err) {
        console.error(`[devto] failed for ${slug}: ${err.message}`)
      }
    }
  }

  // Hashnode (parallel structure)
  if (fm.syndicate.hashnode && !fm.syndicate.hashnode_url) {
    if (!process.env.HASHNODE_TOKEN || !process.env.HASHNODE_PUBLICATION_ID) {
      console.log(`[hashnode] no token — skipping ${slug}`)
    } else {
      try {
        const url = await postToHashnode({
          title: fm.title,
          body: parsed.content,
          canonical,
          tags: fm.tags,
        })
        updatedSyndicate.hashnode_url = url
        updated = true
        console.log(`[hashnode] ${slug} → ${url}`)
      } catch (err) {
        console.error(`[hashnode] failed for ${slug}: ${err.message}`)
      }
    }
  }

  if (updated) {
    const newRaw = matter.stringify(parsed.content, {
      ...fm,
      syndicate: updatedSyndicate,
    })
    fs.writeFileSync(filePath, newRaw)
  }
}
```

### MDX-vs-markdown caveat

Both dev.to and Hashnode accept markdown, not MDX. For now, the script
sends `parsed.content` as-is. Posts that contain JSX components (custom
React elements inline in the body) will syndicate with the literal JSX in
them, which won't render on the platforms — that's acceptable for now
because none of the four ported posts use JSX. When we add a post with
embedded interactive demos, the script should either skip syndication for
that post or strip JSX blocks. Track as a follow-up; not blocking 008.

### Tag handling

- dev.to: max 4 tags, lowercase, no spaces
- Hashnode: arbitrary tag slugs

The script passes `frontmatter.tags` straight through. If a post has more
than 4 tags, dev.to's API will 422. Either trim in the script (current
skeleton does `.slice(0, 4)`) or document the constraint and let it fail
visibly. Skeleton does the trim.

### Bumping `actions/deploy-pages`

The phase-1 deploy log warned that `@v4` runs on Node 20, deprecated
2026-06-02. While editing `.github/workflows/`, also edit
`.github/workflows/deploy.yml` to either:

- Bump `actions/deploy-pages@v4` to whichever major supports Node 24
  (check the action's releases page first), or
- Add `env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'` to the deploy
  job as a temporary opt-in.

The bump is a one-line change but easy to forget; calling it out here
because this task is the next time someone touches that workflow file.

### Testing strategy

1. Add `syndicate: { devto: true }` to one existing post (suggestion:
   `content/posts/threadhop-ai-tinkerers.mdx` — short, image-free, easy
   to inspect on dev.to)
2. Push to `main`
3. Watch the `Deploy site` workflow finish, then `Cross-post to platforms`
   workflow start
4. Verify the dev.to article at the URL the workflow logs
5. Confirm `content/posts/threadhop-ai-tinkerers.mdx` now has
   `syndicate.devto_url:` populated, committed by github-actions[bot]
6. Manually re-run the workflow with `workflow_dispatch` — the same post
   should be a no-op this time (idempotent)
7. Repeat for Hashnode if `HASHNODE_TOKEN` is configured

### Required repo secrets

Set in `Settings → Secrets and variables → Actions → Repository secrets`:

| Secret | Required for | Where to get it |
|---|---|---|
| `DEVTO_API_KEY` | dev.to syndication | https://dev.to/settings/extensions → "DEV Community API Keys" |
| `HASHNODE_TOKEN` | Hashnode syndication | https://hashnode.com/settings/developer → "Generate New Token" |
| `HASHNODE_PUBLICATION_ID` | Hashnode syndication | https://hashnode.com/settings/blogs → click your blog → URL contains the ID, or query the GraphQL API |

`GITHUB_TOKEN` is provided automatically by Actions; no action needed.

If a secret is missing, the corresponding platform branch no-ops with a
clear log line — the workflow exits 0. This means the workflow can be
merged before the secrets are set.

## Out of scope

- Custom domain `stepback.dev` (deferred from this plan)
- RSS feed / `sitemap.xml` / GA4 (its own future plan)
- Removing Jekyll artifacts (task 006)
- Cross-posting to Medium (rejected per ADR-005)
- Stripping JSX from MDX before syndicating (follow-up; no current post
  uses JSX)
- Migrating already-published platform posts when canonical URL changes
  to `stepback.dev` (handled in the future domain plan)

## When done

1. Set frontmatter `status: done`
2. `git mv docs/tasks/008-crosspost-workflow.md docs/tasks/completed/`
3. Update the index in `docs/tasks/CLAUDE.md`
4. If task 006 is also done, flip the plan
   `2026-05-01-cleanup-and-syndication.md` to `status: completed` and
   write the next plan covering custom domain and RSS+sitemap+GA4
