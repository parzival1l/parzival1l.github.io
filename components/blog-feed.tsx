'use client'

import { useState } from 'react'
import { PostCard, type PostCardData } from '@/components/post-card'
import { FilterBar, type FilterTab } from '@/components/filter-bar'

export interface BlogFeedPost extends PostCardData {
  /** The post's first category; drives the tabs. */
  category?: string
}

/**
 * The blog index: the same filter bar as Reading (category tabs with counts,
 * search on the right, "/" to focus it) over the post rows.
 */
export function BlogFeed({ posts }: { posts: BlogFeedPost[] }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Search narrows everything; the tabs then split what is left, so each
  // tab's count is what clicking it would show. Search also matches tags.
  const q = query.trim().toLowerCase()
  const narrowed = posts.filter(p => {
    if (!q) return true
    return `${p.title} ${p.description ?? ''} ${p.tags.join(' ')}`.toLowerCase().includes(q)
  })
  const counts = new Map<string, number>()
  for (const p of narrowed) {
    if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
  }
  // Categories in order of how many posts use them, then alphabetically.
  const categories = [...new Set(posts.map(p => p.category).filter((c): c is string => Boolean(c)))].sort(
    (a, b) => {
      const byCount = posts.filter(p => p.category === b).length - posts.filter(p => p.category === a).length
      return byCount || a.localeCompare(b)
    },
  )
  const tabs: FilterTab<string>[] = [
    { key: null, label: 'All', count: narrowed.length },
    ...categories.map(c => ({ key: c, label: c, count: counts.get(c) ?? 0 })),
  ]

  const shown = activeCategory ? narrowed.filter(p => p.category === activeCategory) : narrowed

  return (
    <div>
      <FilterBar
        tabs={tabs}
        active={activeCategory}
        onSelect={setActiveCategory}
        query={query}
        onQuery={setQuery}
        label="Filter by category"
        searchLabel="Search posts"
      />
      {shown.length === 0 ? (
        <div className="mt-12 text-neutral-600">
          <p>No post matches this.</p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory(null)
              setQuery('')
            }}
            className="mt-2 text-accent hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {shown.map(p => (
            <li key={p.slug}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
