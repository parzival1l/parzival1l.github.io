import { getReadingList } from '@/lib/reading'
import { ReadingFeed } from '@/components/reading-feed'
import { PAGE_BODY, PAGE_SHELL, PageHeader } from '@/components/page-header'

export const metadata = {
  title: 'Reading',
}

export default function ReadingPage() {
  const entries = getReadingList()

  return (
    <div className={PAGE_SHELL}>
      <PageHeader title="Reading">
        <p>
          A running log of what I read and what I thought about it. My take on
          each piece sits behind a thin rule; some entries are just a thought,
          no link.
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
