---
id: 002
title: Port existing posts to MDX
status: done
created: 2026-05-01
plan: 2026-05-01-blog-platform-rebuild
adrs: [adr-002, adr-005]
depends_on: [001]
---

## Context

Four posts currently live in `_posts/` as Chirpy-style markdown. This task
moves them to `content/posts/*.mdx` with frontmatter conformant to the new
schema (ADR-005), and wires up the route + rendering pipeline so they're
accessible in the Next.js app.

The four posts:

```
_posts/2024-09-19-What_I_thought_I_knew.md
_posts/2025-01-08-2025_Year_Ahead.md
_posts/2025-11-09-Whats_Next_Plans_And_Explorations.md
_posts/2026-04-22-threadhop-ai-tinkerers.md
```

Original Chirpy frontmatter typically uses `categories`, `tags`, `pin`. The
new schema keeps `categories` and `tags`, drops `pin` (handle "featured" via
explicit homepage component later), adds optional `syndicate` block.

## Acceptance criteria

- [ ] `content/posts/` directory exists with four MDX files, one per source
      post
- [ ] Filenames are kebab-case slugs without dates:
  - `what-i-thought-i-knew.mdx`
  - `2025-year-ahead.mdx`
  - `whats-next-plans-and-explorations.mdx`
  - `threadhop-ai-tinkerers.mdx`
- [ ] Each MDX file has frontmatter with at minimum: `title`, `date`,
      `categories`, `tags`. The original date from the filename moves into
      the `date` field.
- [ ] `lib/posts.ts` (or similar) exports helpers:
  - `getAllPosts()` → list with frontmatter + slug
  - `getPostBySlug(slug)` → frontmatter + MDX source
- [ ] Dynamic route at `app/blog/[slug]/page.tsx` renders a single post
      (title + date + body). Styling can be minimal placeholder; task 003
      handles real layout.
- [ ] Static params generated via `generateStaticParams()` so all four
      posts are pre-rendered in the static export
- [ ] Visiting `localhost:3000/blog/<slug>/` for each post renders the
      content with frontmatter title at top
- [ ] `npm run build` produces `out/blog/<slug>/index.html` for each post
- [ ] Original `_posts/*.md` files remain untouched (cleanup is a later
      plan)

## Implementation notes

### Frontmatter schema (target)

```yaml
---
title: What I Thought I Knew
date: 2024-09-19
categories: [Reflections]
tags: [career]
description: Optional short summary for cards and meta tags
syndicate:           # omit unless syndication is desired
  devto: false
  hashnode: false
---
```

The `syndicate` block is intentionally optional — none of the four legacy
posts need cross-posting (they're already published). Leave it omitted.

### Suggested `lib/posts.ts` shape

```ts
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

export interface PostFrontmatter {
  title: string
  date: string
  categories?: string[]
  tags?: string[]
  description?: string
}

export interface Post {
  slug: string
  frontmatter: PostFrontmatter
  content: string
}

const POSTS_DIR = path.join(process.cwd(), 'content/posts')

export function getAllPosts(): Post[] { /* read dir, parse, sort by date desc */ }
export function getPostBySlug(slug: string): Post | null { /* ... */ }
```

### Dynamic route shape

`app/blog/[slug]/page.tsx`:
```tsx
import { getAllPosts, getPostBySlug } from '@/lib/posts'

export function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug)
  if (!post) return null
  // render frontmatter + MDX content
}
```

For MDX rendering with `@next/mdx`, the cleanest pattern is to use
`next-mdx-remote` (or compile via `@mdx-js/mdx` directly) inside the route.
Choose whichever the agent finds simplest and document the choice in a code
comment.

### Body conversion

Chirpy uses a few extensions (mermaid blocks, math, image attribution
syntax). For the four legacy posts:

1. Read each post body.
2. Strip Chirpy-specific shortcodes (`{% include … %}`) — replace with plain
   markdown or remove if cosmetic.
3. Image paths: Chirpy expected `/assets/img/...`; for now leave images
   pointing at the same paths and copy any referenced image files into
   `public/` later if needed (or note as a follow-up).

### URL pattern decision

Use `/blog/<slug>/` for now (clean, modern). The `app/blog/[slug]/page.tsx`
route gives us this. Date-pathed URLs (`/blog/2024/09/19/<slug>/`) can be
adopted later by changing the route structure if desired — that's not in
scope here.

## Out of scope

- Layout, typography, header, footer (task 003)
- Featured/pinned post handling on the homepage (task 003)
- Categories or tags index pages
- RSS feed
- Image optimization or migration of legacy `/assets/img/` references
  (defer until layout work in task 003 — capture as note if a post fails to
  render due to a missing image)
- Cross-posting (later plan)
- Removing original `_posts/*.md` files (later plan)

## When done

1. Set frontmatter `status: done`
2. `git mv docs/tasks/002-port-existing-posts.md docs/tasks/completed/`
3. Update the index table in `docs/tasks/CLAUDE.md`
4. Pick up task 003
