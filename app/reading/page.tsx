import { getReadingList, getReadingTags, getReadingTypes } from '@/lib/reading'
import { ReadingFeed } from '@/components/reading-feed'

export const metadata = {
  title: 'Reading',
}

export default function ReadingPage() {
  const entries = getReadingList()

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <ReadingFeed
        entries={entries}
        tags={getReadingTags(entries)}
        types={getReadingTypes(entries)}
        header={
          <>
            <h1 className="mb-3 text-2xl font-medium text-neutral-900">
              Reading
            </h1>
            <p className="text-neutral-600">
              Articles, papers, videos and posts I read and keep — with my
              notes on each. Each card links to the original.
            </p>
          </>
        }
      />
    </div>
  )
}
