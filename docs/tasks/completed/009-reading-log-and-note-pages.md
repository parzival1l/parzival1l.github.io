---
id: 009
title: Rebuild the reading page as a log with note pages
status: done
created: 2026-11-01
plan: 2026-11-01-reading-notes
adrs: [adr-002]
depends_on: []
---

## Context

`/reading/` (`app/reading/page.tsx`, `components/reading-feed.tsx`) is a
three-column feed: a pinned rail, a feed of cards, and a collapsed filter
rail. The author's thought sits in small italic above a bold source card,
so the two compete. A thought cannot exist without a link, and adding an
entry needs five required fields.

The agreed design is Option A, "Log", in Paper (file `Personal-Blog`, page
`Reading-Page`): the artboards "A · Log — Desktop/Phone" and
"A · Note detail — Desktop/Phone". Read them with the Paper MCP
(`get_jsx`, `get_computed_styles`) for exact values. Plan:
`docs/plans/2026-11-01-reading-notes.md`.

## Acceptance criteria

- [x] `/reading/` is one column at the header width (`max-w-3xl`), with no
      side rails.
- [x] Entries are grouped under month headings, newest first. Desktop
      shows the date in a 64px left gutter; phone puts it in the meta line.
- [x] Type tabs with counts sit above the log (`All · Notes · Articles ·
      Papers · Videos · Repos`), plus search. Counts and search cover every
      entry, not only the visible ones.
- [x] The log renders the 20 newest entries, then "Show older entries"
      with "N of M shown".
- [x] One hierarchy rule: the author's words are the large dark text. The
      source is a smaller citation under a thin grey left rule. An entry
      with no thought shows title plus grey summary.
- [x] A short entry lives in `content/reading.yaml`. Only `date` plus
      either `url` or `note` is required. `type` is inferred from the URL
      when absent (arxiv → paper, youtube → video, github → repo,
      x.com/twitter.com → tweet, else article). An entry with no `url` is
      a Note.
- [x] A long entry lives in `content/reading/<slug>.mdx`. Frontmatter
      holds `url`, `date`, `tags` and optional `summary`/`archive`; the
      body is the note.
- [x] In the log, an `.mdx` entry shows its first paragraph, then
      "Read the full note →" with the reading time.
- [x] `/reading/<slug>/` renders, top to bottom: "← Reading", meta line
      (date · reading time), the title, the source card, "My notes", the
      body, tags, then "← Older" on the left and "Newer →" on the right.
- [x] Title rule: `Notes on “<source title>”` with the curly quotes in the
      title. An `.mdx` note with no `url` must set `title`; a missing title
      fails the build with the file name in the error.
- [x] The source card holds type · domain, the summary, a filled
      "Read on <domain> ↗" button and an "Archived copy" link. It does not
      repeat the source title. Videos and tweets embed instead of the
      button.
- [x] `tags` is optional. Each tag links to `/reading/?tag=<tag>`, which
      filters the log and shows a "Clear" link.
- [x] No animation anywhere on these pages.
- [x] The existing "Building effective agents" thought moves to an `.mdx`
      note; the other entries stay in YAML.
- [x] `npm run build` passes and the static export contains every
      `/reading/<slug>/` page.

## Implementation notes

- Next.js here differs from older versions. Read
  `node_modules/next/dist/docs/` before writing route code.
- Detail pages need `generateStaticParams`, because the site is a static
  export.
- Truncation uses the first paragraph of the body, not a CSS line clamp.
  The author controls the cut, and no client-side measuring is needed.
- `?tag=` filtering runs on the client against the full list, which ships
  in the HTML. Wrap `useSearchParams` in `Suspense` for the static export.
- Keep the build-time validation style of `lib/reading.ts`: a bad entry
  throws with the entry number or file name.
- Update the comments in `components/contact-section.tsx` and
  `components/social-icons.tsx` that point at icon styles in
  `reading-feed.tsx`.
- Update the `content/reading.yaml` header comment and the reading
  bullets in the root `CLAUDE.md`.

## Out of scope

- Generating tags automatically (task 010).
- URL pagination or year archive pages.
- RSS for reading notes (deferred with task 007).
- Any change to the homepage.

## Outcome (2026-11-01)

Shipped as specified, with three deliberate differences from the Paper
mock:

- Both H1s use the site-wide `text-2xl font-medium` instead of the mock's
  28px and 34px semibold, so Reading matches Blog, Projects and blog posts.
- An `.mdx` note always sets `title`. With a `url` it is the source title
  (the page shows `Notes on “<title>”`); without one it is the note's own
  title. One field, one meaning, in YAML and MDX alike.
- YouTube links embed in the source card. Tweets keep the button, because
  an embedded tweet needs X's script on the page.

`?tag=` is read from `window.location` after hydration, not with
`useSearchParams`, so the log's entries stay in the prerendered HTML.

