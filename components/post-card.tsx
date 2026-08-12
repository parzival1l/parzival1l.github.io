import Link from 'next/link'
import {
  DateBadge,
  ROW,
  dateParts,
} from '@/components/date-badge'

export interface PostCardData {
  slug: string
  title: string
  date: string
  description?: string
  /** Category + tag chips; only the first renders on the index row. */
  tags: string[]
}

/** Blog index row: homepage anatomy (calendar badge, hover pill) plus the
    post's description and its tag chips in the right rail. */
export function PostCard({ post }: { post: PostCardData }) {
  const { mon, day, monthYear } = dateParts(post.date)

  return (
    <article>
      <Link href={`/blog/${post.slug}/`} className={ROW}>
        <DateBadge mon={mon} day={day} />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium leading-snug text-neutral-900">
            {post.title}
          </span>
          {post.description ? (
            <span className="mt-0.5 line-clamp-2 block text-sm leading-relaxed text-neutral-600">
              {post.description}
            </span>
          ) : null}
        </span>
        <span className="flex max-w-[50%] shrink-0 flex-col items-end gap-1 text-right">
          <span className="text-sm whitespace-nowrap text-neutral-500">
            {monthYear}
          </span>
          {post.tags.length > 0 ? (
            <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs whitespace-nowrap text-neutral-500">
              {post.tags[0]}
            </span>
          ) : null}
        </span>
      </Link>
    </article>
  )
}
