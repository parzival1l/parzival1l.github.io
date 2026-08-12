/** Split an ISO date string into the badge + right-rail pieces. */
export function dateParts(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso)
  return {
    mon: d
      .toLocaleDateString('en-US', { month: 'short' })
      .toUpperCase(),
    day: String(d.getDate()),
    monthYear: d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
  }
}

export const ROW =
  'group -mx-3 flex items-center gap-x-4 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800'

export const ROW_TITLE =
  'min-w-0 flex-1 truncate text-base font-medium leading-snug text-neutral-900'

export const ROW_RAIL =
  'max-w-[50%] shrink-0 truncate text-right text-sm text-neutral-500'

/** Ringed shell: border + padding + inner border reads as the double-ring
    badge from the noechague-site reference. */
export const BADGE_SHELL =
  'flex shrink-0 items-center justify-center rounded-[11px] border border-neutral-200 bg-[var(--bg)] p-[3px] shadow-sm'

export const BADGE_INNER =
  'flex h-11 w-11 shrink-0 select-none flex-col overflow-hidden rounded-[7px] border border-neutral-200 bg-[var(--bg)]'

/** Mini calendar: gray month strip on top, big day below. */
export function DateBadge({ mon, day }: { mon: string; day: string }) {
  return (
    <span className={BADGE_SHELL}>
      <span className={BADGE_INNER}>
        <span className="flex h-3.5 w-full shrink-0 items-center justify-center bg-neutral-200 text-[8px] font-medium uppercase leading-none tracking-wider text-neutral-600">
          {mon}
        </span>
        <span className="flex flex-1 items-center justify-center text-lg font-medium leading-none tabular-nums text-neutral-900">
          {day}
        </span>
      </span>
    </span>
  )
}
