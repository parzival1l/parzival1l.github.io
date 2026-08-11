'use client'

import { useEffect, useState } from 'react'

/** Montreal local time, e.g. "11:52pm" (America/Toronto). */
function montrealTime(): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Toronto',
  })
    .format(new Date())
    .toLowerCase()
    .replace(/\s/g, '')
}

/**
 * "11:52pm in Montreal, Canada" next to a sleeping pixel dog with floating
 * z's. Renders the time only after hydration so the server HTML never
 * mismatches the reader's clock.
 */
export function LocalClock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    setTime(montrealTime())
    const id = setInterval(() => setTime(montrealTime()), 10_000)
    return () => clearInterval(id)
  }, [])

  return (
    <p
      className={`flex items-baseline gap-2 text-sm tabular-nums text-neutral-600 transition-opacity duration-300 ease-out ${
        time ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span>{time ? `${time} in Montreal, Canada` : ' '}</span>
      <span aria-hidden="true" className="relative inline-flex items-baseline">
        <span className="dog dog-dodo" />
        <span className="pointer-events-none absolute bottom-4 left-[27px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="dog-z absolute text-[11px] font-semibold leading-none text-neutral-900"
              style={{ '--rang': i } as React.CSSProperties}
            >
              z
            </span>
          ))}
        </span>
      </span>
    </p>
  )
}
