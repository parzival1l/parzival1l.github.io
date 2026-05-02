---
id: 001
title: Scaffold Next.js app
status: done
created: 2026-05-01
plan: 2026-05-01-blog-platform-rebuild
adrs: [adr-002, adr-003]
depends_on: []
---

## Context

The repo currently runs Jekyll/Chirpy. ADR-002 decided to migrate to Next.js
+ TypeScript + Tailwind + MDX, statically exported to GitHub Pages
(ADR-003). This task creates the project scaffolding so subsequent tasks
have a working app to build on.

No content, no styling, no layouts yet — just a Next.js project that builds
and serves a placeholder page locally and produces a static export under
`out/` when built.

All work happens on a feature branch (suggested name: `nextjs-migration`).
The live `main` branch keeps serving the Chirpy site until task 004 cuts
over the deploy.

## Acceptance criteria

- [ ] Branch `nextjs-migration` created off `main`
- [ ] `package.json` with Next.js, React, TypeScript, Tailwind, MDX deps
- [ ] `next.config.mjs` configured for static export:
  - `output: 'export'`
  - `images: { unoptimized: true }`
  - `trailingSlash: true`
  - MDX page extensions registered
- [ ] `tsconfig.json` with sensible defaults (strict mode on)
- [ ] `tailwind.config.ts` and `postcss.config.mjs` configured
- [ ] `app/layout.tsx` with global styles import
- [ ] `app/page.tsx` rendering a simple placeholder ("Hello, blog")
- [ ] `app/globals.css` with Tailwind directives
- [ ] `.gitignore` updated (add `node_modules`, `.next`, `out`, `.env.local`)
- [ ] `npm install` succeeds
- [ ] `npm run dev` serves the placeholder at `localhost:3000`
- [ ] `npm run build` succeeds and produces `out/` with `index.html`
- [ ] No errors in dev console; TypeScript strict mode passes

## Implementation notes

### Recommended versions (as of 2026-05)
- Next.js: latest 15.x (App Router stable)
- React: 19.x (matches Next 15)
- TypeScript: 5.x
- Tailwind: 4.x
- `@next/mdx`: matching Next major version
- `gray-matter`: 4.x (for frontmatter parsing in later tasks)

### Suggested directory layout (final state, not all populated yet)

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/             # added in task 003
├── content/posts/          # added in task 002
├── lib/                    # mdx + frontmatter helpers (task 002)
├── public/                 # static assets, CNAME (later plan)
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── package.json
└── .gitignore
```

### Key config snippets

`next.config.mjs`:
```js
import createMDX from '@next/mdx'

const withMDX = createMDX({
  extension: /\.mdx?$/,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
}

export default withMDX(nextConfig)
```

### Don't:
- Don't delete any Chirpy files yet (`_config.yml`, `_posts/`, `Gemfile`,
  `index.html`, etc.). Cleanup happens in a later plan.
- Don't touch `.github/workflows/pages-deploy.yml` yet — that's task 004.
- Don't add a CNAME or change any URL/domain settings — that's a later plan.

### Verifying the build output

After `npm run build`, the `out/` directory should contain:
- `index.html` (rendered from `app/page.tsx`)
- `_next/` static assets

This `out/` directory is what the deploy workflow will eventually publish to
GitHub Pages.

## Out of scope

- Porting any blog posts (task 002)
- Designing the layout, header, footer, or 404 page (task 003)
- Modifying the deploy workflow (task 004)
- Custom domain setup (later plan)
- Cross-posting workflow (later plan)
- GA4 integration (later plan)
- Removing Chirpy artifacts (later plan)

## When done

1. Set frontmatter `status: done`
2. `git mv docs/tasks/001-scaffold-nextjs-app.md docs/tasks/completed/`
3. Update the index table in `docs/tasks/CLAUDE.md`
4. Pick up task 002
