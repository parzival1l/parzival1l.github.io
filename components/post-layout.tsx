import type { ReactNode } from 'react'
import { formatDate } from '@/lib/format'
import type { PostHeading } from '@/lib/posts'
import { PostToc } from '@/components/post-toc'

export function PostLayout({
  title,
  date,
  category,
  headings = [],
  children,
}: {
  title: string
  date: string
  category?: string
  headings?: PostHeading[]
  children: ReactNode
}) {
  return (
    <article className="mx-auto max-w-prose px-6 py-16">
      {headings.length >= 2 ? <PostToc headings={headings} /> : null}
      <header className="mb-10">
        <h1 className="text-3xl font-medium leading-tight text-neutral-900">
          {title}
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          {formatDate(date)}
          {category ? <span> · {category}</span> : null}
        </p>
      </header>
      <div className="prose prose-neutral dark:prose-invert max-w-none">{children}</div>
    </article>
  )
}
