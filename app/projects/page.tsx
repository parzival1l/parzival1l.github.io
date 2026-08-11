import { PageLayout } from '@/components/page-layout'

export const metadata = {
  title: 'Projects',
}

export default function ProjectsPage() {
  return (
    <PageLayout title="Projects">
      <p>A running list of things I&rsquo;m building.</p>
      <p>
        <strong>ThreadHop</strong>: persistent, searchable,
        cross-session memory for Claude Code. Every Claude Code session ships
        as an isolated JSONL transcript; ThreadHop indexes them into SQLite
        with FTS5 full-text search, runs a background extractor that pulls
        TODOs and decisions out of each session, and surfaces decision
        conflicts across sibling sessions. It ships as a TUI browser, a CLI
        that auto-detects the current session, and a Claude Code plugin, all
        sharing the one store. Code on{' '}
        <a href="https://github.com/parzival1l/threadhop">GitHub</a>.
      </p>
      <p>
        <strong>docket</strong>: an agent-shaped task tracker with a
        TDD execution harness, built for solo and small-team coding work. It
        is a per-repo task store (one gitignored SQLite file) plus a curated
        set of prompts that turn an agent&rsquo;s task pickup into a
        disciplined test-driven loop: structured tasks with first-class
        acceptance criteria and dependencies, a <code>ready</code> queue, and
        sequential groups that map to one branch and one PR. It complements
        git and GitHub rather than replacing them. Single static binary,
        written in Rust. Code on{' '}
        <a href="https://github.com/parzival1l/docket">GitHub</a>.
      </p>
    </PageLayout>
  )
}
