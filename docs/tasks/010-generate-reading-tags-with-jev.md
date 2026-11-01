---
id: 010
title: Generate reading tags with Jev
status: todo
created: 2026-11-01
plan: 2026-11-01-reading-notes
adrs: []
depends_on: [009]
---

## Context

Tags on reading entries (the `agents · patterns` line under each note)
should come from Jev, not from the author typing them. Writing tags by
hand is the slowest part of adding an entry, and hand-picked tags drift
("llm" vs "llms").

Jev is TypeSafe AI's "System One Model" for decisions inside software. It
takes structured questions and returns typed decisions with probabilities
and confidence estimates. Access is through the API, in early access.

- Docs: https://docs.typesafe.ai/introduction
- Console and API keys: https://console.typesafe.ai/

Task 009 makes `tags` optional and turns each tag into a filter link.
Plan: `docs/plans/2026-11-01-reading-notes.md`.

## Acceptance criteria

- [ ] `npm run tag` runs `scripts/tag-reading.mjs`.
- [ ] The script finds every entry with no `tags`, in both
      `content/reading.yaml` and `content/reading/*.mdx`.
- [ ] For each one it sends Jev the title, URL, summary, note text, and
      the current tag vocabulary (every tag already in use).
- [ ] Jev returns 1–3 tags. It prefers existing tags and proposes a new
      one only when none fits.
- [ ] The script writes tags back when confidence is at or above a
      threshold (start at 0.8, one constant at the top of the script).
      Below the threshold it writes nothing and prints the entry with
      Jev's suggestions for review.
- [ ] Tags the author already wrote are never changed.
- [ ] Re-running the script with no new untagged entries changes nothing.
- [ ] The key comes from `TYPESAFE_API_KEY`. With no key, the script exits
      with a clear message and a non-zero code.
- [ ] Written tags are lowercase and match the format `lib/reading.ts`
      expects.

## Implementation notes

- Read the Jev docs when you pick this up. The request shape, model name
  and confidence fields are not recorded here, because the API is in
  early access and may change.
- Run at authoring time and commit the result. Do not call Jev from
  `next build` or the deploy workflow: the build must stay deterministic,
  and a Jev outage must not break a deploy.
- Edit YAML so the file header comments survive. A plain load-and-dump
  with `js-yaml` drops comments, so edit per entry or use a YAML library
  that keeps them.
- For `.mdx` files, change only the frontmatter. Leave the body
  byte-for-byte unchanged.

## Out of scope

- Running the script in CI or on a schedule. That is a later step once
  the output is trusted.
- Re-tagging entries that already have tags.
- Generating summaries or titles.
