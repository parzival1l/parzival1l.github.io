import fs from 'node:fs'
import path from 'node:path'
import { load } from 'js-yaml'
import matter from 'gray-matter'
import { READING_TYPES, type ReadingEntry, type ReadingType } from '@/lib/reading-shared'

export * from '@/lib/reading-shared'

/** A long note, with the MDX body the detail page renders. */
export interface ReadingNote extends ReadingEntry {
  slug: string
  body: string
}

const YAML_FILE = path.join(process.cwd(), 'content/reading.yaml')
const NOTES_DIR = path.join(process.cwd(), 'content/reading')

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

// js-yaml and gray-matter turn an unquoted YYYY-MM-DD into a Date; normalize
// to the same `date: string` shape lib/posts.ts exposes.
function dateOf(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const s = str(value)
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined
}

function tagsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(String).map(t => t.trim().toLowerCase()).filter(Boolean)
    : []
}

/** Best guess at the type from the link, so entries rarely need `type:`. */
export function inferType(url: string | undefined): ReadingType {
  if (!url) return 'note'
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'article'
  }
  if (host === 'arxiv.org' || host === 'openreview.net' || /\.pdf($|\?)/.test(url)) {
    return 'paper'
  }
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'vimeo.com') return 'video'
  if (host === 'github.com') return 'repo'
  if (host === 'x.com' || host === 'twitter.com') return 'tweet'
  return 'article'
}

function typeOf(value: unknown, url: string | undefined, fail: (why: string) => never): ReadingType {
  const given = str(value)
  if (!given) return inferType(url)
  if (!READING_TYPES.includes(given as ReadingType)) {
    fail(`type must be one of: ${READING_TYPES.join(', ')}`)
  }
  if (given === 'note' && url) fail('has a url, so its type cannot be note')
  return given as ReadingType
}

/** Strip inline markdown so an excerpt reads as plain text. */
function plainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The first prose paragraph of a note body. The author controls where the
 * log cuts the note by where the first blank line falls.
 */
export function firstParagraph(body: string): string {
  const blocks = body.split(/\n\s*\n/)
  for (const block of blocks) {
    const text = block.trim()
    // Skip headings, quotes, lists, code, MDX imports and JSX blocks.
    if (!text || /^(#|>|[-*+] |\d+\. |```|~~~|import |export |<)/.test(text)) continue
    return plainText(text)
  }
  return ''
}

/** Reading time at 225 words a minute, never below one minute. */
export function readingMinutes(body: string): number {
  const words = plainText(body.replace(/```[\s\S]*?```/g, '')).split(' ').filter(Boolean).length
  return Math.max(1, Math.ceil(words / 225))
}

function fromYaml(raw: unknown, index: number): ReadingEntry {
  const fail = (why: string): never => {
    throw new Error(`content/reading.yaml: entry ${index + 1} ${why}`)
  }
  if (typeof raw !== 'object' || raw === null) fail('is not a mapping')
  const item = raw as Record<string, unknown>

  const url = str(item.url)
  const note = str(item.note)
  const title = str(item.title)
  const label = title ?? note?.slice(0, 40) ?? '(untitled)'
  const date = dateOf(item.date) ?? fail(`(${label}) needs a date as YYYY-MM-DD`)
  if (!url && !note) fail(`(${label}) needs a url or a note`)
  if (url && !title) fail(`(${url}) has a url, so it needs a title`)

  return {
    id: `yaml-${index}`,
    date,
    type: typeOf(item.type, url, why => fail(`(${label}) ${why}`)),
    url,
    title,
    summary: str(item.summary),
    note,
    tags: tagsOf(item.tags),
    archive: str(item.archive),
    repo: str(item.repo),
  }
}

function fromMdx(file: string): ReadingNote {
  const where = `content/reading/${file}`
  const fail = (why: string): never => {
    throw new Error(`${where} ${why}`)
  }
  const slug = file.replace(/\.mdx$/, '')
  const { data, content } = matter(fs.readFileSync(path.join(NOTES_DIR, file), 'utf8'))
  const item = data as Record<string, unknown>

  const url = str(item.url)
  const title =
    str(item.title) ??
    fail(url ? 'needs a title: the title of the source it is about' : 'has no url, so it needs its own title')
  const date = dateOf(item.date) ?? fail('needs a date as YYYY-MM-DD')
  const body = content.trim()
  if (!body) fail('has an empty body; a short note belongs in content/reading.yaml')

  return {
    id: `note-${slug}`,
    slug,
    date,
    type: typeOf(item.type, url, fail),
    url,
    title,
    summary: str(item.summary),
    note: firstParagraph(body),
    readingMinutes: readingMinutes(body),
    tags: tagsOf(item.tags),
    archive: str(item.archive),
    repo: str(item.repo),
    body,
  }
}

function byNewest(a: ReadingEntry, b: ReadingEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return (a.title ?? a.note ?? '').localeCompare(b.title ?? b.note ?? '')
}

/** Every long note, newest first. */
export function getReadingNotes(): ReadingNote[] {
  if (!fs.existsSync(NOTES_DIR)) return []
  return fs
    .readdirSync(NOTES_DIR)
    .filter(f => f.endsWith('.mdx'))
    .map(fromMdx)
    .sort(byNewest)
}

export function getReadingNote(slug: string): ReadingNote | null {
  return getReadingNotes().find(n => n.slug === slug) ?? null
}

/**
 * Every entry, short and long, newest first. Long notes come back without
 * their body so the list stays small enough to ship to the client.
 */
export function getReadingList(): ReadingEntry[] {
  let short: ReadingEntry[] = []
  if (fs.existsSync(YAML_FILE)) {
    const parsed = load(fs.readFileSync(YAML_FILE, 'utf8'))
    if (parsed != null) {
      if (!Array.isArray(parsed)) {
        throw new Error('content/reading.yaml: top level must be a list of entries')
      }
      short = parsed.map(fromYaml)
    }
  }
  const long = getReadingNotes().map(({ body: _body, ...entry }) => entry)
  return [...short, ...long].sort(byNewest)
}
