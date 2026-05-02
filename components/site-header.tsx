'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/blog/', label: 'Blogs' },
  { href: '/publications/', label: 'Publications' },
  { href: '/projects/', label: 'Projects' },
  { href: '/about/', label: 'About' },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-3xl flex-wrap items-baseline justify-between gap-x-6 gap-y-3 px-6 py-6">
        <Link
          href="/"
          className="text-lg font-medium tracking-tight text-neutral-900"
        >
          Nanda Kumar
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'text-neutral-900 underline underline-offset-4 decoration-accent'
                    : 'text-neutral-600 hover:text-neutral-900'
                }
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
