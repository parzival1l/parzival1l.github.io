'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReadingEntry, ReadingType } from '@/lib/reading'
import { formatDate } from '@/lib/format'

const TYPE_LABELS: Record<ReadingType, string> = {
  article: 'Article',
  paper: 'Paper',
  video: 'Video',
  tweet: 'Tweet',
  repo: 'Repo',
}

function TypeIcon({ type, className }: { type: ReadingType; className?: string }) {
  const cls = className ?? 'h-4 w-4'
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: cls,
    'aria-hidden': true,
  } as const
  switch (type) {
    case 'article':
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
          <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
        </svg>
      )
    case 'paper':
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M9.5 3h5" />
          <path d="M10.5 3v5L5.7 17.6A2.4 2.4 0 0 0 7.8 21h8.4a2.4 2.4 0 0 0 2.1-3.4L13.5 8V3" />
          <path d="M7.5 14.5h9" />
        </svg>
      )
    case 'video':
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
          <path d="M10 9.75v4.5l4-2.25z" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'tweet':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case 'repo':
      return (
        <svg viewBox="0 0 24 24" {...stroke}>
          <path d="M8 6.5 3 12l5 5.5M16 6.5 21 12l-5 5.5" />
        </svg>
      )
  }
}

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

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * My note on the piece below: a small pencil marks it as commentary, the
 * text sets italic at a smaller size. Clamps to 4 lines only when that
 * hides more than a line or so — a note that barely overflows just renders
 * in full, with no toggle.
 */
