'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  TYPE_LABELS,
  domainOf,
  type ReadingEntry,
  type ReadingType,
} from '@/lib/reading-shared'
import { formatMonth, formatShortDate } from '@/lib/format'

/** Entries rendered before "Show older entries"; each click adds as many. */
const PAGE = 20

const MONO_LABEL = 'font-mono text-[11px] uppercase tracking-[0.06em] text-neutral-500'

// No hover transitions on purpose: this page has no motion at all.
const TITLE_LINK = 'text-neutral-900 hover:text-accent'
const QUIET_LINK =
  'underline decoration-neutral-300 underline-offset-[3px] hover:text-neutral-900 dark:decoration-neutral-600'

/** Read `?tag=` from the address bar. */
function tagFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('tag')
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      className="h-3.5 w-3.5 flex-none"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.9-4.9" />
    </svg>
  )
}

/** The small line under an entry: tags, then archive and code links. */
function EntryFooter({
  entry,
  onTag,
}: {
  entry: ReadingEntry
  onTag: (tag: string) => void
}) {
  const links: React.ReactNode[] = [
    ...entry.tags.map(tag => (
      <a
        key={`tag-${tag}`}
        href={`/reading/?tag=${encodeURIComponent(tag)}`}
        onClick={e => {
          e.preventDefault()
          onTag(tag)
        }}
        className="hover:text-neutral-900"
      >
        {tag}
      </a>
    )),
  ]
  if (entry.archive) {
    links.push(
      <a key="archive" href={entry.archive} target="_blank" rel="noreferrer" className={QUIET_LINK}>
        archive
      </a>,
    )
  }
  if (entry.repo) {
    links.push(
      <a key="repo" href={entry.repo} target="_blank" rel="noreferrer" className={QUIET_LINK}>
        code
      </a>,
    )
  }
  if (links.length === 0) return null
  return (
    <p className="font-mono text-xs leading-5 text-neutral-500">
      {links.map((link, i) => (
        <span key={i}>
          {i > 0 ? <span aria-hidden="true"> · </span> : null}
          {link}
        </span>
      ))}
    </p>
  )
}

/** Title and summary of the linked source, under a thin grey rule. */
function SourceCitation({ entry }: { entry: ReadingEntry }) {
  if (!entry.url) return null
  return (
    <div className="flex max-w-[600px] flex-col gap-1 border-l-2 border-neutral-200 py-0.5 pl-3.5">
      <a
        href={entry.url}
        target="_blank"
        rel="noreferrer"
        className={`text-[15px] font-medium leading-snug ${TITLE_LINK}`}
      >
        {entry.title} <span className="font-normal text-neutral-500">↗</span>
      </a>
      {entry.summary ? (
        <p className="text-sm leading-relaxed text-neutral-600">{entry.summary}</p>
      ) : null}
    </div>
  )
}

function Entry({
  entry,
  showDate,
  onTag,
}: {
  entry: ReadingEntry
  /** False when the entry above has the same date; the gutter stays blank. */
  showDate: boolean
  onTag: (tag: string) => void
}) {
  const date = formatShortDate(entry.date)
  return (
    <article className="flex gap-6">
      <time
        dateTime={entry.date}
        className="hidden w-16 flex-none font-mono text-xs leading-[26px] text-neutral-500 sm:block"
      >
        {showDate ? date : null}
      </time>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <p className={`leading-[26px] ${MONO_LABEL}`}>
          <span className="sm:hidden">{date} · </span>
          {TYPE_LABELS[entry.type].one}
          {entry.url ? <> · {domainOf(entry.url)}</> : null}
        </p>

        {entry.note ? (
          <>
            <p className="max-w-[600px] text-base leading-[26px] text-neutral-900 sm:text-[17px] sm:leading-7">
              {entry.note}
            </p>
            {entry.slug ? (
              <p className="text-[15px] leading-6">
                <Link href={`/reading/${entry.slug}/`} className="font-medium text-accent hover:underline">
                  Read the full note →
                </Link>{' '}
                <span className="font-mono text-xs text-neutral-500">
                  {entry.readingMinutes} min
                </span>
              </p>
            ) : null}
            <SourceCitation entry={entry} />
          </>
        ) : (
          <div className="-mt-1.5 flex flex-col gap-1">
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className={`text-base font-medium leading-6 ${TITLE_LINK}`}
            >
              {entry.title} <span className="font-normal text-neutral-500">↗</span>
            </a>
            {entry.summary ? (
              <p className="max-w-[600px] text-sm leading-relaxed text-neutral-600">
                {entry.summary}
              </p>
            ) : null}
          </div>
        )}

        <EntryFooter entry={entry} onTag={onTag} />
      </div>
    </article>
  )
}

