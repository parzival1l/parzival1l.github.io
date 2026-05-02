import { getAllPosts } from '@/lib/posts'
import { PostCard } from '@/components/post-card'

export const metadata = {
  title: 'Blogs',
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-10 text-3xl font-medium text-neutral-900">Blogs</h1>
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
    </div>
  )
}
