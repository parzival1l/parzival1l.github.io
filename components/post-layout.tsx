import type { ReactNode } from 'react'
import { formatDate } from '@/lib/format'
import type { PostHeading } from '@/lib/posts'
import { PostToc } from '@/components/post-toc'
import { ShareBar } from '@/components/share-bar'

export function PostLayout({
  title,
  slug,
  date,
  category,
  tags = [],
  headings = [],
  children,
}: {
  title: string
  slug: string
  date: string
  category?: string
  /** Full category + tag set, rendered as chips under the dateline. */
  tags?: string[]
  headings?: PostHeading[]
  children: ReactNode
}) {
  return (
    <article className="mx-auto max-w-prose px-6 py-16">
      {headings.length >= 2 ? <PostToc headings={headings} /> : null}
      <header className="mb-10">
        <h1 className="text-2xl font-medium leading-tight text-neutral-900">
          {title}
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          {formatDate(date)}
          {category ? <span> · {category}</span> : null}
        </p>
        {tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span
                key={tag}
                className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs text-neutral-500"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </header>
      <div className="prose prose-neutral dark:prose-invert max-w-none">{children}</div>
      <ShareBar title={title} slug={slug} />
    </article>
  )
}
