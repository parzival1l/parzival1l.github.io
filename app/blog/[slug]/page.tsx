// MDX rendering note: we use `next-mdx-remote/rsc`, which compiles MDX inside
// a React Server Component at build time. The result is plain HTML in the
// static export — no MDX runtime ships to the client. Interactive islands
// (planned for live demos) are added later as explicit Client Components
// imported via the `components` map.

import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeSlug from 'rehype-slug'
import { getAllPosts, getPostBySlug, getPostHeadings } from '@/lib/posts'
import { PostLayout } from '@/components/post-layout'

export function generateStaticParams() {
  // Include drafts so direct URLs still resolve in the static export.
  return getAllPosts({ includeDrafts: true }).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  return (
    <PostLayout
      title={post.frontmatter.title}
      slug={post.slug}
      date={post.frontmatter.date}
      category={post.frontmatter.categories?.[0]}
      tags={[
        ...new Set([
          ...(post.frontmatter.categories ?? []),
          ...(post.frontmatter.tags ?? []),
        ]),
      ]}
      // rehype-slug ids the rendered headings so the TOC anchors resolve;
      // getPostHeadings reproduces the same slugs from the markdown source.
      headings={getPostHeadings(post.content)}
    >
      <MDXRemote
        source={post.content}
        options={{ mdxOptions: { rehypePlugins: [rehypeSlug] } }}
      />
    </PostLayout>
  )
}
