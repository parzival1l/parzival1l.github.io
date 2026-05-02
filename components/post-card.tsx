import Link from 'next/link'
import { formatDate } from '@/lib/format'

export interface PostCardData {
  slug: string
  title: string
  date: string
  category?: string
  description?: string
}

export function PostCard({ post }: { post: PostCardData }) {
  return (
    <article>
      <Link href={`/blog/${post.slug}/`} className="group block">
        <p className="text-sm text-neutral-500">
          {formatDate(post.date)}
          {post.category ? <span> · {post.category}</span> : null}
        </p>
        <h3 className="mt-1 text-xl font-medium leading-snug text-neutral-900 group-hover:text-accent">
          {post.title}
        </h3>
        {post.description ? (
          <p className="mt-1 text-neutral-600">{post.description}</p>
        ) : null}
      </Link>
    </article>
  )
}
