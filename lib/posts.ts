import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import GithubSlugger from 'github-slugger'

export interface PostFrontmatter {
  title: string
  date: string
  categories?: string[]
  tags?: string[]
  description?: string
  /** Hidden from listings; still rendered if requested directly via slug. */
  draft?: boolean
}

export interface Post {
  slug: string
  frontmatter: PostFrontmatter
  content: string
}

const POSTS_DIR = path.join(process.cwd(), 'content/posts')

function readPost(file: string): Post {
  const slug = file.replace(/\.mdx$/, '')
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8')
  const { data, content } = matter(raw)
  // gray-matter parses YAML dates into Date objects; normalize to ISO string
  // so consumers always see the same `date: string` shape.
  const rawDate: unknown = (data as Record<string, unknown>).date
  const date =
    rawDate instanceof Date
      ? rawDate.toISOString().slice(0, 10)
      : String(rawDate ?? '')
  const frontmatter: PostFrontmatter = {
    ...(data as PostFrontmatter),
    date,
  }
  return { slug, frontmatter, content }
}

export function getAllPosts({ includeDrafts = false } = {}): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'))
  const posts = files.map(readPost)
  return posts
    .filter(p => includeDrafts || !p.frontmatter.draft)
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1))
}

export function getPostBySlug(slug: string): Post | null {
  const file = path.join(POSTS_DIR, `${slug}.mdx`)
  if (!fs.existsSync(file)) return null
  return readPost(`${slug}.mdx`)
}

export interface PostHeading {
  id: string
  text: string
  level: 2 | 3
}

/** Strip inline markdown so TOC labels read as plain text. */
function plainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images -> alt
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> label
    .replace(/[`*_~]/g, '') // emphasis/code markers
    .trim()
}

/**
 * h2/h3 outline of a post, used for the table of contents. Slugs come from
 * github-slugger so they match the ids rehype-slug puts on the rendered
 * headings. Headings inside fenced code blocks are ignored.
 */
export function getPostHeadings(content: string): PostHeading[] {
  const slugger = new GithubSlugger()
  const headings: PostHeading[] = []
  let inFence = false
  for (const line of content.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match) continue
    const text = plainText(match[2])
    if (!text) continue
    headings.push({
      id: slugger.slug(text),
      text,
      level: match[1].length as 2 | 3,
    })
  }
  return headings
}
