---
id: 003
title: GitHub Pages for hosting (over Vercel)
status: accepted
date: 2026-05-01
supersedes: []
superseded_by: []
---

## Context

A statically exported Next.js site can deploy to many hosts: GitHub Pages,
Vercel, Netlify, Cloudflare Pages, S3+CloudFront. The choice affects cost,
operational simplicity, and the discipline imposed on the frontend (e.g.,
SSR availability).

This is a personal blog with no real-time content requirements. Content
changes only when posts are pushed.

## Decision

Deploy the static export to GitHub Pages under the custom domain
`stepback.dev` (see ADR-004).

## Consequences

**Positive:**
- Zero cost with no usage-based billing surprises. GitHub Pages has a soft
  100 GB/month bandwidth cap; for a text-heavy technical blog at 10k monthly
  visitors that's roughly 5–10 GB used.
- Single ecosystem: repo, Actions, Pages, custom domain settings all in one
  place. Less context-switching than splitting across GitHub + Vercel.
- GitHub Pro (Student) provides private repos, unlimited Pages sites, and
  generous Actions minutes.
- No commercial-use restrictions if the blog grows or adds sponsors (Vercel
  Hobby prohibits commercial use; Pro introduces usage-based billing).
- Forces static-only discipline — eliminates a class of scaling concerns
  (cold starts, function limits, compute costs).

**Negative:**
- No SSR. Next.js must use `output: 'export'`. Some Next.js features (image
  optimization, ISR, server actions) are unavailable.
- New posts aren't instant — they require a rebuild (~1–2 minutes via
  Actions). Acceptable for a blog; would be unacceptable for a CMS-backed
  product.
- GitHub Pages has no built-in CDN edge logic beyond basic caching. If
  scaling becomes an issue, Cloudflare can sit in front (free tier).

**Neutral:**
- Custom domain + free SSL via Let's Encrypt is automatic.
- Build and deploy logic lives in `.github/workflows/deploy.yml`, fully
  controllable.

## Alternatives considered

- **Vercel Hobby** — supports SSR natively, but has a hard 100 GB cap that
  pauses the site on breach. Hobby plan prohibits commercial use, which
  forecloses any future monetization. Pro plan ($20/mo) introduces
  usage-based billing with potential for surprise costs at scale.
- **Cloudflare Pages** — generous free tier, fast CDN, supports static
  export. Reasonable alternative; rejected only because GitHub Pages keeps
  everything in one ecosystem and the bandwidth advantage doesn't matter
  at our scale.
- **S3 + CloudFront** — full control but operational overhead for zero
  benefit on a static blog.
