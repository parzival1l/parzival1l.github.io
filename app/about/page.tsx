import Link from 'next/link'
import { PageLayout } from '@/components/page-layout'

export const metadata = {
  title: 'About',
}

export default function AboutPage() {
  return (
    <PageLayout title="About">
      <p>Hi, I&rsquo;m Nanda Kumar.</p>

      <p>
        I&rsquo;m an AI engineer. Right now I&rsquo;m building a platform that
        lets enterprise teams ship their own AI agents without writing code
        &mdash; think Lovable or Vercel, but pointed at internal workflows
        instead of marketing sites. The thesis is that the people closest to a
        workflow should be the ones shaping the agent that runs it; my job is
        to make that path short.
      </p>

      <p>
        Outside of work I spend time on multi-step agentic workflows and
        context engineering &mdash; the unglamorous mechanics of getting the
        right information in front of a model at the right time. I&rsquo;m
        also slowly working back through fundamentals on the principle that
        the abstractions I lean on every day are only as load-bearing as my
        understanding of what&rsquo;s underneath.
      </p>

      <p>
        I recently finished my master&rsquo;s at Concordia University. My
        thesis was on structured information extraction from LLMs &mdash;
        preprint on{' '}
        <Link href="https://arxiv.org/abs/2510.17720">arXiv</Link>. Before
        that I was a Machine Learning Engineer at Femtherapeutics.
      </p>

      <p>
        This blog is a working journal: notes from projects, things I changed
        my mind about, occasional live demos. The point isn&rsquo;t polish
        &mdash; it&rsquo;s leaving a trail I can read back.
      </p>

      <p>
        When I&rsquo;m not at a keyboard I skateboard, game, and shoot a
        little photography.
      </p>

      <p>
        You can reach me at{' '}
        <span className="whitespace-nowrap">
          nanda [dot] kumark [at] mail [dot] concordia [dot] ca
        </span>
        .
      </p>
    </PageLayout>
  )
}
