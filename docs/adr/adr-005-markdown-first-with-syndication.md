---
id: 005
title: Markdown-first content with selective syndication
status: accepted
date: 2026-05-01
supersedes: []
superseded_by: []
---

## Context

An earlier draft of this project's architecture proposed using Hashnode in
headless mode as the CMS — Hashnode would own content storage, the Next.js
frontend would fetch posts via GraphQL at build time, and a Hashnode webhook
would trigger rebuilds.

The benefits of that approach were:

1. Hashnode's per-post newsletter toggle and subscriber management
2. Hashnode's developer-feed for discovery
3. Hashnode's GitHub backup as a versioning safety net

On reflection, the costs outweigh the benefits for this project:

- The repo *already* contains the markdown — making it the source of truth
  removes the need for a separate "backup."
- Discovery through Hashnode's feed is achievable by *cross-posting* to
  Hashnode (with canonical URL pointing to our domain) without giving them
  the CMS role.
- Newsletter management is the only feature Hashnode provides that
  cross-posting doesn't replicate, and we don't need a newsletter at launch.
- Coupling content to a third-party CMS introduces lock-in and a service
  dependency for every page render.

## Decision

Markdown files in this repo (`content/posts/*.mdx`) are the canonical source
of truth. The site is built directly from them. No CMS integration.

Distribution is handled by an opt-in syndication workflow that reads a
`syndicate` block in each post's frontmatter and POSTs to dev.to / Hashnode
APIs (and optionally Medium) with `canonical_url` set back to `stepback.dev`.

Frontmatter shape:

```yaml
syndicate:
  devto: true
  hashnode: true
  medium: false
  # populated by the workflow after first publish:
  devto_url:
  hashnode_url:
```

Default: no `syndicate` block ⇒ no syndication. Opt-in per platform.

The workflow is a separate `.github/workflows/crosspost.yml` decoupled from
the build/deploy workflow. It diffs `content/posts/` on push, parses
frontmatter, and only publishes posts where the platform flag is `true` AND
the corresponding `*_url` field is empty (idempotent).

After successful publish, the workflow commits the platform's returned URL
back into the post's frontmatter — so the URL is recorded in git and can be
rendered as a "also published on" badge in the post UI.

## Consequences

**Positive:**
- Content is portable. Leaving any platform doesn't change anything.
- Distribution is multi-channel by default — get into Hashnode's feed and
  dev.to's feed via cross-posting, without ceding the CMS role.
- Selective per-post + per-platform control matches the original "selective
  newsletter toggle" goal in spirit.
- The workflow is decoupled: deploy and crosspost can fail independently.
- All state (post content, syndication URLs, decisions) lives in git.

**Negative:**
- No newsletter system out of the box. If/when we want one, add Buttondown
  or similar separately.
- No Hashnode-native subscriber management or analytics dashboard. GA4 plus
  each platform's own analytics covers this; just less centralized.
- Cross-posting workflow is custom code we maintain (estimate: ~150 lines
  of Node/TypeScript).
- Each platform has its own API quirks (rate limits, markdown dialects, image
  handling) — fixable but not free.

**Neutral:**
- Canonical URLs preserve SEO regardless of where copies live.
- This decision is reversible: nothing precludes adopting a CMS later if the
  pain of solo content management exceeds the benefit of git-native control.

## Alternatives considered

- **Hashnode headless as CMS** — rejected as described in Context.
- **Manual cross-posting** — rejected; ~5 minutes per post per platform adds
  up and is exactly the kind of toil that reduces publishing frequency.
- **Single-platform syndication (e.g., always cross-post to dev.to and
  Hashnode)** — rejected; some posts belong on one platform but not the
  other, and the per-platform booleans capture that with no extra cost.
- **Cross-posting to Medium from launch** — deferred. Medium's API is
  finicky, code formatting is poor, and the audience is less developer-
  focused than dev.to/Hashnode. May add later as a separate ADR.
