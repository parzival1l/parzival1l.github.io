import { PageLayout } from '@/components/page-layout'

export const metadata = {
  title: 'Projects',
}

export default function ProjectsPage() {
  return (
    <PageLayout title="Projects">
      <p>
        A running list of things I&rsquo;m building. Coming soon &mdash; for
        now, see the{' '}
        <a href="https://github.com/parzival1l">GitHub profile</a> for active
        repos.
      </p>
    </PageLayout>
  )
}
