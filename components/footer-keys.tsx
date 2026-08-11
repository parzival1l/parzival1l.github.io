'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Footer navigation styled as physical keyboard keys. Each keycap is a real
 * link, and each letter is also a real global shortcut: a reader at the
 * bottom of a long post can press `h` (home), `b` (blog index), `a`
 * (about) or `t` (back to top) instead of scrolling all the way up. The
 * keycap "presses" on hover (bottom edge gives way), and the key for the
 * page you're already on hides itself.
 */

type KeyId = 'home' | 'blog' | 'about' | 'top'

const KEYS: { id: KeyId; letter: string; label: string }[] = [
  { id: 'home', letter: 'h', label: 'Home' },
  { id: 'blog', letter: 'b', label: 'Blogs' },
  { id: 'about', letter: 'a', label: 'About' },
  { id: 'top', letter: 't', label: 'Top' },
]

const HREFS: Record<Exclude<KeyId, 'top'>, string> = {
  home: '/',
  blog: '/blog/',
  about: '/about/',
}

function scrollToTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

// A raised keycap: the inset bottom edge is the key's "depth"; on hover it
// travels down 1px and the edge thins — like a key being pressed.
const CAP_SHADOW =
  '[box-shadow:inset_0_-2px_0_0_rgb(0_0_0/0.10)] dark:[box-shadow:inset_0_-2px_0_0_rgb(255_255_255/0.14)]'
const CAP_SHADOW_HOVER =
  'group-hover/key:[box-shadow:inset_0_-1px_0_0_rgb(0_0_0/0.10)] dark:group-hover/key:[box-shadow:inset_0_-1px_0_0_rgb(255_255_255/0.14)]'

const TRIGGER =
  'group/key inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-900'

const CAP = `inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-neutral-200 px-1 font-mono text-[11px] leading-none text-neutral-500 transition-all duration-100 ease-out ${CAP_SHADOW} ${CAP_SHADOW_HOVER} group-hover/key:translate-y-px group-hover/key:border-neutral-500 group-hover/key:text-neutral-900 group-active/key:translate-y-[2px] group-active/key:[box-shadow:none]`

export function FooterKeys() {
  const pathname = usePathname() ?? '/'
  const router = useRouter()

  // Normalize: '/blog/' and '/blog' both mean the blog index.
  const path = pathname.replace(/\/+$/, '') || '/'
  const here: KeyId | null =
    path === '/'
      ? 'home'
      : path === '/blog'
        ? 'blog'
        : path === '/about'
          ? 'about'
          : null

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (
        el &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement ||
          el.isContentEditable)
      ) {
        return
      }
      const k = e.key.toLowerCase()
      if (k === 'h' && here !== 'home') router.push(HREFS.home)
      else if (k === 'b' && here !== 'blog') router.push(HREFS.blog)
      else if (k === 'a' && here !== 'about') router.push(HREFS.about)
      else if (k === 't') scrollToTop()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router, here])

  return (
    <nav aria-label="Shortcuts" className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {KEYS.filter((key) => key.id !== here).map((key) =>
        key.id === 'top' ? (
          <button
            key={key.id}
            type="button"
            onClick={scrollToTop}
            title={`Press ${key.letter}`}
            className={TRIGGER}
          >
            <kbd aria-hidden="true" className={CAP}>
              {key.letter}
            </kbd>
            <span>{key.label}</span>
          </button>
        ) : (
          <Link
            key={key.id}
            href={HREFS[key.id]}
            title={`Press ${key.letter}`}
            className={TRIGGER}
          >
            <kbd aria-hidden="true" className={CAP}>
              {key.letter}
            </kbd>
            <span>{key.label}</span>
          </Link>
        ),
      )}
    </nav>
  )
}
