'use client'

import { useState } from 'react'
import type { ReadingEntry } from '@/lib/reading'
import { formatDate } from '@/lib/format'

function ArchiveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[15px] w-[15px]"
      aria-hidden="true"
    >
      <rect x="2.5" y="3.5" width="19" height="5" rx="1" />
      <path d="M4.5 8.5V19a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V8.5" />
      <path d="M10 12h4" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-[15px] w-[15px]"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

const ICON_LINK =
  // neutral-500 rather than a lighter gray: it is one of the tokens globals.css
  // remaps under .dark, so the icons stay legible in both themes.
  'inline-flex h-7 w-7 items-center justify-center rounded text-neutral-500 transition-colors hover:text-neutral-900'

const CHIP_BASE =
  'rounded-full border px-2.5 py-0.5 text-xs transition-colors'

export function ReadingList({
  entries,
  tags,
}: {
  entries: ReadingEntry[]
  tags: string[]
}) {
  const [active, setActive] = useState<string | null>(null)

  // Clicking the selected tag again clears the filter.
  function toggle(tag: string) {
    setActive(current => (current === tag ? null : tag))
  }

  const shown = active ? entries.filter(e => e.tags.includes(active)) : entries

  return (
    <>
      {tags.length > 0 ? (
        <div className="mb-10 flex flex-wrap gap-2">
          {tags.map(tag => {
            const on = active === tag
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                aria-pressed={on}
                className={`${CHIP_BASE} ${
                  on
                    ? 'border-accent text-accent'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-500 hover:text-neutral-900'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="space-y-8">
        {shown.map(entry => (
          <article key={entry.url}>
            <p className="text-sm text-neutral-500">{formatDate(entry.date)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-1">
              <a
                href={entry.url}
                target="_blank"
                rel="noreferrer"
                className="text-xl font-medium leading-snug text-neutral-900 transition-colors hover:text-accent"
              >
                {entry.title}
              </a>
              {entry.archive ? (
                <a
                  href={entry.archive}
                  target="_blank"
                  rel="noreferrer"
                  title="Archive.ph snapshot"
                  aria-label={`Archive.ph snapshot of ${entry.title}`}
                  className={ICON_LINK}
                >
                  <ArchiveIcon />
                </a>
              ) : null}
              {entry.repo ? (
                <a
                  href={entry.repo}
                  target="_blank"
                  rel="noreferrer"
                  title="Source code"
                  aria-label={`Source code for ${entry.title}`}
                  className={ICON_LINK}
                >
                  <GitHubIcon />
                </a>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.tags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  aria-pressed={active === tag}
                  className={`${CHIP_BASE} ${
                    active === tag
                      ? 'border-accent text-accent'
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-neutral-600">Nothing here yet.</p>
      ) : null}
    </>
  )
}
