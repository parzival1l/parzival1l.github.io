import { getAllPosts } from '@/lib/posts'
import { BlogFeed, type BlogFeedPost } from '@/components/blog-feed'

export const metadata = {
  title: 'Blogs',
}

/** A post's filterable tag set: categories first (they're the display chip),
    then tags, deduped. */
function postTags(categories?: string[], tags?: string[]): string[] {
  return Array.from(new Set([...(categories ?? []), ...(tags ?? [])]))
}

export default function BlogIndexPage() {
  const posts: BlogFeedPost[] = getAllPosts().map(p => ({
    slug: p.slug,
    title: p.frontmatter.title,
    date: p.frontmatter.date,
    description: p.frontmatter.description,
    tags: postTags(p.frontmatter.categories, p.frontmatter.tags),
  }))
  const allTags = Array.from(new Set(posts.flatMap(p => p.tags))).sort(
    (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()),
  )

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <BlogFeed posts={posts} tags={allTags} />
    </div>
  )
}
