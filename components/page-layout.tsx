import type { ReactNode } from 'react'

export function PageLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-prose px-6 py-16">
      <h1 className="mb-10 text-2xl font-medium leading-tight text-neutral-900">
        {title}
      </h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none">{children}</div>
    </div>
  )
}
