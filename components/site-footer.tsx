'use client'

import { usePathname } from 'next/navigation'

import { ContactSection } from '@/components/contact-section'
import { FooterKeys } from '@/components/footer-keys'
import { LocalClock } from '@/components/local-clock'

/**
 * Two footer shapes:
 * - Homepage: the full contact colophon above the clock — the only page
 *   that carries identity in the chrome.
 * - Everywhere else: a slim bar, clock on the left and keycap shortcuts on
 *   the right, so a long read ends with a quick way out instead of a
 *   repeat of the header.
 */
export function SiteFooter() {
  const home = (usePathname() ?? '/') === '/'

  return (
    <footer className="mt-20 border-t border-neutral-200">
      {home ? (
        <>
          <div className="mx-auto max-w-3xl px-6 py-10">
            <ContactSection />
          </div>
          <div className="mx-auto max-w-3xl px-6 pb-8">
            <LocalClock />
          </div>
        </>
      ) : (
        <div className="mx-auto flex max-w-3xl flex-wrap items-baseline justify-between gap-x-6 gap-y-3 px-6 py-6">
          <LocalClock />
          <FooterKeys />
        </div>
      )}
    </footer>
  )
}
