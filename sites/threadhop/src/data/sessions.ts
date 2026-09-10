// Fixture data for the interactive TUI mock on the landing page.
// Everything here is invented. Projects are well-known OSS repos so the
// sidebar reads as familiar; none of it is a real transcript.

export type Provider = "claude" | "codex" | "opencode" | "pi" | "cursor" | "antigravity" | "gemini";
export type Status = "in_progress" | "in_review" | "done";

export interface Turn {
  role: "you" | "agent" | "shell";
  text: string; // may contain <b> and <i> for emphasis only
}

export interface Session {
  id: string;
  title: string;
  project: string; // cwd
  provider: Provider;
  status: Status;
  age: string;
  icon: "◐" | "●" | "○";
  branch: string;
  turns: number;
  files: string[];
  bookmarks: { star: number; research: number };
  borrowedFrom?: { ticket: string; title: string };
  transcript: Turn[];
}

export const PROVIDER_LABEL: Record<Provider, string> = {
  claude: "claude",
  codex: "codex",
  opencode: "opencode",
  pi: "pi",
  cursor: "cursor",
  antigravity: "antigravity",
  gemini: "gemini",
};

export const STATUS_LABEL: Record<Status, string> = {
  in_progress: "● in_progress",
  in_review: "◆ in_review",
  done: "✓ done",
};

