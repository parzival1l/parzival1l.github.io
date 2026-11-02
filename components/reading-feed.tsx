'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  TYPE_LABELS,
  type ReadingEntry,
  type ReadingType,
} from '@/lib/reading-shared'
import { formatMonth } from '@/lib/format'
import { TypeIcon } from '@/components/reading-icons'
import { DateBadge, dateParts } from '@/components/date-badge'
import { FilterBar, type FilterTab } from '@/components/filter-bar'

/** Entries rendered before "Show older entries"; each click adds as many. */
const PAGE = 20

// One family on this page: labels are small sans in sentence case.
const META = 'text-[13px] text-neutral-500'

// No hover transitions on purpose: this page has no motion at all.
const TITLE_LINK = 'text-neutral-900 hover:text-accent'

// The rule that marks my words. Solid in dark mode, where alpha borders glow.
const NOTE_RULE = 'border-neutral-300 dark:border-[#3a3a3a]'

// Two lanes inside an entry: markers (type icon, note rule) sit at the left
// edge, and every line of text starts 24px in, so titles and notes align.
const TEXT_LANE = 'pl-6'

// Fixed slot for the date tile, kept even when a same-day entry hides it.
const BADGE_SLOT = 'w-[52px] flex-none'

/**
 * The type icon and title. A linked entry opens the source; a long note with
 * no link opens its own page.
 */
function EntryTitle({ entry }: { entry: ReadingEntry }) {
  const cls = `text-[17px] font-medium leading-snug ${TITLE_LINK}`
  const label = <span className="sr-only">{TYPE_LABELS[entry.type].one}: </span>
  const title = entry.url ? (
    <a href={entry.url} target="_blank" rel="noreferrer" className={cls}>
      {label}
      {entry.title}
    </a>
  ) : entry.slug ? (
    <Link href={`/reading/${entry.slug}/`} className={cls}>
      {label}
      {entry.title}
    </Link>
  ) : null
  if (!title) return null
  return (
    // font-sans: entry titles use the body cut, like Blog rows. The global h3
    // rule would put them in the heading cut, which reads heavier than Blog.
    <h3 className="relative pl-6 font-sans">
      <span className="absolute left-0 top-[3px] text-neutral-500">
        <TypeIcon type={entry.type} />
      </span>
      {title}
    </h3>
  )
}

/**
 * One log entry: the type icon and title, then my take under a thin rule.
 * A plain note has no title, so its pencil icon sits beside the text instead.
 */
function Entry({
  entry,
  showDate,
}: {
  entry: ReadingEntry
  /** False when the entry above has the same date; the gutter stays blank. */
  showDate: boolean
}) {
  const { mon, day } = dateParts(entry.date)
  const hasTitle = Boolean(entry.url || entry.slug)
  return (
    <article className="flex gap-4">
      {/* The blog's calendar tile, so dates read the same on both pages. */}
      <time dateTime={entry.date} className={BADGE_SLOT}>
        {showDate ? <DateBadge mon={mon} day={day} /> : null}
      </time>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-3">
        <EntryTitle entry={entry} />
        {entry.note && hasTitle ? (
          <p className={`max-w-[624px] border-l-2 ${NOTE_RULE} pl-[22px] text-base leading-[26px] text-neutral-700`}>
            <span className="sr-only">My take: </span>
            {entry.note}
          </p>
        ) : null}
        {entry.note && !hasTitle ? (
          <p className="relative max-w-[624px] pl-6 text-[17px] leading-[26px] text-neutral-900">
            <span className="absolute left-0 top-[5px] text-neutral-500">
              <TypeIcon type="note" />
            </span>
            <span className="sr-only">Note: </span>
            {entry.note}
          </p>
        ) : null}
        {entry.slug ? (
          <p className={`${TEXT_LANE} text-[15px] leading-6`}>
            <Link href={`/reading/${entry.slug}/`} className="font-medium text-accent hover:underline">
              Read the full note
            </Link>{' '}
            <span className={META}>· {entry.readingMinutes} min read</span>
          </p>
        ) : null}
      </div>
    </article>
  )
}

export function ReadingFeed({ entries }: { entries: ReadingEntry[] }) {
  const [activeType, setActiveType] = useState<ReadingType | null>(null)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  function clearAll() {
    setActiveType(null)
    setQuery('')
    setLimit(PAGE)
  }

  // Search narrows everything; the type tabs then split what is left, so each
  // tab's count is what clicking it would show. Tags are not shown, but
  // search still matches them.
  const q = query.trim().toLowerCase()
  const narrowed = entries.filter(entry => {
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

  const tabs: FilterTab<ReadingType>[] = [
    { key: null, label: 'All', count: narrowed.length },
    ...typesPresent.map(t => ({
      key: t,
      label: TYPE_LABELS[t].many,
      count: counts.get(t) ?? 0,
      icon: <TypeIcon type={t} className="h-3.5 w-3.5 text-neutral-500" />,
    })),
  ]

  return (
    <div>
      <FilterBar
        tabs={tabs}
        active={activeType}
        onSelect={key => {
          setActiveType(key)
          setLimit(PAGE)
        }}
        query={query}
        onQuery={value => {
          setQuery(value)
          setLimit(PAGE)
        }}
        label="Filter by type"
        searchLabel="Search notes"
      />

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
              <h2 className="text-sm font-medium text-neutral-900">
                {formatMonth(month.key + '-01')}
              </h2>
              {month.entries.map((entry, i) => (
                <Entry
                  key={entry.id}
                  entry={entry}
                  showDate={i === 0 || month.entries[i - 1].date !== entry.date}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      {shown.length > visible.length ? (
        <div className="mt-14 flex flex-col items-stretch gap-2 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:gap-4">
          <span className={`hidden sm:block ${BADGE_SLOT}`} />
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={() => setLimit(l => l + PAGE)}
              className="rounded-md border border-neutral-200 px-3.5 py-3 text-[15px] font-medium text-neutral-900 hover:border-neutral-500 active:bg-neutral-100 sm:py-2 sm:text-sm dark:active:bg-white/5"
            >
              Show older entries
            </button>
            <span className="text-center text-[13px] tabular-nums text-neutral-500">
              {visible.length} of {shown.length} shown
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
