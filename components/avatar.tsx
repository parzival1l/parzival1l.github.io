'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Homepage headshot. Drop a square photo at public/images/avatar.jpg and it
 * shows up; until then an "NK" monogram holds the slot.
 */
export function Avatar() {
  const ref = useRef<HTMLImageElement>(null)
  const [missing, setMissing] = useState(false)

  // SSR's <img> can error out before hydration attaches onError, so check
  // the completed state at mount as well.
  useEffect(() => {
    const el = ref.current
    if (el && el.complete && el.naturalWidth === 0) setMissing(true)
  }, [])

  if (missing) {
    return (
      <span
        aria-label="Photo coming soon"
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-dashed border-neutral-500 text-sm font-medium text-neutral-500"
      >
        NK
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src="/images/avatar.jpg"
      alt="Nanda Kumar"
      width={44}
      height={44}
      onError={() => setMissing(true)}
      className="h-11 w-11 flex-none rounded-full object-cover"
    />
  )
}
