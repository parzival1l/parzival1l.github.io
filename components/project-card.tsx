'use client'

import { useEffect, useState } from 'react'

export interface ProjectData {
  name: string
  /** One-paragraph pitch. Plain text, no markup. */
  description: string
  /** GitHub repo slug, e.g. "parzival1l/tidyread". Drives the link and the
      last-commit nudge. */
  repo: string
  /** Short facet chips: language, distribution, whatever earns the space. */
  tags: string[]
}

/** Freshness copy for the last-commit nudge. The point is to needle the
    author when a project sits idle, so staleness gets blunter with age. */
function nudge(pushedAt: string): { label: string; stale: boolean } {
  const days = Math.floor(
    (Date.now() - new Date(pushedAt).getTime()) / 86_400_000,
  )
  if (days <= 0) return { label: 'last commit: today', stale: false }
  if (days === 1) return { label: 'last commit: yesterday', stale: false }
  if (days < 7) return { label: `last commit: ${days} days ago`, stale: false }
  if (days < 30)
    return {
      label: `last commit: ${Math.floor(days / 7)}w ago`,
      stale: false,
    }
  if (days < 365)
    return {
      label: `gathering dust for ${Math.floor(days / 30)} months`,
      stale: true,
    }
  return { label: `abandoned ${Math.floor(days / 365)}y ago?`, stale: true }
}

/** Client-side fetch of the repo's last push. Unauthenticated GitHub API:
    60 requests/hour per visitor is plenty for a handful of cards. On any
    failure the badge simply doesn't render — never block the card. */
function useLastPush(repo: string): string | null {
  const [pushedAt, setPushedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`https://api.github.com/repos/${repo}`, {
      headers: { accept: 'application/vnd.github+json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.pushed_at) setPushedAt(data.pushed_at)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [repo])

  return pushedAt
}

export function ProjectCard({ project }: { project: ProjectData }) {
  const pushedAt = useLastPush(project.repo)
  const freshness = pushedAt ? nudge(pushedAt) : null

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-5 transition-colors hover:border-neutral-500">
      <div className="flex items-baseline justify-between gap-3">
        <a
          href={`https://github.com/${project.repo}`}
          className="text-base font-medium text-neutral-900 underline-offset-4 hover:underline"
        >
          {project.name}
        </a>
        {freshness ? (
          <span
            className={`text-xs whitespace-nowrap ${
              freshness.stale ? 'text-amber-600' : 'text-neutral-500'
            }`}
            title={pushedAt ?? undefined}
          >
            {freshness.label}
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-neutral-600">
        {project.description}
      </p>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs text-neutral-500"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}
