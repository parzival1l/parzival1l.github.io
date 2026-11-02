import { getReadingList } from '@/lib/reading'
import { ReadingFeed } from '@/components/reading-feed'
import { PAGE_BODY, PAGE_SHELL, PageHeader } from '@/components/page-header'

export const metadata = {
  title: 'Notes',
  description: 'Things I’m reading, learning, and thinking about. Short reflections, useful links, and ideas I want to come back to.',
}

export default function ReadingPage() {
  const entries = getReadingList()

  return (
    <div className={PAGE_SHELL}>
      <PageHeader title="Notes">
        <p>
          Things I’m reading, learning, and thinking about. Short reflections,
          useful links, and ideas I want to come back to.
        </p>
        <p className="text-sm text-neutral-500">
          I&apos;m experimenting with the UI a little bit, so this page might
          change in the foreseeable future.
        </p>
      </PageHeader>
      <div className={PAGE_BODY}>
        <ReadingFeed entries={entries} />
      </div>
    </div>
  )
}
