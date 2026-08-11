# parzival1l.github.io

Personal technical blog of Nanda Kumar — notes on AI engineering: agentic
systems, context engineering, and model fundamentals.

Stack: Next.js (static export), TypeScript, Tailwind CSS, MDX. GitHub Actions
builds the site and deploys it to GitHub Pages on every push to `main`.

## Commands

| Command | Purpose |
|---|---|
| `npm ci` | Install dependencies from the lockfile |
| `npm run dev` | Start the local dev server |
| `npm run build` | Build the static export into `out/` |

## Layout

- `content/posts/*.mdx` — posts, the source of truth. Frontmatter shape is
  `PostFrontmatter` in `lib/posts.ts`.
- `content/reading.yaml` — reading list entries. Schema is `ReadingEntry` in
  `lib/reading.ts`.
- `app/` — routes: home, blog, reading, publications, projects, about.
- `components/` — UI: site chrome, post layout, TOC, footer.
- `lib/` — content loading and formatting.
- `public/` — static assets.
- `docs/` — architecture, ADRs, plans, tasks. Start at `docs/CLAUDE.md`.
- `.github/workflows/deploy.yml` — build and deploy pipeline.

## Writing a post

1. Add `content/posts/<slug>.mdx` with frontmatter: `title`, `date`,
   `categories`, `description`. Set `draft: true` to hide it from listings.
2. Push to `main`. The deploy workflow publishes it in about a minute.

## Footer behavior

- Homepage: full contact and links block (`components/contact-section.tsx`).
- Every page: minimal footer with the local-time clock and keycap shortcuts.
- The same contact block also renders on the About page.

## License

MIT. See `LICENSE`.
