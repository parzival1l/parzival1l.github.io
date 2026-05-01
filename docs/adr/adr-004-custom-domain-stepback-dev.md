---
id: 004
title: Custom domain `stepback.dev` with 301 from github.io
status: accepted
date: 2026-05-01
supersedes: []
superseded_by: []
---

## Context

The blog currently lives at `parzival1l.github.io`. We own the domain
`stepback.dev` and want it to be the canonical URL for SEO, branding, and
long-term portability — if we ever leave GitHub Pages, the domain comes with
us; the github.io URL doesn't.

GitHub Pages supports custom domains natively with automatic SSL via
Let's Encrypt. Setting a custom domain causes the github.io URL to
301-redirect to the custom domain.

## Decision

Use `stepback.dev` as the canonical domain for the blog. `parzival1l.github.io`
remains as a 301 redirector to preserve any existing inbound links.

Setup:

1. Add `public/CNAME` containing `stepback.dev` (Next.js copies it into the
   export output, GitHub Pages reads it).
2. DNS at the registrar:
   - Apex `stepback.dev`: A records →
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www.stepback.dev`: CNAME → `parzival1l.github.io`
3. In repo Settings → Pages: set custom domain to `stepback.dev`, enable
   "Enforce HTTPS" once the certificate provisions (~10 min).

All canonical URLs (including the canonical URL passed to syndication APIs in
ADR-005) point to `stepback.dev`.

## Consequences

**Positive:**
- SEO consolidates onto `stepback.dev`. Old `parzival1l.github.io` links
  preserve their value via 301.
- Domain ownership is portable. If we ever move off GitHub Pages, the URL
  doesn't change for readers.
- HTTPS is automatic and free.
- Cleaner public-facing URL.

**Negative:**
- Annual domain registration cost (~$15–20/year for `.dev`).
- DNS propagation delay on initial setup (10–60 min typical).
- Both URLs cannot serve simultaneously without redirect — this is GitHub
  Pages behavior. Acceptable; the redirect is the right SEO move anyway.

**Neutral:**
- The github.io URL technically remains valid forever as a redirect source.
- Modal demo URLs use Modal's own domain (`*.modal.run`); custom domains on
  Modal endpoints are possible but not necessary for portfolio demos.

## Alternatives considered

- **Keep `parzival1l.github.io` as canonical, no custom domain** — rejected.
  Locks SEO and brand into GitHub. Painful to migrate later.
- **Custom domain on a different host (e.g., point `stepback.dev` at Vercel
  instead)** — rejected; this is a hosting choice question already settled
  by ADR-003.
- **Subdomain only (e.g., `blog.stepback.dev`)** — rejected. The blog is the
  primary content of `stepback.dev` for now; using the apex is simpler and
  doesn't preclude adding subdomains later for other purposes.