function Thoughts({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [mode, setMode] = useState<'measure' | 'fits' | 'clamped' | 'open'>(
    'measure',
  )

  useEffect(() => {
    const el = ref.current
    if (!el || mode !== 'measure') return
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24
    setMode(el.scrollHeight - el.clientHeight > lineHeight * 1.5 ? 'clamped' : 'fits')
  }, [mode])

  const clamped = mode === 'measure' || mode === 'clamped'

  return (
    <div>
      <p
        ref={ref}
        className={`whitespace-pre-line text-sm italic leading-relaxed ${
          clamped ? 'line-clamp-4' : ''
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1.5 inline-block h-3.5 w-3.5 align-[-0.15em] text-neutral-500"
          aria-hidden="true"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
        {text}
      </p>
      {mode === 'clamped' || mode === 'open' ? (
        <button
          type="button"
          onClick={() => setMode(m => (m === 'open' ? 'clamped' : 'open'))}
          aria-expanded={mode === 'open'}
          className="mt-1 text-sm not-italic text-accent hover:underline"
        >
          {mode === 'open' ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  )
}

/** The referenced piece, rendered like the quoted tweet in a quote tweet. */
function QuoteCard({
  entry,
  activeTag,
  onTag,
}: {
  entry: ReadingEntry
  activeTag: string | null
  onTag: (tag: string) => void
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
          <TypeIcon type={entry.type} className="h-3.5 w-3.5" />
          <span className="font-medium">{TYPE_LABELS[entry.type]}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{domainOf(entry.url)}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{formatDate(entry.date)}</span>
        </span>
        <span className="flex flex-none items-center">
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
        </span>
      </div>
      <a
        href={entry.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block text-[15px] font-medium leading-snug text-neutral-900 transition-colors hover:text-accent"
      >
        {entry.title}
      </a>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-600">
        {entry.summary}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {entry.tags.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => onTag(tag)}
            aria-pressed={activeTag === tag}
            className={`${CHIP_BASE} ${
              activeTag === tag
                ? 'border-accent text-accent'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-500 hover:text-neutral-900'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}

/** One filter row in the right rail: label on the left, count on the right. */
function FilterRow({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`-ml-2 flex w-full items-center justify-between gap-2 border-l-2 pl-1.5 text-left text-sm transition-colors ${
        active
          ? 'border-accent font-medium text-neutral-900'
          : 'border-transparent text-neutral-600 hover:text-neutral-900'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {count != null ? (
        <span className="text-xs text-neutral-500">{count}</span>
      ) : null}
    </button>
  )
}

const HEADING = 'text-xs font-medium uppercase tracking-wider text-neutral-500'

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-4 w-4'}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.9-4.9" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/** A collapsible filter group in the right rail; collapsed by default. */
function FilterGroup({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h2 className={HEADING}>{title}</h2>
        <span className="text-neutral-500">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open ? <div className="mt-3 space-y-2">{children}</div> : null}
    </div>
  )
}

export function ReadingFeed({
  entries,
  tags,
  types,
  header,
}: {
  entries: ReadingEntry[]
  tags: string[]
  types: ReadingType[]
  /** Page title + intro, aligned over the center column on desktop. */
  header: React.ReactNode
}) {
  const [activeType, setActiveType] = useState<ReadingType | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [typeOpen, setTypeOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)

  // Stable anchor ids follow the full (unfiltered) list order.
  const withIds = entries.map((entry, i) => ({ entry, id: `entry-${i}` }))
  const pinned = withIds.filter(({ entry }) => entry.pinned)

  const tagCounts = new Map<string, number>()
  const typeCounts = new Map<ReadingType, number>()
  for (const entry of entries) {
    typeCounts.set(entry.type, (typeCounts.get(entry.type) ?? 0) + 1)
    for (const tag of entry.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  }

  // Clicking the selected filter again clears it.
  function toggleTag(tag: string) {
    setActiveTag(current => (current === tag ? null : tag))
  }

  const q = query.trim().toLowerCase()
  const shown = withIds.filter(({ entry }) => {
    if (activeType && entry.type !== activeType) return false
    if (activeTag && !entry.tags.includes(activeTag)) return false
    if (q) {
      const haystack =
        `${entry.title} ${entry.summary} ${entry.thoughts ?? ''} ${entry.tags.join(' ')}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  /** A pinned click clears any narrowing first, then scrolls to the entry. */
  function goTo(id: string) {
    setActiveType(null)
    setActiveTag(null)
    setQuery('')
    // Wait for React to commit the unfiltered list before scrolling.
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 50)
  }

  const filters = (
    <>
      <FilterGroup
        title="Type"
        open={typeOpen || activeType !== null}
        onToggle={() => setTypeOpen(o => !o)}
      >
        <FilterRow
          label="All"
          count={entries.length}
          active={activeType === null}
          onClick={() => setActiveType(null)}
        />
        {types.map(type => (
          <FilterRow
            key={type}
            label={TYPE_LABELS[type]}
            count={typeCounts.get(type)}
            active={activeType === type}
            onClick={() =>
              setActiveType(current => (current === type ? null : type))
            }
            icon={<TypeIcon type={type} className="h-3.5 w-3.5" />}
          />
        ))}
      </FilterGroup>
      <FilterGroup
        title="Tags"
        open={tagOpen || activeTag !== null}
        onToggle={() => setTagOpen(o => !o)}
      >
        <FilterRow
          label="All tags"
          active={activeTag === null}
          onClick={() => setActiveTag(null)}
        />
        {tags.map(tag => (
          <FilterRow
            key={tag}
            label={tag}
            count={tagCounts.get(tag)}
            active={activeTag === tag}
            onClick={() => toggleTag(tag)}
          />
        ))}
      </FilterGroup>
    </>
  )

  return (
    <div className="grid gap-12 lg:grid-cols-[200px_minmax(0,1fr)_220px] lg:gap-x-10">
      {/* Explicit lg placement keeps the three rails in row 2 under the
          header; order classes alone control the mobile stack. */}
      <div className="order-first lg:order-none lg:col-start-2 lg:col-span-2">
        {header}
      </div>
      <div className="order-2 min-w-0 lg:order-none lg:col-start-2 lg:row-start-2 lg:border-x lg:border-neutral-200">
        <div>
          {shown.map(({ entry, id }) => (
            <article
              key={entry.url}
              id={id}
              className="scroll-mt-6 border-b border-neutral-200 px-1 py-6 last:border-b-0 lg:px-6"
            >
              {entry.thoughts ? <Thoughts text={entry.thoughts} /> : null}
              <QuoteCard entry={entry} activeTag={activeTag} onTag={toggleTag} />
            </article>
          ))}
        </div>
        {shown.length === 0 ? (
          <div className="px-1 py-6 text-neutral-600 lg:px-6">
            <p>Nothing matches these filters.</p>
            <button
              type="button"
              onClick={() => {
                setActiveType(null)
                setActiveTag(null)
                setQuery('')
              }}
              className="mt-2 text-accent hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      <aside className="order-3 self-start lg:order-none lg:col-start-1 lg:row-start-2 lg:sticky lg:top-6">
        {pinned.length > 0 ? (
          <div>
            <h2 className={HEADING}>Pinned</h2>
            <div className="mt-3 space-y-1">
              {pinned.map(({ entry, id }) => (
                <a
                  key={entry.url}
                  href={`#${id}`}
                  onClick={e => {
                    e.preventDefault()
                    goTo(id)
                  }}
                  className="group flex items-start gap-2.5 py-1.5"
                >
                  <span className="mt-0.5 flex-none text-neutral-500">
                    <TypeIcon type={entry.type} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-snug text-neutral-900 transition-colors group-hover:text-accent">
                      {entry.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-500">
                      {domainOf(entry.url)}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </aside>

      {/* On mobile the rail sits above the feed, groups side by side. */}
      <aside className="order-1 self-start lg:order-none lg:col-start-3 lg:row-start-2 lg:sticky lg:top-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes…"
            aria-label="Search reading notes"
            className="w-full border border-neutral-200 bg-transparent py-1.5 pl-9 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-500 focus:border-neutral-500"
          />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-8 lg:grid-cols-1 lg:gap-10">
          {filters}
        </div>
      </aside>
    </div>
  )
}
