import type { ReadingType } from '@/lib/reading-shared'

/**
 * One stroke icon per entry type, all drawn on the same 24px grid at the
 * same weight so they read as one set. Decorative: callers pair each icon
 * with text (a legend label or a screen-reader prefix).
 */
export function TypeIcon({ type, className = 'h-4 w-4' }: { type: ReadingType; className?: string }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  } as const
  switch (type) {
    case 'article':
      // A page of text.
      return (
        <svg {...props}>
          <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
          <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
        </svg>
      )
    case 'paper':
      // A page with a folded corner and a title rule: the academic paper.
      return (
        <svg {...props}>
          <path d="M14 3.5H6.5A1.5 1.5 0 0 0 5 5v14a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5z" />
          <path d="M14 3.5v5h5" />
          <path d="M8.5 13h7M8.5 16.5h7" />
        </svg>
      )
    case 'video':
      return (
        <svg {...props}>
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="m10.5 9.5 4 2.5-4 2.5z" />
        </svg>
      )
    case 'tweet':
      // A speech bubble rather than the X logo, so the set stays one style.
      return (
        <svg {...props}>
          <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12z" />
        </svg>
      )
    case 'repo':
      return (
        <svg {...props}>
          <path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5" />
        </svg>
      )
    case 'note':
      // A pencil: something I wrote, with no source behind it.
      return (
        <svg {...props}>
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
        </svg>
      )
  }
}