export const sessions: Session[] = [
  {
    id: "7f3a91c2",
    title: "vim mode: dot-repeat",
    project: "~/oss/zed",
    provider: "claude",
    status: "in_progress",
    age: "2m",
    icon: "◐",
    branch: "vim/dot-repeat",
    turns: 41,
    files: ["crates/vim/src/cursor.rs", "crates/vim/src/normal.rs", "crates/gpui/src/text.rs"],
    bookmarks: { star: 2, research: 1 },
    borrowedFrom: { ticket: "tk_1a2b3c4d", title: "gpui text rendering" },
    transcript: [
      { role: "you", text: "pull the text-rendering decision from my gpui chat and apply it to the vim cursor" },
      { role: "agent", text: "Borrowing context from <b>gpui text rendering</b> <i data-prov=\"codex\">(codex)</i> — no LLM call, just the ticket." },
      {
        role: "shell",
        text: "<span class=bang>!</span>threadhop prepare --session 2c9e04b1\n<span class=dim>✓ ticket tk_1a2b3c4d · 1 haiku call · head summarised, last 3 exchanges verbatim</span>\n<span class=dim>  paste in the target chat: <b>!threadhop receive tk_1a2b3c4d</b></span>",
      },
      {
        role: "agent",
        text: "Got it. Decisions carried over: <b>subpixel positioning stays on; glyph atlas is per-scale-factor; cursor is drawn in the same pass as selections.</b> Updating <b>crates/vim/src/cursor.rs</b> now.",
      },
    ],
  },
  {
    id: "2c9e04b1",
    title: "gpui text rendering",
    project: "~/oss/zed",
    provider: "codex",
    status: "in_progress",
    age: "1h",
    icon: "●",
    branch: "gpui/subpixel",
    turns: 88,
    files: ["crates/gpui/src/text.rs", "crates/gpui/src/platform/mac/text_system.rs"],
    bookmarks: { star: 3, research: 0 },
    transcript: [
      { role: "you", text: "should we keep subpixel positioning on for the glyph atlas or snap to whole pixels?" },
      {
        role: "agent",
        text: "Keep it on. Snapping saves atlas memory but the kerning drift at 1.5× scale is visible in the tab bar. <b>Decision: subpixel on, atlas keyed by scale factor.</b>",
      },
      { role: "you", text: "and the cursor — same pass as text or its own layer?" },
      { role: "agent", text: "Same pass as selections. Its own layer costs a second quad batch per frame for one rectangle. Not worth it." },
      { role: "shell", text: "<span class=bang>!</span>threadhop bookmark --note \"cursor pass decision\"\n<span class=dim>✓ bookmarked 2c9e04b1 · kind=bookmark</span>" },
    ],
  },
  {
    id: "b81d77e0",
    title: "lsp restart flakiness",
    project: "~/oss/zed",
    provider: "opencode",
    status: "in_review",
    age: "3d",
    icon: "○",
    branch: "fix/lsp-restart",
    turns: 23,
    files: ["crates/project/src/lsp_store.rs", "crates/lsp/src/lsp.rs"],
    bookmarks: { star: 0, research: 2 },
    transcript: [
      { role: "you", text: "rust-analyzer sometimes comes back with no diagnostics after restart. where does the race live?" },
      {
        role: "agent",
        text: "The restart drops the old <b>LanguageServer</b> before the new one has finished <b>initialize</b>. Diagnostics published in that window are routed to a server id that no longer exists.",
      },
      { role: "agent", text: "Fix: keep the old id registered until the new server's <b>initialized</b> notification lands, then swap. PR is up; two reviewers assigned." },
    ],
  },
  {
    id: "e4a2c0f9",
    title: "content layer caching",
    project: "~/oss/astro",
    provider: "codex",
    status: "in_progress",
    age: "9h",
    icon: "○",
    branch: "content/cache-v2",
    turns: 57,
    files: ["packages/astro/src/content/loaders/glob.ts", "packages/astro/src/content/data-store.ts"],
    bookmarks: { star: 1, research: 1 },
    transcript: [
      { role: "you", text: "the glob loader re-reads every file on dev restart. can the data store persist between runs?" },
      {
        role: "agent",
        text: "Yes — the store already serialises to <b>.astro/data-store.json</b>. Missing piece is a digest per entry so we can skip unchanged files instead of rebuilding the whole collection.",
      },
      { role: "you", text: "use mtime or content hash?" },
      { role: "agent", text: "Content hash. mtime lies under git checkout and CI caches. <b>Decision: xxhash of file bytes, stored next to the entry.</b>" },
    ],
  },
  {
    id: "9d5b3e17",
    title: "view transitions bug",
    project: "~/oss/astro",
    provider: "claude",
    status: "done",
    age: "1d",
    icon: "○",
    branch: "fix/vt-scroll",
    turns: 19,
    files: ["packages/astro/src/transitions/router.ts"],
    bookmarks: { star: 1, research: 0 },
    transcript: [
      { role: "you", text: "scroll position jumps to top on back navigation with view transitions enabled" },
      { role: "agent", text: "The router restores scroll <i>before</i> the new document's images have laid out. Deferring restore to the <b>astro:after-swap</b> event fixes it." },
      { role: "shell", text: "<span class=bang>!</span>threadhop tag done\n<span class=dim>✓ tagged 9d5b3e17 as done</span>" },
    ],
  },
  {
    id: "c3f0a8d2",
    title: "f-string lexer rewrite",
    project: "~/oss/ruff",
    provider: "pi",
    status: "in_review",
    age: "2d",
    icon: "○",
    branch: "lexer/fstring-v2",
    turns: 64,
    files: ["crates/ruff_python_parser/src/lexer.rs", "crates/ruff_python_parser/src/lexer/fstring.rs"],
    bookmarks: { star: 4, research: 2 },
    transcript: [
      { role: "you", text: "PEP 701 lets f-strings nest arbitrarily. does the lexer need a stack now?" },
      {
        role: "agent",
        text: "It does. One <b>FStringContext</b> per open f-string, tracking quote kind, nesting depth and whether we're inside a replacement field. The old boolean flag can't express <b>f\"{f'{x}'}\"</b>.",
      },
      { role: "agent", text: "Rewrote the tokenizer around that stack. All 1,900 parser fixtures pass; two new ones cover the nested-quote case." },
    ],
  },
  {
    id: "a19c4e77",
    title: "islands hydration order",
    project: "~/oss/astro",
    provider: "cursor",
    status: "in_review",
    age: "6h",
    icon: "○",
    branch: "islands/priority",
    turns: 34,
    files: ["packages/astro/src/runtime/client/idle.ts", "packages/astro/src/runtime/client/visible.ts"],
    bookmarks: { star: 1, research: 0 },
    transcript: [
      { role: "you", text: "client:visible islands above the fold hydrate after client:idle ones below it. that's backwards" },
      { role: "agent", text: "The idle scheduler fires on <b>requestIdleCallback</b> immediately at load, while visible waits one IntersectionObserver tick. Adding a microtask yield to idle lets visible win for anything already in viewport." },
    ],
  },
  {
    id: "d0e5b2a8",
    title: "collections editor perf",
    project: "~/oss/zed",
    provider: "antigravity",
    status: "in_progress",
    age: "40m",
    icon: "●",
    branch: "editor/rope-chunks",
    turns: 29,
    files: ["crates/rope/src/rope.rs", "crates/editor/src/display_map.rs"],
    bookmarks: { star: 0, research: 1 },
    transcript: [
      { role: "you", text: "profile the display map on a 200 MB log file. where does the time go?" },
      { role: "agent", text: "72% in <b>Rope::chunks_in_range</b> re-walking from the root for each wrapped line. Caching the last cursor position between calls drops the frame from 41 ms to 6 ms." },
    ],
  },
  {
    id: "f7c31b09",
    title: "pyproject settings resolver",
    project: "~/oss/ruff",
    provider: "gemini",
    status: "in_progress",
    age: "3h",
    icon: "●",
    branch: "settings/hierarchical",
    turns: 47,
    files: ["crates/ruff_workspace/src/resolver.rs", "crates/ruff_workspace/src/pyproject.rs"],
    bookmarks: { star: 2, research: 0 },
    transcript: [
      { role: "you", text: "nested pyproject.toml files: does the child fully replace the parent's [tool.ruff] or merge into it?" },
      { role: "agent", text: "Replace, unless the child sets <b>extend = \"../pyproject.toml\"</b>. That's the documented contract and the resolver already honours it — the bug is that <b>extend</b> paths were resolved relative to cwd instead of the child file." },
      { role: "shell", text: "<span class=bang>!</span>threadhop peek c3f0a8d2 --last 2\n<span class=dim>→ 2 exchanges from f-string lexer rewrite (pi) · 0 LLM calls</span>" },
    ],
  },
  {
    id: "5a7e19c4",
    title: "rule docs generator",
    project: "~/oss/ruff",
    provider: "opencode",
    status: "done",
    age: "4d",
    icon: "○",
    branch: "docs/rule-gen",
    turns: 12,
    files: ["crates/ruff_dev/src/generate_rules_table.rs", "docs/rules.md"],
    bookmarks: { star: 0, research: 0 },
    transcript: [
      { role: "you", text: "regenerate the rules table and make sure every rule has a 'what it does' section" },
      { role: "agent", text: "Done. 3 rules were missing the section — <b>PLR1714</b>, <b>RUF029</b>, <b>B905</b>. Added stubs and flagged them in the PR description." },
    ],
  },
];
