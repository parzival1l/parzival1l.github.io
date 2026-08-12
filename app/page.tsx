import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import { Avatar } from '@/components/avatar'
import {
  BADGE_INNER,
  BADGE_SHELL,
  DateBadge,
  ROW,
  ROW_TITLE,
  ROW_RAIL,
  dateParts,
} from '@/components/date-badge'

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
