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
    url: 'https://docket.parzival.computer',
    description:
      'Dispatch work to any coding agent. A per-repo SQLite queue of tasks ' +
      'with acceptance criteria and deps first-class; whoever is free runs ' +
      'docket ready, picks the next one, and ships it on the group\u2019s ' +
      'branch. One group, one branch, one PR. Single static Rust binary.',
    tags: ['Rust', 'CLI', 'SQLite', 'agents'],
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
