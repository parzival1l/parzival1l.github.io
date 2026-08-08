import { getReadingList, getReadingTags } from '@/lib/reading'
import { ReadingList } from '@/components/reading-list'

export const metadata = {
  title: 'Reading',
}

export default function ReadingPage() {
  const entries = getReadingList()

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-3 text-3xl font-medium text-neutral-900">Reading</h1>
      <p className="mb-10 text-neutral-600">
        Articles, papers and repositories I read and want to keep. Each title
        links to the original.
      </p>
      <ReadingList entries={entries} tags={getReadingTags(entries)} />
    </div>
  )
}
