import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import { PostCard } from '@/components/post-card'

export default function HomePage() {
  const posts = getAllPosts().slice(0, 5)

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <section className="mb-16 max-w-prose">
        <p className="text-lg leading-relaxed text-neutral-900">
          Hi, I&rsquo;m <span className="font-medium">Nanda</span> &mdash; an AI
          engineer building a platform that lets enterprise teams stand up
          their own agents without writing code (Lovable / Vercel, pointed at
          internal workflows).
        </p>
        <p className="mt-3 text-lg leading-relaxed text-neutral-700">
          I write here about multi-step agentic systems, context engineering,
          and the fundamentals I&rsquo;m circling back to.
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
