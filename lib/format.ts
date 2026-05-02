/**
 * Format a YYYY-MM-DD (or longer ISO) string as "Month D, YYYY".
 *
 * Parses bare date strings as local time so that 2025-01-08 doesn't roll
 * back to 2025-01-07 in any timezone west of UTC.
 */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
