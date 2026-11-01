import { getReadingList } from '@/lib/reading'
import { ReadingFeed } from '@/components/reading-feed'

export const metadata = {
  title: 'Reading',
}

export default function ReadingPage() {
  const entries = getReadingList()

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-medium text-neutral-900">Reading</h1>
      <div className="mt-3 flex max-w-[560px] flex-col gap-2 text-neutral-600">
        <p>
          A running log of what I read and what I thought about it. My take on
          each piece sits behind a thin rule; some entries are just a thought,
          no link.
        </p>
        <p className="text-sm text-neutral-500">
          This section is a work in progress, so entries and their layout will
          change.
        </p>
      </div>
      <div className="mt-10">
        <ReadingFeed entries={entries} />
      </div>
    </div>
  )
}
