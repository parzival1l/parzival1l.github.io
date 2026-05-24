---
id: 008
title: Custom domain `parzival.blog` via Squarespace (supersedes ADR-004)
status: accepted
date: 2026-05-24
supersedes: [004]
superseded_by: []
---

## Context

ADR-004 chose `stepback.dev` as the canonical custom domain for the blog.
That decision was made before the domain was actually purchased. On
reflection the author prefers `parzival.blog`: it matches the existing
handle (`parzival1l`) used on GitHub and elsewhere, and the `.blog` TLD
telegraphs the site's purpose at a glance.

The registrar has also been settled: domain will be bought through
**Squarespace Domains** (the operation that absorbed Google Domains).
This is a registrar + DNS-host choice only — hosting itself remains on
GitHub Pages per ADR-003. The mechanics of pointing a custom apex domain
at GitHub Pages (apex A records to GitHub's IPs, `www` CNAME, in-repo
CNAME file, enforced HTTPS via Let's Encrypt) are unchanged from ADR-004.

This ADR reverses only the domain name and pins down the registrar. The
redirect strategy, the SEO rationale, and the DNS setup pattern from
ADR-004 all carry over.

## Decision

Use `parzival.blog` as the canonical domain for the blog. Register and
DNS-host through Squarespace Domains. `parzival1l.github.io` remains as
a 301 redirector so existing inbound links keep working.

Setup sequence (execution lives in task 005):

1. Purchase `parzival.blog` from Squarespace Domains.
2. Add `public/CNAME` containing exactly `parzival.blog` (Next.js's
   static export copies it into `out/`; GitHub Pages reads it).
3. DNS in Squarespace's domain panel:
   - Apex `parzival.blog`: four A records →
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153`
   - `www.parzival.blog`: CNAME → `parzival1l.github.io`
4. Repo `Settings → Pages`: set custom domain to `parzival.blog`,
   wait for GitHub's DNS check to pass, then tick **Enforce HTTPS**
   once Let's Encrypt provisions (~10 min typical).

All canonical URLs — including the `canonical_url` passed to syndication
APIs per ADR-005 — point to `parzival.blog` after cutover. References to
`stepback.dev` in older accepted ADRs, superseded plans, and completed
task files are left in place as historical record per the docs
immutability rules.

## Consequences

**Positive:**
- Domain matches the author's online handle (`parzival1l` → `parzival`),
  which is recognizable to anyone already following the work elsewhere.
- `.blog` TLD removes any ambiguity about what the site is.
- Squarespace Domains' DNS UI is friendlier than most registrars; the
  underlying operation (ex-Google Domains) has a track record.

**Negative:**
- `.blog` is a more expensive TLD than `.dev` — roughly $25–35/year vs.
  ~$15–20. Recurring but small.
- Evergreen docs referencing `stepback.dev` (`architecture.md`, root
  `CLAUDE.md`, in-flight task files) need updating in lockstep with this
  ADR. Historical docs are intentionally left alone.

**Neutral:**
- `parzival1l.github.io` remains valid forever as a redirect source
  (GitHub Pages behavior). Same as under ADR-004.
- The hosting decision (GitHub Pages, ADR-003) is unaffected.
- ADR-005 (syndication with `canonical_url`) still applies; only the
  literal URL string changes. A future first-publish of a syndicated
  post will use `parzival.blog` directly with no migration needed
  because no posts have been syndicated yet.

## Alternatives considered

- **Keep `stepback.dev`** — rejected. Author preference; this is the
  only decision being reversed.
- **Buy through Cloudflare Registrar (at-cost pricing) or Namecheap** —
  rejected. The annual savings (a few dollars) don't outweigh the
  friendlier Squarespace DNS UI for someone who edits DNS rarely.
- **Subdomain shape (e.g., `blog.parzival.dev`)** — rejected. The
  handle-as-domain pattern is the point; a `.blog` apex is cleanest.
- **`nandakumar.blog` (real name)** — rejected. The author publishes
  under the `parzival1l` handle; matching that is the higher-signal
  choice.
