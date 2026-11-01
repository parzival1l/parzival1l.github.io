// Types and helpers shared by the server loader (lib/reading.ts) and the
// client feed. Nothing here may import Node modules.

/**
 * The kind of entry. `note` is a thought with no link; the rest describe the
 * linked source and drive the type tabs on /reading/.
 */
export const READING_TYPES = ['note', 'article', 'paper', 'video', 'tweet', 'repo'] as const
export type ReadingType = (typeof READING_TYPES)[number]

export interface ReadingEntry {
  /** Stable id for React keys and anchors. */
  id: string
  /** Set only for long notes in content/reading/*.mdx; they get a page. */
  slug?: string
  /** YYYY-MM-DD — the day the entry was added. Drives the sort order. */
  date: string
  type: ReadingType
  /** Link to the original. Absent for standalone notes. */
  url?: string
  /** The source's title. For a long note with no url, the note's own title. */
  title?: string
  /** One or two lines about the source itself. */
  summary?: string
  /**
   * My words. For a short entry, the whole note. For a long note, its first
   * paragraph as plain text, shown in the log above "Read the full note".
   */
  note?: string
  /** Minutes to read the full note. Long notes only. */
  readingMinutes?: number
  tags: string[]
  /** archive.ph snapshot. */
  archive?: string
  /** Source code. */
  repo?: string
}

/** Page title for a long note: `Notes on “Source”`, or its own title. */
export function noteTitle(note: Pick<ReadingEntry, 'url' | 'title'>): string {
  return note.url ? `Notes on “${note.title}”` : (note.title ?? '')
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export const TYPE_LABELS: Record<ReadingType, { one: string; many: string }> = {
  note: { one: 'Note', many: 'Notes' },
  article: { one: 'Article', many: 'Articles' },
  paper: { one: 'Paper', many: 'Papers' },
  video: { one: 'Video', many: 'Videos' },
  tweet: { one: 'Tweet', many: 'Tweets' },
  repo: { one: 'Repo', many: 'Repos' },
}
