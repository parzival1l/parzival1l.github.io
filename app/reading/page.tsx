import { getReadingList } from '@/lib/reading'
import { ReadingFeed } from '@/components/reading-feed'

export const metadata = {
  title: 'Reading',
}

export default function ReadingPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-medium text-neutral-900">Reading</h1>
      <p className="mt-3 max-w-[560px] text-neutral-600">
        A running log of what I read and what I thought about it. Some entries
        are just a thought, no link.
      </p>
      <div className="mt-10">
        <ReadingFeed entries={getReadingList()} />
      </div>
    </div>
  )
}
