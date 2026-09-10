import { PageLayout } from '@/components/page-layout'
import { ProjectCard, type ProjectData } from '@/components/project-card'

export const metadata = {
  title: 'Projects',
}

/** Card order is the display order: newest work first. The last-commit
    badge on each card comes live from the GitHub API — it exists to shame
    me into committing, so don't cache it. */
const projects: ProjectData[] = [
  {
    name: 'tidyread',
    repo: 'parzival1l/tidyread',
    description:
      'Cleans a web article locally, then hands it to Instapaper pre-chewed: ' +
      'defuddle extraction, image and code-block repair, a short-lived ' +
      'cloudflared tunnel for the handoff, and a Kobo-ready KEPUB as a side ' +
      'effect. The public URL dies when the process exits.',
    tags: ['TypeScript', 'CLI', 'npm', 'e-ink'],
  },
  {
    name: 'ThreadHop',
    repo: 'parzival1l/threadhop',
    url: 'https://threadhop.parzival.computer',
    description:
      'Local-first session manager for coding agents. Indexes every transcript ' +
      'on the machine into one SQLite + FTS5 store, searches across projects ' +
      'and agents, and lets any session borrow another\u2019s context with a ' +
      'single ticket. TUI, CLI, and agent plugin on one store.',
    tags: ['SQLite', 'FTS5', 'TUI', 'Rust', 'agents'],
  },
  {
    name: 'docket',
    repo: 'parzival1l/docket',
    description:
      'Agent-shaped task tracker with a TDD execution harness, for solo and ' +
      'small-team coding work. Per-repo SQLite task store plus curated prompts ' +
      'that turn task pickup into a disciplined test-driven loop: acceptance ' +
      'criteria and deps first-class, a ready queue, groups that map to one ' +
      'branch and one PR. Single static Rust binary.',
    tags: ['Rust', 'CLI', 'TDD', 'agents'],
  },
]

export default function ProjectsPage() {
  return (
    <PageLayout title="Projects">
      <p>A running list of things I&rsquo;m building.</p>
      <div className="not-prose mt-8 grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.repo} project={project} />
        ))}
      </div>
    </PageLayout>
  )
}