export function ReadingFeed({ entries }: { entries: ReadingEntry[] }) {
  const [activeType, setActiveType] = useState<ReadingType | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const searchRef = useRef<HTMLInputElement>(null)

  // The static export can't know the query string at build time, so the tag
  // filter is read after hydration. Back/forward keeps it in sync.
  useEffect(() => {
    const sync = () => setActiveTag(tagFromUrl())
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  // "/" jumps to search, unless the reader is already typing somewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function chooseTag(tag: string | null) {
    setActiveTag(tag)
    setLimit(PAGE)
    const url = tag ? `/reading/?tag=${encodeURIComponent(tag)}` : '/reading/'
    window.history.pushState(null, '', url)
    window.scrollTo({ top: 0 })
  }

  function clearAll() {
    setActiveType(null)
    setQuery('')
    chooseTag(null)
  }

  // Tag and search narrow everything; the type tabs then split what is left,
  // so each tab's count is what clicking it would show.
  const q = query.trim().toLowerCase()
  const narrowed = entries.filter(entry => {
    if (activeTag && !entry.tags.includes(activeTag)) return false
    if (!q) return true
    const haystack = [entry.title, entry.summary, entry.note, entry.url, ...entry.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
  const counts = new Map<ReadingType, number>()
  for (const entry of narrowed) counts.set(entry.type, (counts.get(entry.type) ?? 0) + 1)
  const typesPresent = (Object.keys(TYPE_LABELS) as ReadingType[]).filter(t =>
    entries.some(e => e.type === t),
  )

  const shown = activeType ? narrowed.filter(e => e.type === activeType) : narrowed
  const visible = shown.slice(0, limit)

  const months: { key: string; entries: ReadingEntry[] }[] = []
  for (const entry of visible) {
    const key = entry.date.slice(0, 7)
    const last = months[months.length - 1]
    if (last?.key === key) last.entries.push(entry)
    else months.push({ key, entries: [entry] })
  }

  const tabs: { type: ReadingType | null; label: string; count: number }[] = [
    { type: null, label: 'All', count: narrowed.length },
    ...typesPresent.map(t => ({ type: t, label: TYPE_LABELS[t].many, count: counts.get(t) ?? 0 })),
  ]

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filter by type"
          className="-mx-6 flex gap-5 overflow-x-auto px-6 text-sm sm:mx-0 sm:px-0"
        >
          {tabs.map(tab => {
            const active = activeType === tab.type
            return (
              <button
                key={tab.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setActiveType(tab.type)
                  setLimit(PAGE)
                }}
                className={`flex-none whitespace-nowrap py-1 ${
                  active
                    ? 'font-medium text-neutral-900 underline decoration-accent underline-offset-[6px]'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tab.label}{' '}
                <span className="font-mono text-xs font-normal text-neutral-500">{tab.count}</span>
              </button>
            )
          })}
        </div>
        <label className="flex items-center gap-2 rounded-md text-sm text-neutral-500 focus-within:text-neutral-900">
          <SearchIcon />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setLimit(PAGE)
            }}
            placeholder="Search"
            aria-label="Search the reading log"
            className="w-full bg-transparent py-1 text-neutral-900 outline-none placeholder:text-neutral-500 sm:w-32"
          />
          <kbd className="hidden rounded border border-neutral-200 px-1.5 font-mono text-[11px] text-neutral-500 sm:inline">
            /
          </kbd>
        </label>
      </div>

      {activeTag ? (
        <p className="mt-6 text-sm text-neutral-600">
          Tagged <span className="font-medium text-neutral-900">{activeTag}</span>
          <span aria-hidden="true"> · </span>
          <button type="button" onClick={() => chooseTag(null)} className="text-accent hover:underline">
            Clear
          </button>
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="mt-12 text-neutral-600">
          <p>Nothing in the log matches this.</p>
          <button type="button" onClick={clearAll} className="mt-2 text-accent hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-12 flex flex-col gap-14">
          {months.map(month => (
            <section key={month.key} aria-label={formatMonth(month.key + '-01')} className="flex flex-col gap-9">
              <h2 className="font-mono text-xs uppercase tracking-[0.06em] text-neutral-500">
                {formatMonth(month.key + '-01')}
              </h2>
              {month.entries.map((entry, i) => (
                <Entry
                  key={entry.id}
                  entry={entry}
                  showDate={i === 0 || month.entries[i - 1].date !== entry.date}
                  onTag={chooseTag}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      {shown.length > visible.length ? (
        <div className="mt-14 flex flex-col items-stretch gap-2 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:gap-6">
          <span className="hidden w-16 flex-none sm:block" />
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={() => setLimit(l => l + PAGE)}
              className="rounded-md border border-neutral-200 px-3.5 py-3 text-[15px] font-medium text-neutral-900 hover:border-neutral-500 active:bg-neutral-100 sm:py-2 sm:text-sm dark:active:bg-white/5"
            >
              Show older entries
            </button>
            <span className="text-center font-mono text-xs text-neutral-500">
              {visible.length} of {shown.length} shown
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
