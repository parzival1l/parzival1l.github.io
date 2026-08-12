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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/ampliwork-logo.png"
      alt=""
      width={16}
      height={17}
      className="inline-block h-[17px] w-auto align-[-0.2em] grayscale"
      aria-hidden="true"
    />
  )
}

const BIO_LINK =
  'underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900'

const ROW =
  'group -mx-3 flex items-center gap-x-4 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800'

const ROW_TITLE =
  'min-w-0 flex-1 truncate text-base font-medium leading-snug text-neutral-900'

const ROW_RAIL =
  'max-w-[50%] shrink-0 truncate text-right text-sm text-neutral-500'

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

/** Ringed shell: border + padding + inner border reads as the double-ring
    badge from the noechague-site reference. */
const BADGE_SHELL =
  'flex shrink-0 items-center justify-center rounded-[11px] border border-neutral-200 bg-[var(--bg)] p-[3px] shadow-sm'

const BADGE_INNER =
  'flex h-11 w-11 shrink-0 select-none flex-col overflow-hidden rounded-[7px] border border-neutral-200 bg-[var(--bg)]'

/** Mini calendar: gray month strip on top, big day below. */
function DateBadge({ mon, day }: { mon: string; day: string }) {
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

/** Same shell, with the staggered paragraph-lines glyph for papers. */
function PaperBadge() {
  const widths = ['w-[14px]', 'w-[26px]', 'w-[20px]', 'w-[10px]']
  return (
    <span className={BADGE_SHELL}>
      <span
        className={`${BADGE_INNER} items-start justify-center gap-[3px] p-1.5`}
      >
        {widths.map((w) => (
          <span
            key={w}
            className={`h-[2px] shrink-0 rounded-full bg-neutral-400 ${w}`}
          />
        ))}
      </span>
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
          I&rsquo;m a software engineer at{' '}
          <a
            href="https://www.ampliwork.com"
            className={BIO_LINK}
            target="_blank"
            rel="noreferrer"
          >
            <AmpliMark />{' '}
            <span className="font-medium text-neutral-900">Ampliwork</span>
          </a>,
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
