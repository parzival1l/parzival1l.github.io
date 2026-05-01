---
id: 003
title: Build layout and theme (Lee-style)
status: todo
created: 2026-05-01
plan: 2026-05-01-blog-platform-rebuild
adrs: [adr-006]
depends_on: [002]
---

## Context

ADR-006 settled the visual design: minimalist editorial layout inspired by
leehanchung.github.io. This task implements the site shell — header, footer,
post layout, page layout, custom 404 — and applies typography across the
existing four posts ported in task 002.

Reference: https://leehanchung.github.io/ — narrow column, serif body,
restrained color, no sidebar, minimal nav.

The header nav structure for this site is:
**Blogs · Publications · Projects · About**
(differs from Lee's `Talks` → renamed to `Projects` per ADR-006).

## Acceptance criteria

- [ ] `components/site-header.tsx` — site name + nav (Blogs / Publications /
      Projects / About). Active link highlighted subtly.
- [ ] `components/site-footer.tsx` — bio paragraph, social links (GitHub,
      LinkedIn, Twitter, RSS placeholder), email (with `[at]`/`[dot]`
      obfuscation like Lee's footer).
- [ ] `components/post-layout.tsx` — narrow column (~max-w-prose, roughly
      700px), serif body, generous line-height, frontmatter title +
      formatted date at top.
- [ ] `components/page-layout.tsx` — for static pages (About, Projects,
      Publications). Same column width as posts.
- [ ] `components/post-card.tsx` — homepage list entry: date · category ·
      title · short excerpt.
- [ ] Homepage (`app/page.tsx`):
  - [ ] Short hero: name + 1–2 sentence bio
  - [ ] Optional pinned/featured slot (placeholder is fine for now)
  - [ ] "Recent posts" — list of post cards, most recent first
  - [ ] "See all" link → `/blog/`
- [ ] Blogs index (`app/blog/page.tsx`) — full list of posts, paginated or
      not (4 posts; pagination can be deferred)
- [ ] Static pages stubbed:
  - [ ] `app/about/page.tsx` — placeholder bio content
  - [ ] `app/projects/page.tsx` — placeholder
  - [ ] `app/publications/page.tsx` — placeholder
- [ ] Custom 404 (`app/not-found.tsx`) — image + simple message. Use a
      placeholder image at `public/images/404.png`; the actual image
      choice is the author's call (a placeholder PNG file is acceptable).
- [ ] Typography:
  - [ ] Body uses a serif stack (system serif acceptable: `ui-serif,
        Georgia, ...`). Document the choice in `app/globals.css`.
  - [ ] Headings, dates, and nav use the same family for unity (or a
        complementary sans for nav — designer's discretion).
  - [ ] Consistent vertical rhythm; no rogue margins.
- [ ] Single accent color defined as a Tailwind theme token, used sparingly
      (links, hover, optional rule).
- [ ] All four ported posts render correctly through the new post layout.
- [ ] No sidebar, no search bar, no theme toggle, no related-posts widget.
- [ ] `npm run build` produces a static export with all routes
      (`/`, `/blog/`, `/blog/<slug>/`, `/about/`, `/projects/`,
      `/publications/`, `/404.html`).

## Implementation notes

### Layout component composition

```
app/layout.tsx
  └── <SiteHeader />
  └── <main> { children } </main>
  └── <SiteFooter />
```

Routes wrap `children` with the appropriate `<PostLayout>` or `<PageLayout>`.

### Tailwind theme suggestions

```ts
// tailwind.config.ts (excerpt)
theme: {
  extend: {
    fontFamily: {
      serif: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
    },
    colors: {
      accent: '#2D5BFF', // pick one; restrained use
    },
    typography: { /* tweak prose for narrower line-length */ },
  },
}
```

Use the `@tailwindcss/typography` plugin for post body styling — gives
sensible defaults for `prose` class that we can override sparingly.

### Header active state

Use Next.js `usePathname()` (Client Component) to highlight the active nav
link. The header itself is a Client Component because of this; the footer
can stay a Server Component.

### Footer obfuscation pattern

Lee uses `lee [dot] hanchung [at] gmail [dot] com`. This is a soft
anti-scraper measure. Match the convention.

### Custom 404

`app/not-found.tsx` (App Router special file). Render image + message.
Don't include a nav fallback or "popular pages" section — Lee's 404 has
intentionally nothing useful, and that's the joke.

### Reference observations from leehanchung.github.io

- Site name is bold, in serif, top-left
- Nav is right-aligned text links, no buttons
- Hero on home: small avatar + "Hi! I am ..." paragraph
- Post titles in serif, date subtle below
- Footer has 3 columns: site name + email | social links | description

## Out of scope

- Real content for About / Projects / Publications pages (those get filled
  in over time; placeholders are fine here)
- RSS feed (later plan)
- GA4 (later plan)
- Search functionality
- Comments (Giscus etc.)
- Tag/category index pages
- Interactive components inside posts (deferred until a post needs one)
- Custom domain or CNAME (later plan)
- Deploy workflow changes (task 004)

## When done

1. Set frontmatter `status: done`
2. `git mv docs/tasks/003-build-layout-and-theme.md docs/tasks/completed/`
3. Update the index table in `docs/tasks/CLAUDE.md`
4. Pick up task 004
