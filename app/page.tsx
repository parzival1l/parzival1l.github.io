import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import { Avatar } from '@/components/avatar'

function VerifiedBadge() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-[17px] w-[17px]"
      aria-label="Verified"
      role="img"
    >
      <path
        fill="#1d9bf0"
        d="M10 0.6l2.1 1.8 2.7-.5 1.1 2.5 2.7 1.1-.5 2.7 1.8 2.1-1.8 2.1.5 2.7-2.7 1.1-1.1 2.5-2.7-.5-2.1 1.8-2.1-1.8-2.7.5-1.1-2.5-2.7-1.1.5-2.7L0.6 10l1.8-2.1-.5-2.7 2.7-1.1 1.1-2.5 2.7.5z"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 10.3l2.7 2.7 5-5.4"
      />
    </svg>
  )
}

/** Tiny inline company mark used inside the bio text. */
function AmpliMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="inline-block h-[15px] w-[15px] align-[-0.2em]"
      aria-hidden="true"
    >
      <rect width="16" height="16" rx="3.5" className="fill-neutral-900" />
      <path
        fill="#fff"
        d="M8.9 2.8 4.8 9h2.6l-1 4.2 4.7-6.4H8.4l1.1-4z"
      />
    </svg>
  )
}

const BIO_LINK =
  'underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900'

const ROW =
  'group -mx-4 flex items-center gap-x-5 rounded-2xl px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800'

const ROW_TITLE = 'min-w-0 flex-1 text-base leading-snug text-neutral-900'

const ROW_RAIL =
  'whitespace-nowrap pl-2 text-right text-sm tabular-nums text-neutral-500'

const WORKS = [
  {
    title:
      'SWin: A Sliding Window Summarization Approach for Coherent LLM-driven Dialogue Systems',
    href: 'https://ieeexplore.ieee.org/abstract/document/11536307',
    year: '2026',
  },
  {
    title:
      'PANER: A Paraphrase-Augmented Framework for Low-Resource Named Entity Recognition',
    href: 'https://arxiv.org/abs/2510.17720',
    year: '2025',
  },
]

/** Split an ISO date string into the badge + right-rail pieces. */
function dateParts(iso: string) {
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

/** Bordered calendar square: month chip raised over the top edge, big day. */
function DateBadge({ mon, day }: { mon: string; day: string }) {
  return (
    <span className="relative flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-neutral-200 bg-[var(--bg)] shadow-sm">
      <span className="absolute -top-2.5 rounded-full border border-neutral-200 bg-[var(--bg)] px-1.5 py-px text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {mon}
      </span>
      <span className="text-xl font-medium tabular-nums text-neutral-900">
        {day}
      </span>
    </span>
  )
}

/** Same square, with a paper glyph for publications. */
function PaperBadge() {
  return (
    <span className="flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-neutral-200 bg-[var(--bg)] text-neutral-400 shadow-sm">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path
          strokeLinejoin="round"
          d="M7.5 3.5h6l4 4v13h-10z"
        />
        <path strokeLinejoin="round" d="M13.5 3.5v4h4" />
      </svg>
    </span>
  )
}

export default function HomePage() {
  const posts = getAllPosts().slice(0, 5)

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <section className="mb-16 max-w-prose">
        <div className="mb-6 flex items-center gap-3.5">
          <Avatar />
          <div>
            <p className="flex items-center gap-1.5 text-base font-medium text-neutral-900">
              Nanda Kumar
              <VerifiedBadge />
            </p>
            <p className="text-sm text-neutral-500">Software Engineer</p>
          </div>
        </div>

        <p className="text-base leading-relaxed text-neutral-700">
          I&rsquo;m a software engineer at <AmpliMark />{' '}
          <span className="font-medium text-neutral-900">Ampliwork</span>,
          where we&rsquo;re building the easiest way for enterprise teams to
          ship their own agents, no code required. I write here about
          multi-step agentic systems and context engineering.
        </p>
        <p className="mt-4 text-base leading-relaxed text-neutral-700">
          Previously, I worked as a Machine Learning Engineer at
          Femtherapeutics, then finished my master&rsquo;s at Concordia
          University, where my thesis on structured information extraction
          from LLMs became the PANER paper below.
        </p>
        <p className="mt-4 text-base leading-relaxed text-neutral-700">
          You can reach me at{' '}
          <a
            href="https://x.com/parzival1l"
            className={BIO_LINK}
            target="_blank"
            rel="noreferrer"
          >
            Twitter
          </a>
          , or see my code on{' '}
          <a
            href="https://github.com/parzival1l"
            className={BIO_LINK}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Selected works
        </h2>
        <ul className="space-y-3">
          {WORKS.map((w) => (
            <li key={w.href}>
              <a href={w.href} className={ROW} target="_blank" rel="noreferrer">
                <PaperBadge />
                <span className={ROW_TITLE}>{w.title}</span>
                <span className={ROW_RAIL}>{w.year}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-6 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Recent posts
        </h2>
        <ul className="space-y-3">
          {posts.map((p) => {
            const { mon, day, monthYear } = dateParts(p.frontmatter.date)
            return (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}/`} className={ROW}>
                  <DateBadge mon={mon} day={day} />
                  <span className={ROW_TITLE}>{p.frontmatter.title}</span>
                  <span className={ROW_RAIL}>{monthYear}</span>
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="mt-10">
          <Link href="/blog/" className="text-accent hover:underline">
            See all posts &rarr;
          </Link>
        </div>
      </section>
    </div>
  )
}
