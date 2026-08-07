---
id: 005
title: Custom domain migration to parzival.blog
status: todo
created: 2026-05-24
plan: 2026-05-01-cleanup-and-syndication
adrs: [adr-008, adr-003]
depends_on: []
---

## Context

ADR-008 supersedes ADR-004 and pins the canonical domain to
`parzival.blog`, registered through Squarespace Domains. Hosting stays on
GitHub Pages per ADR-003.

This is the cutover task. When this lands, public traffic to the blog
flows through `parzival.blog` and `parzival1l.github.io` becomes a 301
redirect (GitHub Pages does that automatically once a custom domain is
configured).

There are two halves to the work that **must happen in the right order**:

1. **Author-side, outside this repo:** buy the domain at Squarespace and
   configure DNS. Until those DNS records resolve, GitHub's "DNS check"
   in `Settings → Pages` will fail and HTTPS won't provision.
2. **Repo-side, in this task:** add `public/CNAME`, then set the custom
   domain in `Settings → Pages`, then enable Enforce HTTPS.

Adding `public/CNAME` to a deployed site **before** the DNS is pointing
at GitHub Pages will cause GitHub Pages to redirect `parzival1l.github.io`
to a domain that doesn't resolve, breaking the live site. So the sequence
below is load-bearing — don't skip steps or reorder them.

## Acceptance criteria

- [ ] `parzival.blog` is purchased through Squarespace Domains, billed
      to the author's account
- [ ] DNS records in the Squarespace domain panel:
  - [ ] Apex `parzival.blog`: four A records →
        `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
        `185.199.111.153` (GitHub Pages' published IPs)
  - [ ] `www.parzival.blog`: CNAME → `parzival1l.github.io`
  - [ ] No other A/AAAA/CNAME records that would conflict (Squarespace
        may pre-populate "parking page" records — delete those)
- [ ] DNS resolves correctly from at least one external resolver before
      the repo change lands (`dig parzival.blog +short` returns the four
      GitHub IPs; `dig www.parzival.blog +short` returns
      `parzival1l.github.io.` followed by the GitHub IPs)
- [ ] `public/CNAME` exists in the repo, containing exactly the single
      line `parzival.blog` (no protocol, no trailing slash, no `www`,
      newline at EOF is fine)
- [ ] `npm run build` produces `out/CNAME` with the same content (Next.js
      static export copies `public/` contents verbatim)
- [ ] Repo `Settings → Pages`:
  - [ ] Custom domain set to `parzival.blog`
  - [ ] GitHub's automatic DNS check shows a green check
  - [ ] **Enforce HTTPS** is checked once the Let's Encrypt certificate
        provisions (usually ~10 min after the DNS check passes; may take
        up to an hour)
- [ ] `https://parzival.blog/` loads the Next.js site over a valid TLS
      certificate
- [ ] `https://www.parzival.blog/` 301-redirects to
      `https://parzival.blog/`
- [ ] `https://parzival1l.github.io/` 301-redirects to
      `https://parzival.blog/`
- [ ] Existing post URLs work at the new domain
      (`https://parzival.blog/blog/<slug>/`)

## Implementation notes

### Recommended sequence

1. **Buy the domain** at Squarespace Domains. After purchase, find the
   domain in the dashboard, open the DNS panel.

2. **Delete any auto-created records.** Squarespace tends to add a
   parking-page record set automatically. Remove all A, AAAA, CNAME,
   and HTTP redirect rules that point apex or `www` anywhere other than
   GitHub Pages.

3. **Add the GitHub Pages records:**

   | Type  | Host  | Value                       | TTL    |
   |-------|-------|-----------------------------|--------|
   | A     | @     | 185.199.108.153             | 1 hour |
   | A     | @     | 185.199.109.153             | 1 hour |
   | A     | @     | 185.199.110.153             | 1 hour |
   | A     | @     | 185.199.111.153             | 1 hour |
   | CNAME | www   | parzival1l.github.io.       | 1 hour |

   The `@` in the Host column represents the apex. Squarespace may use a
   different convention (a blank field, or the literal domain name) —
   follow whatever its UI calls "apex" or "root".

4. **Wait for DNS to propagate.** From a terminal:

   ```bash
   dig parzival.blog +short
   # expect:
   # 185.199.108.153
   # 185.199.109.153
   # 185.199.110.153
   # 185.199.111.153

   dig www.parzival.blog +short
   # expect:
   # parzival1l.github.io.
   # 185.199.108.153
   # 185.199.109.153
   # 185.199.110.153
   # 185.199.111.153
   ```

   Don't proceed until both queries return the expected records. New TLDs
   typically take 5–30 min; can take up to an hour in rare cases.

5. **Add the CNAME file in the repo.** Create `public/CNAME` containing:

   ```
   parzival.blog
   ```

   Single line, no protocol, no trailing slash. Commit on a branch,
   merge to `main` — the deploy workflow will copy it into `out/CNAME`.

6. **Configure GitHub Pages.** Once the deploy completes:
   - Go to repo `Settings → Pages`
   - Under "Custom domain", enter `parzival.blog`, click Save
   - GitHub runs a DNS check. Wait for the green check.
   - Wait for the Let's Encrypt cert to provision (~10 min). The "Enforce
     HTTPS" checkbox unlocks when ready.
   - Tick **Enforce HTTPS**.

7. **Verify the cutover** from an incognito window:
   - `https://parzival.blog/` → loads, valid cert
   - `https://www.parzival.blog/` → 301 → `https://parzival.blog/`
   - `https://parzival1l.github.io/` → 301 → `https://parzival.blog/`
   - One existing post URL works at the new domain

### What to do if HTTPS doesn't provision

GitHub Pages issues Let's Encrypt certs automatically, but it fails if:
- The DNS check hasn't passed yet (most common cause — wait longer)
- The custom domain was set before the apex A records pointed at GitHub
  Pages (toggle the custom domain off, save, re-enter it, save — forces
  GitHub to re-check)
- There's a CAA record on the domain blocking Let's Encrypt (Squarespace
  doesn't add one by default; only relevant if you added one manually)

### What does NOT change

- The deploy workflow (`.github/workflows/deploy.yml`) — no edits needed.
- The Next.js build output. `public/CNAME` is just a static file copied
  through the export.
- Any post content. Internal links are root-relative and just work at the
  new domain.
- ADR-005 syndication shape — only the `canonical_url` literal changes.
  No posts have been syndicated yet, so no migration needed; task 008
  picks up the new domain when it ships.

## Pre-flight before merging the repo-side PR

- [ ] `dig` checks pass for both apex and `www`
- [ ] You've decided whether to do this during a quiet window (the
      github.io → parzival.blog redirect kicks in within a few minutes
      of the merge; any in-flight readers see a one-time redirect)

## Out of scope (deferred)

- RSS feed and `sitemap.xml` updates referencing the new domain — task
  007 in a future plan owns those.
- Updating older blog post bodies that hardcode `parzival1l.github.io`
  links — none currently do; revisit if any are added.
- Email forwarding from `*@parzival.blog` — not requested; Squarespace
  offers it as an add-on if wanted later.
