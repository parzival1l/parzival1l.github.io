import { PageLayout } from '@/components/page-layout'

export const metadata = {
  title: 'Publications',
}

export default function PublicationsPage() {
  return (
    <PageLayout title="Publications">
      <p>
        Master&rsquo;s thesis on structured information extraction from LLMs
        &mdash; preprint on{' '}
        <a href="https://arxiv.org/abs/2510.17720">arXiv</a>.
      </p>
      <p>More to come.</p>
    </PageLayout>
  )
}
