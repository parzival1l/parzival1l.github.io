export const metadata = {
  title: 'Not found',
}

export default function NotFound() {
  return (
    <div className="mx-auto max-w-prose px-6 py-24 text-center">
      <p className="mb-6 text-sm text-neutral-500">404 &mdash; Page not found</p>
      {/* Plain <img> on purpose: this is a static export with images: { unoptimized: true }. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/404.jpg"
        alt="Officer Barbrady from South Park: Alright people, move along. There's nothing to see here."
        width={750}
        height={600}
        className="mx-auto h-auto w-full max-w-md"
      />
    </div>
  )
}
