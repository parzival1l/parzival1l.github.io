# Handoff — session cursor-personal-2026-09-09 · project `parzival1l.github.io`

Personal house domain: apex is the author, each project is its own origin on a subdomain. Blog stays on GitHub Pages; product sites go to Cloudflare.

## Decisions
- Apex / `www` → GitHub Pages (blog, static Next.js export). DNS-only on Cloudflare (grey cloud) so Pages SSL does not fight the proxy.
- `project.<house>` → Cloudflare Pages / Workers (orange cloud). Landing, `/docs`, `/api`, and live demos share that origin.
- Buying the apex includes every subdomain. A name is just a DNS record; hosting is a separate point.
- Project APIs stay under the project (`threadhop.<house>/api`), not a shared `api.<house>`.
- Blog `/projects` cards only link out. The product lives on the subdomain.

## Observations
- diffs.com is the UX: the landing page embeds a live slice of the product (ThreadHop: session view and/or terminal), first-party, same host as `/api`. Not a screenshot or an iframe from the blog.
- The blog cannot host that. It is a static export on GitHub Pages — no server, no websocket.
- ThreadHop is a TUI; start with a web slice over fixture data. Real PTY/terminal can come later (Worker + optional Modal).
- One Cloudflare zone. Wildcard `*.<house>` can start as a single Pages/Worker app and split later.
- Enforce HTTPS for the blog is in the GitHub repo Settings → Pages, after the custom domain cert exists.

## Domain cutover — 2026-09-09

- Purchased house domain: `parzival.computer`, registered with Cloudflare.
- Cloudflare apex A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; all DNS-only, TTL Auto.
- `www` CNAME → `parzival1l.github.io`; DNS-only, TTL Auto.
- Public resolver `1.1.1.1` returned all four apex addresses and the www CNAME before the GitHub setting changed.
- GitHub Pages custom domain is `parzival.computer`; DNS check passed, certificate approved for apex/www, and Enforce HTTPS enabled.
- Verified HTTPS 200 responses for `/` and `/blog/threadhop-ai-tinkerers/`; `www` redirects to the HTTPS apex and old GitHub Pages post URLs preserve their path when redirecting. Followed the old homepage redirect through to HTTPS 200 and opened the new homepage successfully in Comet.
- The existing GitHub Actions static-export deployment remains in place. No application deployment on Cloudflare is needed for the blog.
- Correction to task 005: with `build_type: workflow`, GitHub ignores `public/CNAME`; the custom domain is configured in Settings → Pages. No CNAME file was added. See [GitHub documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
- `parzival.blog` / Squarespace references in the older migration task describe the previous proposal, superseded by this purchased domain and namespace decision.

## threadhop.parzival.computer — 2026-09-09

- Live at `https://threadhop.parzival.computer` (`/`, `/docs/`, `/changelog/`, `/install.sh`).
- Source: `threadhop/site/` (Astro 7, static output). Committed on the `migration/rust-port` branch as `b2f54c1`.
- Hosting: **Cloudflare Workers with static assets**, not Pages — Cloudflare now recommends Workers for new projects. `wrangler.jsonc` has `assets.directory: ./dist` and a `custom_domain` route; no Worker script yet. Add `@astrojs/cloudflare` + `main` only when `/api` or live demos need on-demand rendering.
- Deploy: `cd site && npm run deploy` (`astro build && wrangler deploy`). Wrangler is logged in via OAuth as the Cloudflare account owner. Worker name `threadhop-site`.
- DNS: Wrangler created the `threadhop` record automatically when binding the custom domain (proxied, orange cloud). Apex/`www` remain DNS-only for GitHub Pages.
- Design: Paper file `01M24J0V41AFEFFGNGG48ADZSH`, artboard "A · Phosphor — Hero" (palette later changed to blue/peach). The "interactive terminal" is the herdr.dev pattern — DOM + ~60 lines of vanilla JS, no PTY.
- Tooling added this session: Paper MCP and Cloudflare MCPs in `~/.config/opencode/opencode.jsonc`; Cloudflare skills installed globally via `npx skills`.

## Future projects

- Add each project hostname when its Cloudflare deployment exists, following the threadhop pattern above.
- Keep landing pages, `/docs`, `/api`, and demos on that project's origin; blog cards link out.
- No wildcard record; one Worker + custom domain per project.
