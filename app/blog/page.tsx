import { getAllPosts } from '@/lib/posts'
import { BlogFeed, type BlogFeedPost } from '@/components/blog-feed'
import { PAGE_BODY, PAGE_SHELL, PageHeader } from '@/components/page-header'

export const metadata = {
  title: 'Blog',
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
    category: p.frontmatter.categories?.[0],
  }))
  return (
    <div className={PAGE_SHELL}>
      <PageHeader title="Blog" />
      <div className={PAGE_BODY}>
        <BlogFeed posts={posts} />
      </div>
    </div>
  )
}
