'use client'

import { useState } from 'react'
import { PostCard, type PostCardData } from '@/components/post-card'
import { BADGE_INNER, BADGE_SHELL } from '@/components/date-badge'

export interface BlogFeedPost extends PostCardData {
  /** Union of the post's categories + tags; drives sidebar filtering. */
  tags: string[]
}

const HEADING = 'text-xs font-medium uppercase tracking-wider text-neutral-500'

const CHIP_BASE =
  'rounded-full border px-2.5 py-0.5 text-xs transition-colors'

/** Tags visible before the "Show more" toggle. */
const TAG_PREVIEW_COUNT = 3

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
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

/**
 * Search toggle in the same ringed shell as the date badge, so it reads as
 * part of the page's badge family. Turns accent while a query is active so
 * a hidden-but-applied search is still visible.
 */
function SearchBadge({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Search posts"
      aria-pressed={active}
      title="Search posts"
      className={`${BADGE_SHELL} transition-colors ${
        active ? 'text-accent' : 'text-neutral-500 hover:text-neutral-900'
      }`}
    >
      <span className={`${BADGE_INNER} items-center justify-center`}>
        <SearchIcon />
      </span>
    </button>
  )
}

export function BlogFeed({
  posts,
  tags,
}: {
  posts: BlogFeedPost[]
  tags: string[]
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [showAllTags, setShowAllTags] = useState(false)

  const q = query.trim().toLowerCase()
  const shown = posts.filter(p => {
    // A row survives only if it carries at least one selected tag.
    if (activeTags.length > 0 && !activeTags.some(t => p.tags.includes(t))) {
      return false
    }
    if (q) {
      const haystack =
        `${p.title} ${p.description ?? ''} ${p.tags.join(' ')}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  function toggleTag(tag: string) {
    setActiveTags(current =>
      current.includes(tag)
        ? current.filter(t => t !== tag)
        : [...current, tag],
    )
  }

  // Hide the line only when it's open and empty; a typed query keeps it
  // visible so the active filter stays discoverable.
  const searchVisible = searchOpen || query.trim() !== ''
  // Selected tags always render, even if they'd hide behind "Show more".
  const visibleTags =
    showAllTags || activeTags.some(t => !tags.slice(0, TAG_PREVIEW_COUNT).includes(t))
      ? tags
      : tags.slice(0, TAG_PREVIEW_COUNT)

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-x-10">
      <aside className="order-first self-start lg:order-none lg:col-start-2 lg:sticky lg:top-6">
        <h2 className={HEADING}>Tags</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={activeTags.includes(tag)}
              className={`${CHIP_BASE} ${
                activeTags.includes(tag)
                  ? 'border-accent text-accent'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-500 hover:text-neutral-900'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        {tags.length > TAG_PREVIEW_COUNT ? (
          <button
            type="button"
            onClick={() => setShowAllTags(o => !o)}
            aria-expanded={showAllTags}
            className="mt-3 text-sm text-accent hover:underline"
          >
            {showAllTags ? 'Show less' : 'Show more'}
          </button>
        ) : null}
      </aside>

      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <div className="mb-10 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-medium text-neutral-900">Blogs</h1>
          <SearchBadge
            active={searchVisible}
            onToggle={() => setSearchOpen(o => !o)}
          />
        </div>
        {searchVisible ? (
          <div className="relative mb-6">
            <SearchIcon className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
              type="search"
              autoFocus={searchOpen}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search posts…"
              aria-label="Search posts"
              className="w-full border-b border-neutral-200 bg-transparent py-1.5 pl-6 pr-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-500 focus:border-neutral-500"
            />
          </div>
        ) : null}
        <ul className="space-y-3">
          {shown.map(p => (
            <li key={p.slug}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
        {shown.length === 0 ? (
          <div className="py-6 text-neutral-600">
            <p>Nothing matches these filters.</p>
            <button
              type="button"
              onClick={() => {
                setActiveTags([])
                setQuery('')
              }}
              className="mt-2 text-accent hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
