# Changelog

All notable changes to docket are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each `## [VERSION]` section is consumed verbatim by the release workflow as the
GitHub Release body for the matching tag — keep entries written for that audience.

## [Unreleased]

## [0.0.4] - 2026-05-17

Backlog and task-kind release. Introduces a dedicated `backlog` status so tasks can be parked without polluting the `open` queue, adds a first-class `kind` field for distinguishing features from bugs/chores, and lets `docket` launch straight into the TUI when invoked bare. Also lands a batch of TUI polish: fewer error states, better edit-form ergonomics, and wider test coverage.

### Added

- `docket backlog` — new top-level command that lists backlog tasks; `docket backlog add` parks a new task directly in the backlog (T-10).
- `backlog` status across the model — `docket add --status backlog`, `docket status <id> backlog`, and `docket ls --status backlog` all recognize the new state; backlog tasks are excluded from default `ls`/`ready` output (T-10).
- `kind` field on tasks — every task now carries a kind (defaults to `feature`; known kinds include `feature`, `bug`, `chore`). Propagated through `add`, `update`, `show`, `ls`, and the TUI list/detail/edit views. Schema migration adds the column on existing databases (T-9).
- Bare `docket` invocation launches the TUI — running `docket` with no subcommand now opens the interactive UI instead of printing help (T-16).

### Changed

- TUI edit screen overhauled — improved field navigation, validation feedback, and reduced error states when saving partial edits (T-9).
- `docket` plugin description expanded so the marketplace listing better reflects current capabilities (T-11).

### Tests

- Integration coverage for `backlog` add/list/status transitions, `kind` defaulting and explicit values across CLI verbs, bare-invocation TUI launch, and `update` flows for the new fields.

## [0.0.3] - 2026-05-17

The TUI release. Lands an interactive `docket tui` for navigating, mutating, and starting tasks without leaving the keyboard, plus a `docket update` subcommand for editing tasks in place. The CLI core was extracted into modules along the way (`cli/`, `db/`, `model/`, `prompts/`, `tui/`) so the TUI and CLI share a single data layer.

### Added

- `docket tui` — interactive terminal UI built on ratatui/crossterm. List/detail panes, filters, help overlay, chord-driven keybindings via a scope-based command registry. Keys: `s` cycles status (open → in_progress → done), `d` marks done, `x` deletes (with confirm modal), `n`/`e` open Add/Edit forms, `Tab`/`Shift+Tab` cycle fields, `Ctrl+S` saves, `Esc` on dirty form prompts to discard, `S`/`Ctrl+S` start the cursor task (tmux variant for the latter), live per-field validation with placeholder hints.
- `docket update <id>` — partial-field updates for title, body, acceptance, deps, priority, and group. Requires at least one field; lazily creates the group if missing; replaces deps exactly; bumps `updated_at`. Covered by integration tests for help, flag presence, deps replacement, group creation, missing id, and multi-field updates.
- `docket start --tmux` upgraded — now creates and attaches a fresh tmux session, spawning a terminal if invoked outside of tmux (T-4). The 0.0.2 implementation only opened a window inside an existing session; this closes the gap for "I just want to start a task in a new pane from anywhere."

### Changed

- `docket add` accepts hyphen-prefixed values (e.g. `--body "- bullet"`) without clap mistaking them for flags.
- `src/main.rs` modularized: `cli/` (one file per subcommand handler + dispatcher), `db/` (schema, connection, read-side queries, mutation helpers), `model/` (Task, Group, parse helpers), `prompts/`, `tui/`. The single 750-line `main.rs` is now a ten-line entry point.

### Tests

- End-to-end tests for `add`/`update`/`start` against the built binary; unit tests pin `parse_id`, `parse_deps`, `deps_from_db`.

## [0.0.2] - 2026-05-09

The handoff release. Closes the loop between picking a task and handing it to an agent — `docket start` assembles a task's body, acceptance, and the embedded `tdd-pursuit` discipline into a single ready-to-pipe brief, optionally delivered into a fresh tmux window. Also lands the Claude Code plugin and stands up tag-driven release automation so future versions ship from a two-command flow.

### Added

- `docket start <id>` — assembles `# Task T-N: <title>`, `## Body`, `## Acceptance`, and the verbatim `tdd-pursuit` template into a single stdout blob. Composes with pipes/redirects: `docket start T-N | claude`, `docket start T-N | pbcopy`, `docket start T-N > /tmp/p.md`. Transitions the task to `in_progress` and bumps `updated_at`. Refuses `done` tasks with a hint at `docket status`. Accepts both `T-3` and `3` ID forms.
- `docket start --tmux` — opens the brief in a fresh tmux window, delivering the prompt to a new shell ready for an agent invocation.
- Claude Code plugin (`/docket:create-task`, `/docket:start T-N`) — exposes the CLI verbs as slash commands inside an active session. Installable via `/plugin marketplace add parzival1l/docket` then `/plugin install docket@docket`.
- Hermetic integration test suite for `docket start` — 7 tests covering each acceptance behavior end-to-end against the built binary.

### Changed

- Documentation reorganized into `docs/` — `CHANGELOG.md`, `RESEARCH.md`, `RESEARCH-STORAGE.md`, `ROADMAP.md` moved out of the repo root. Only `README.md` and `LICENSE` remain at the top level.
- Release pipeline now reads release notes from `docs/CHANGELOG.md`.

### Release automation

- `release.toml` — `cargo-release` configuration that bumps `Cargo.toml` + `Cargo.lock`, splits the `Unreleased` section in CHANGELOG into a new dated version section, and commits as `release: <version>` without tagging or pushing.
- `.github/workflows/auto-tag.yml` — fires on push to `main`, reads the version from `Cargo.toml`, creates and pushes the matching `v<version>` tag if absent, then dispatches `release.yml`. Cuts the maintainer flow to two commands: `cargo release X.Y.Z --execute` then `git push origin main`.

## [0.0.1] - 2026-05-09

Initial release. v1 CLI shell with embedded prompts and bundled SQLite store.

### Added

- CLI verbs: `init`, `add`, `ls`, `show`, `ready`, `blocked`, `status`, `done`, `rm`, `prompt`, `group {new,ls,show,close}`.
- Per-repo SQLite store at `.docket/db.sqlite` (auto-gitignored on `init`).
- Two tables: `tasks` (with first-class `acceptance` and `deps` fields) and `groups`.
- Computed `ready` queue and `blocked` debug view from unmet deps.
- Four prompt templates embedded at build time via `include_str!`: `tdd-pursuit`, `create-task`, `commit`, `pr`.
- `--json` output on every list/show command for agent consumption.
- Release pipeline: tag-triggered cross-builds for `{macOS, Linux} × {x86_64, aarch64}`, GitHub Release with checksums, `install.sh` for `curl | bash` install.

### Notes

- Versioning starts at `0.0.x` deliberately. Every shipped item bumps the patch (0.0.2, 0.0.3, …). The cut to `0.1.0` is **maintainer judgment, not a feature checklist** — it happens when the loop feels solid for daily use. `docket start` landing is the most likely trigger but is not by itself sufficient.

[Unreleased]: https://github.com/parzival1l/docket/compare/v0.0.4...HEAD
[0.0.4]: https://github.com/parzival1l/docket/releases/tag/v0.0.4
[0.0.3]: https://github.com/parzival1l/docket/releases/tag/v0.0.3
[0.0.2]: https://github.com/parzival1l/docket/releases/tag/v0.0.2
[0.0.1]: https://github.com/parzival1l/docket/releases/tag/v0.0.1
