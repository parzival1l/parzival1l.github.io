import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import { PostCard } from '@/components/post-card'
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
            <p className="text-sm text-neutral-500">AI Engineer</p>
          </div>
        </div>

        <p className="text-base leading-relaxed text-neutral-700">
          I&rsquo;m an AI engineer at <AmpliMark />{' '}
          <span className="font-medium text-neutral-900">Ampliwork</span>,
          where we&rsquo;re building the easiest way for enterprise teams to
          ship their own agents &mdash; no code required. I write here about
          multi-step agentic systems and context engineering.
        </p>
        <p className="mt-4 text-base leading-relaxed text-neutral-700">
          Previously, I finished my master&rsquo;s at Concordia University
          &mdash; thesis on structured information extraction from LLMs{' '}
          (<a
            href="https://arxiv.org/abs/2510.17720"
            className={BIO_LINK}
            target="_blank"
            rel="noreferrer"
          >
            preprint on arXiv
          </a>
          ) &mdash; and worked as a Machine Learning Engineer at
          Femtherapeutics.
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

      <section>
        <h2 className="mb-6 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Recent posts
        </h2>
        <div className="space-y-8">
          {posts.map((p) => (
            <PostCard
              key={p.slug}
              post={{
                slug: p.slug,
                title: p.frontmatter.title,
                date: p.frontmatter.date,
                category: p.frontmatter.categories?.[0],
                description: p.frontmatter.description,
              }}
            />
          ))}
        </div>
        <div className="mt-10">
          <Link href="/blog/" className="text-accent hover:underline">
            See all posts &rarr;
          </Link>
        </div>
      </section>
    </div>
  )
}
