'use client'

import { useEffect, useState } from 'react'
import type { PostHeading } from '@/lib/posts'

/**
 * Left-rail table of contents. Each entry renders as a short line ("baton");
 * hovering or tabbing into the rail fades the lines out and the section
 * titles in. h2 entries get a long line, h3 a short one. A scroll listener
 * marks the section currently being read as active (darkest line/title).
 *
 * Hidden below the xl breakpoint: narrower screens keep the plain article.
 */
export function PostToc({ headings }: { headings: PostHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    const update = () => {
      // The active section is the last heading above the reading line
      // (~25% down the viewport). Above the first heading, fall back to the
      // first entry so the rail always has one highlighted line.
      const readingLine = window.scrollY + window.innerHeight * 0.25
      let current: string | null = elements[0].id
      for (const el of elements) {
        const top = el.getBoundingClientRect().top + window.scrollY
        if (top <= readingLine) current = el.id
        else break
      }
      // At the very bottom of the page, pin the last section as active.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2
      setActiveId(atBottom ? elements[elements.length - 1].id : current)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [headings])

  return (
    <nav
      aria-label="Table of contents"
      className="group/toc fixed top-1/2 left-8 hidden max-h-[calc(100vh-6rem)] w-60 -translate-y-1/2 overflow-y-auto xl:block"
    >
      <div className="flex flex-col">
        {headings.map((h) => {
          const active = h.id === activeId
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              data-active={active || undefined}
              className="group/item relative flex h-6 items-center rounded-lg px-4 transition-colors duration-200 ease-out hover:bg-neutral-200"
            >
              {/* Baton: visible at rest, fades out when the rail is explored */}
              <span className="flex w-[22px] shrink-0 items-center transition-opacity duration-200 ease-out group-hover/toc:opacity-0 group-focus-within/toc:opacity-0">
                <span
                  className={`h-[1.5px] shrink-0 rounded-full transition-colors duration-200 ease-out ${
                    h.level === 3 ? 'w-3' : 'w-[22px]'
                  } ${active ? 'bg-neutral-900' : 'bg-neutral-400'}`}
                />
              </span>
              {/* Title: fades in on rail hover/focus */}
              <span
                className={`absolute inset-x-4 top-1/2 -translate-y-1/2 truncate text-[13px] opacity-0 transition-[opacity,color] duration-200 ease-out group-hover/toc:opacity-100 group-focus-within/toc:opacity-100 ${
                  active ? 'text-neutral-900' : 'text-neutral-600 group-hover/item:text-neutral-900'
                }`}
              >
                {h.text}
              </span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
