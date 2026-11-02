'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export interface FilterTab<K extends string> {
  /** `null` is the "All" tab. */
  key: K | null
  label: string
  count: number
  icon?: ReactNode
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

/**
 * Tabs with counts on the left, search on the right, over a hairline. Shared
 * by Blog and Reading so both index pages filter the same way. "/" focuses
 * search unless the reader is already typing. On a phone the tabs scroll
 * sideways with the scrollbar hidden.
 */
export function FilterBar<K extends string>({
  tabs,
  active,
  onSelect,
  query,
  onQuery,
  label,
  searchLabel,
}: {
  tabs: FilterTab<K>[]
  active: K | null
  onSelect: (key: K | null) => void
  query: string
  onQuery: (query: string) => void
  /** What the tabs filter by, for screen readers ("Filter by type"). */
  label: string
  searchLabel: string
}) {
  const searchRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="flex flex-col gap-3 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div role="group" aria-label={label} className="-mx-6 flex gap-5 overflow-x-auto px-6 text-sm [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {tabs.map(tab => {
          const isActive = active === tab.key
          return (
            <button
              key={tab.label}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(tab.key)}
              className={`flex flex-none items-center gap-1.5 whitespace-nowrap py-1 ${
                isActive ? 'font-medium text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.icon}
              {/* Only the label is underlined, so the mark stays one piece. */}
              <span className={isActive ? 'underline decoration-accent underline-offset-[6px]' : undefined}>
                {tab.label}
              </span>
              <span className="text-[0.8125rem] font-normal tabular-nums text-neutral-500">{tab.count}</span>
            </button>
          )
        })}
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-500 focus-within:text-neutral-900">
        <SearchIcon />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Search"
          aria-label={searchLabel}
          className="w-full bg-transparent py-1 text-neutral-900 outline-none placeholder:text-neutral-500 sm:w-32"
        />
        <kbd className="hidden rounded border border-neutral-200 px-1.5 text-xs text-neutral-500 sm:inline">/</kbd>
      </label>
    </div>
  )
}
