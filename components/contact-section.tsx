import { GitHubIcon, LinkedInIcon, XIcon } from '@/components/social-icons'

/**
 * Contact colophon, rendered only in the homepage footer (via SiteFooter):
 * identity + email on the left, brand-icon socials on the right. The RSS
 * slot is intentionally absent until task 007 builds /feed.xml.
 */
const SOCIALS = [
  { href: 'https://github.com/parzival1l', label: 'GitHub', Icon: GitHubIcon },
  {
    href: 'https://www.linkedin.com/in/nandyy/',
    label: 'LinkedIn',
    Icon: LinkedInIcon,
  },
  { href: 'https://x.com/parzival1l', label: 'X (Twitter)', Icon: XIcon },
]

const ICON_LINK =
  // Matches the icon-link treatment in components/reading-feed.tsx.
  'inline-flex h-7 w-7 items-center justify-center rounded text-neutral-500 transition-colors hover:text-neutral-900'

export function ContactSection({ className = '' }: { className?: string }) {
  return (
    <section
      aria-label="Contact and elsewhere"
      className={`not-prose grid gap-8 text-sm text-neutral-600 sm:grid-cols-2 ${className}`}
    >
      {/* min-w-0: grid items default to min-width auto, which lets the long
          email overflow its track into the next column on narrow widths. */}
      <div className="min-w-0">
        <p className="font-medium text-neutral-900">Nanda Kumar</p>
        <a
          href="mailto:nanda.kumark@mail.concordia.ca"
          className="mt-2 inline-block wrap-anywhere hover:text-neutral-900"
        >
          nanda.kumark@mail.concordia.ca
        </a>
      </div>

      <nav
        className="flex min-w-0 items-center gap-1.5"
        aria-label="Social links"
      >
        {SOCIALS.map(({ href, label, Icon }) => (
          <a
            key={href}
            href={href}
            title={label}
            aria-label={label}
            target="_blank"
            rel="me noreferrer"
            className={ICON_LINK}
          >
            <Icon className="h-[15px] w-[15px]" />
          </a>
        ))}
      </nav>
    </section>
  )
}
