import fs from 'node:fs'
import path from 'node:path'
import { load } from 'js-yaml'

export interface ReadingEntry {
  title: string
  /** Link to the original. */
  url: string
  /** YYYY-MM-DD — the day the entry was added. Drives the sort order. */
  date: string
  tags: string[]
  /** archive.ph snapshot. Renders the archive icon when present. */
  archive?: string
  /** Source code. Renders the GitHub icon when present. */
  repo?: string
}

const FILE = path.join(process.cwd(), 'content/reading.yaml')

function fail(index: number, why: string): never {
  throw new Error(`content/reading.yaml: entry ${index + 1} ${why}`)
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toEntry(raw: unknown, index: number): ReadingEntry {
  if (typeof raw !== 'object' || raw === null) fail(index, 'is not a mapping')
  const item = raw as Record<string, unknown>

  const title = str(item.title) ?? fail(index, 'has no title')
  const url = str(item.url) ?? fail(index, `(${title}) has no url`)

  // js-yaml turns an unquoted YYYY-MM-DD into a Date; normalize to the same
  // `date: string` shape lib/posts.ts exposes.
  const date =
    item.date instanceof Date
      ? item.date.toISOString().slice(0, 10)
      : (str(item.date) ?? fail(index, `(${title}) has no date`))

  const tags = Array.isArray(item.tags)
    ? item.tags.map(String).map(t => t.trim().toLowerCase()).filter(Boolean)
    : []
  if (tags.length === 0) fail(index, `(${title}) has no tags`)

  return { title, url, date, tags, archive: str(item.archive), repo: str(item.repo) }
}

/** Every entry, newest first. Ties break alphabetically so the order is stable. */
export function getReadingList(): ReadingEntry[] {
  if (!fs.existsSync(FILE)) return []
  const parsed = load(fs.readFileSync(FILE, 'utf8'))
  if (parsed == null) return []
  if (!Array.isArray(parsed)) {
    throw new Error('content/reading.yaml: top level must be a list of entries')
  }
  return parsed
    .map(toEntry)
    .sort((a, b) =>
      a.date === b.date ? a.title.localeCompare(b.title) : a.date < b.date ? 1 : -1,
    )
}

/** Distinct tags across all entries, most used first, then alphabetical. */
export function getReadingTags(entries: ReadingEntry[]): string[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => (b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]))
    .map(([tag]) => tag)
}
