'use client'

import { useEffect, useState } from 'react'

// dark === null means "not mounted yet": both icons stay hidden so server and
// client markup match, then the correct icon fades in from the DOM state set
// by the inline script in app/layout.tsx.
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    // Read the DOM, not React state, so rapid clicks can't act on a stale
    // pre-render closure.
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Private browsing etc. — theme just won't persist.
    }
    setDark(next)
  }

  const iconBase =
    'absolute h-[18px] w-[18px] transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.2,0,0,1)]'
  const shown = 'opacity-100 scale-100'
  const hidden = 'opacity-0 scale-50'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark ?? false}
      className="relative flex h-10 w-10 items-center justify-center text-neutral-600 transition-[transform,color] duration-150 hover:text-neutral-900 active:scale-[0.96]"
    >
      {/* Sun (shown in dark mode — the way out) and moon both stay mounted so
          the cross-fade is interruptible and hydration stays stable. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconBase} ${dark === true ? shown : hidden}`}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconBase} ${dark === false ? shown : hidden}`}
        aria-hidden="true"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  )
}
