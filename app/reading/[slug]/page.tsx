// A long reading note: my notes first, then the source they are about. The MDX body is
// compiled at build time by next-mdx-remote/rsc, the same way blog posts are,
// so no MDX runtime ships to the client.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import {
  domainOf,
  getReadingNote,
  getReadingNotes,
  noteTitle,
  type ReadingNote,
} from '@/lib/reading'
import { formatDate } from '@/lib/format'

const META = 'text-[13px] text-neutral-500'

// Only the notes listed below exist; any other slug is a 404 in the export.
export const dynamicParams = false

export function generateStaticParams() {
  return getReadingNotes().map(n => ({ slug: n.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const note = getReadingNote(slug)
  if (!note) return {}
  return { title: noteTitle(note), description: note.note }
}

/** The YouTube video id, or null when the url isn't a YouTube watch link. */
function youtubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1) || null
    if (host === 'youtube.com') return u.searchParams.get('v')
  } catch {
    // Not a valid url; fall through to the plain button.
  }
  return null
}

/** Where the note came from: type, summary, and the way to the original. */
function SourceCard({ note }: { note: ReadingNote }) {
  if (!note.url) return null
  const domain = domainOf(note.url)
  const video = youtubeId(note.url)
  return (
    <section
      aria-label="The source"
      className="flex flex-col gap-2.5 rounded-[10px] border border-black/[0.08] bg-black/[0.02] p-5 sm:px-6 dark:border-neutral-200 dark:bg-white/[0.03]"
    >
      {video ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video}`}
          title={note.title}
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
          className="mt-1 aspect-video w-full rounded-md"
        />
      ) : null}
      {note.summary ? (
        <p className="max-w-[600px] text-[15px] leading-6 text-neutral-600">{note.summary}</p>
      ) : null}
      <div className="mt-1.5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-5">
        <a
          href={note.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-neutral-900 px-3.5 py-3 text-center text-[15px] font-medium text-[var(--bg)] hover:bg-neutral-700 sm:py-2 sm:text-sm"
        >
          {video ? 'Watch' : 'Read'} on {domain}
        </a>
        {note.archive ? (
          <a
            href={note.archive}
            target="_blank"
            rel="noreferrer"
            className="text-center text-sm text-neutral-600 underline decoration-neutral-300 underline-offset-[3px] hover:text-neutral-900 dark:decoration-neutral-600"
          >
            Archived copy
          </a>
        ) : null}
      </div>
    </section>
  )
}

function Neighbour({ note, dir }: { note: ReadingNote; dir: 'older' | 'newer' }) {
  const older = dir === 'older'
  return (
    <Link
      href={`/reading/${note.slug}/`}
      className={`group flex flex-col gap-1 ${older ? 'items-start' : 'items-end text-right'}`}
    >
      <span className={META}>{older ? 'Older' : 'Newer'}</span>
      <span className="text-[15px] text-neutral-900 group-hover:text-accent">{noteTitle(note)}</span>
    </Link>
  )
}

export default async function ReadingNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const notes = getReadingNotes()
  const index = notes.findIndex(n => n.slug === slug)
  if (index === -1) notFound()
  const note = notes[index]
  // Newest first: the next item in the list is the older note.
  const older = notes[index + 1]
  const newer = notes[index - 1]

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/reading/" className="text-sm text-neutral-600 hover:text-neutral-900">
        Notes
      </Link>

      <header className="mt-10 flex flex-col gap-3">
        <p className={META}>
          <time dateTime={note.date}>{formatDate(note.date)}</time> · {note.readingMinutes} min read
        </p>
        <h1 className="text-2xl font-medium leading-tight text-neutral-900">{noteTitle(note)}</h1>
      </header>

      <div className="reading-note prose prose-neutral dark:prose-invert mt-8 max-w-prose">
        <MDXRemote source={note.body} />
      </div>

      <div className="mt-12">
        <SourceCard note={note} />
      </div>

      {older || newer ? (
        <nav
          aria-label="More notes"
          className="mt-12 flex flex-col gap-6 border-t border-neutral-200 pt-6 sm:flex-row sm:justify-between"
        >
          {older ? <Neighbour note={older} dir="older" /> : <span />}
          {newer ? <Neighbour note={newer} dir="newer" /> : null}
        </nav>
      ) : null}
    </article>
  )
}
