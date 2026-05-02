---
id: 007
title: Modal for live AI/ML demos
status: accepted
date: 2026-05-01
supersedes: []
superseded_by: []
---

## Context

The blog will showcase AI/ML projects. Static screenshots and code blocks
are insufficient — the differentiator is **interactive demos** that visitors
can use without cloning the repo or running models locally.

Hosting demos has historical pain points:

- Always-on servers cost money even when nobody is using the demo
- GPU instances are expensive at idle
- Containerized deploys require Docker / orchestration knowledge that
  shouldn't be a prerequisite for shipping a demo

Modal addresses this with a Python-native serverless model: deploy with
decorators, scales to zero when idle, per-second billing.

## Decision

Use Modal as the runtime for live AI/ML project demos. Each project that has
a demo has its own `modal_app.py` in the project repo, deployed to Modal via
`modal deploy`. The demo URL is linked from:

- The project's GitHub Pages landing page (or `stepback.dev/projects/<name>`)
- Any blog post about the project, via a `<DemoLink />` or markdown link

Modal is **not coupled to the blog infrastructure**. The blog repo doesn't
deploy demos; demos live in their own project repos and have their own
deploy flow. The blog only knows demo URLs.

Demo framework choice (Gradio, FastAPI, Textual + textual-serve) is per-
project — not a global decision.

## Consequences

**Positive:**
- Idle demos cost nothing. Per-second billing means a demo with sporadic
  weekly traffic costs cents per month.
- $30/month free compute tier plus student credits cover early-stage usage.
- GPU support (T4, L4, A100, H100) for inference-heavy demos.
- Decorator-based deploy is dramatically simpler than Docker + Kubernetes.
- Each demo is independent — one demo breaking doesn't affect others.

**Negative:**
- Cold starts: 2–4s on CPU, 5–15s on GPU after idle. Acceptable for portfolio
  demos with a loading state; would not be acceptable for production user-
  facing apps.
- Modal-specific deploy tooling — small lock-in to their CLI and decorators.
- If Modal raises prices or changes terms, demos must be migrated. The
  underlying code (Gradio app, FastAPI app, etc.) is portable; only the
  deploy wrapper is Modal-specific.

**Neutral:**
- Custom domains on Modal endpoints are possible but not necessary.
  `*.modal.run` URLs are fine for portfolio demos.
- Demos can use `keep_warm=1` if cold starts become a problem for a
  high-traffic demo (uses credits continuously).

## Alternatives considered

- **Hugging Face Spaces** — free GPU-backed Gradio hosting. Rejected as
  primary because: less control over the runtime environment, limited to
  Gradio/Streamlit frontends, tied to the HF ecosystem. May still be used
  for HF-native demos (e.g., when a model card itself is the demo).
- **Always-on VPS or container** — rejected. Cost at idle is the problem
  Modal solves. Wrong tool for sporadic-traffic portfolio demos.
- **Self-hosted on a homelab** — rejected. Reliability and bandwidth aren't
  appropriate for a public-facing portfolio.
- **Cloudflare Workers AI / Vercel AI** — fine for LLM-only demos but limit
  what can be deployed. Modal handles arbitrary Python code with arbitrary
  dependencies, including non-LLM ML and TUIs (textual-serve).
