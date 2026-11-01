import type { ReactNode } from 'react'

/**
 * The title block every index page starts with (Blog, Reading, Projects), so
 * the title sits in the same place on each and only the content below it
 * changes. Pages wrap it in `PAGE_SHELL`.
 */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header>
      <h1 className="text-2xl font-medium text-neutral-900">{title}</h1>
      {children ? (
        <div className="mt-3 flex max-w-[560px] flex-col gap-2 text-neutral-600">{children}</div>
      ) : null}
    </header>
  )
}

/** Container for index pages: the site header's width and padding. */
export const PAGE_SHELL = 'mx-auto max-w-3xl px-6 py-16'

/** Gap between the page header and the page's content. */
export const PAGE_BODY = 'mt-10'
