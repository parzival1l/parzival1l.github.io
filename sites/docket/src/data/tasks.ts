// Fixture data for the interactive product shot on the landing page.
// Everything here is invented; the repo is a made-up S3-style uploader.
// Shapes mirror docket's two tables (tasks, groups) closely enough that the
// mock behaves like the real CLI: `blocked` is computed from deps, never stored.

export type Provider = "claude" | "codex" | "opencode" | "pi" | "cursor" | "antigravity" | "gemini";
export type Status = "backlog" | "open" | "in_progress" | "done";

export interface Task {
  id: number; // rendered as T-N
  title: string;
  acceptance: string;
  deps: number[];
  status: Status;
  priority: number; // 0..4, lower = more urgent
  group: string | null;
  /** who picked it (for in_progress / done) and a relative time */
  agent?: Provider;
  when?: string;
  /** commit subject shown in the dispatch log once done */
  commit?: string;
}

export interface Group {
  name: string;
  branch: string;
  state: "open" | "closed";
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

/** which agent is "waiting" for each not-yet-picked task in the dispatch log */
export const WAITING: Record<number, Provider> = {
  8: "pi",
  9: "cursor",
  10: "gemini",
  12: "antigravity",
  13: "opencode",
  14: "codex",
  15: "gemini",
  16: "pi",
};

export const groups: Group[] = [
  { name: "uploader-fixes", branch: "group/uploader-fixes", state: "open" },
  { name: "metrics-v2", branch: "group/metrics-v2", state: "open" },
  { name: "auth-cleanup", branch: "group/auth-cleanup", state: "closed" },
];

export const tasks: Task[] = [
  // ── auth-cleanup · 5/5 done ─────────────────────────────────────────
  { id: 1, title: "drop legacy HMAC signer", acceptance: "no callers of hmac_v1 remain; CI green", deps: [], status: "done", priority: 2, group: "auth-cleanup", agent: "claude", when: "3d ago", commit: "drop hmac_v1 signer" },
  { id: 2, title: "rotate service token on boot", acceptance: "token age < 24h after restart; logged once", deps: [1], status: "done", priority: 2, group: "auth-cleanup", agent: "codex", when: "3d ago", commit: "rotate token at startup" },
  { id: 4, title: "auth errors carry request id", acceptance: "401/403 bodies include x-request-id", deps: [1], status: "done", priority: 3, group: "auth-cleanup", agent: "pi", when: "2d ago", commit: "attach request id to auth errors" },
  { id: 6, title: "remove basic-auth fallback", acceptance: "basic auth returns 401; docs updated", deps: [2, 4], status: "done", priority: 2, group: "auth-cleanup", agent: "claude", when: "2d ago", commit: "remove basic-auth fallback" },
  { id: 11, title: "auth middleware integration test", acceptance: "covers bearer, expired, malformed; runs in CI", deps: [6], status: "done", priority: 3, group: "auth-cleanup", agent: "opencode", when: "1d ago", commit: "auth middleware integration test" },

  // ── uploader-fixes · 2/4 done ───────────────────────────────────────
  { id: 3, title: "add part checksum", acceptance: "each part upload sends SHA-256; server rejects mismatch", deps: [], status: "done", priority: 1, group: "uploader-fixes", agent: "codex", when: "6h ago", commit: "add part checksum" },
  { id: 5, title: "chunk parts at 8 MB", acceptance: "files > 8 MB split into 8 MB parts; last part may be smaller", deps: [3], status: "done", priority: 2, group: "uploader-fixes", agent: "opencode", when: "2h ago", commit: "chunk parts at 8 MB" },
  { id: 7, title: "uploader retries failed parts", acceptance: "retries each part up to 3× with backoff; upload succeeds if every part eventually succeeds; gives up after 3 failures on any part", deps: [3, 5], status: "in_progress", priority: 1, group: "uploader-fixes", agent: "claude", when: "4m ago", commit: "retry failed parts" },
  { id: 8, title: "resume upload from checkpoint", acceptance: "on restart, completed parts are skipped; checkpoint file removed on success", deps: [7], status: "open", priority: 2, group: "uploader-fixes", commit: "resume from checkpoint" },

  // ── metrics-v2 · 0/3 done ───────────────────────────────────────────
  { id: 9, title: "emit per-part metrics", acceptance: "metric uploader_part_total has labels {status, attempt}", deps: [7], status: "open", priority: 2, group: "metrics-v2", commit: "emit per-part metrics" },
  { id: 10, title: "dashboard for part metrics", acceptance: "Grafana board shows success rate and retry histogram", deps: [9], status: "open", priority: 3, group: "metrics-v2", commit: "part metrics dashboard" },
  { id: 12, title: "reject >5 GB parts early", acceptance: "client errors before any bytes are sent; message names the limit", deps: [], status: "open", priority: 1, group: "metrics-v2", commit: "reject oversize parts early" },

  // ── ungrouped ───────────────────────────────────────────────────────
  { id: 13, title: "parallel part uploads", acceptance: "up to 4 parts in flight; wall time drops ≥ 2× on a 1 GB file", deps: [8], status: "open", priority: 2, group: null, commit: "parallel part uploads" },
  { id: 14, title: "content-type sniffing", acceptance: "uploaded object has correct Content-Type for png/jpg/pdf", deps: [], status: "open", priority: 3, group: null, commit: "sniff content-type" },

  // ── backlog · parked, invisible to ready/blocked ────────────────────
  { id: 15, title: "abort multipart on ctrl-c", acceptance: "SIGINT calls AbortMultipartUpload; no orphaned parts", deps: [], status: "backlog", priority: 3, group: null },
  { id: 16, title: "progress bar for large files", acceptance: "tty shows per-part progress; silent when not a tty", deps: [], status: "backlog", priority: 4, group: null },
];

/** The Ready view: queued (open, or already picked) and every dep done. */
export function isReady(t: Task, all: Task[]): boolean {
  return (t.status === "open" || t.status === "in_progress") && t.deps.every((d) => all.find((x) => x.id === d)?.status === "done");
}
/** Blocked = not done, not backlog, and at least one dep unmet. */
export function isBlocked(t: Task, all: Task[]): boolean {
  return (t.status === "open" || t.status === "in_progress") && t.deps.some((d) => all.find((x) => x.id === d)?.status !== "done");
}
