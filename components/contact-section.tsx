/**
 * Contact + elsewhere colophon. Identity links live in exactly two places:
 * the homepage footer (via SiteFooter) and the bottom of the About page.
 * The RSS slot is intentionally absent until task 007 builds /feed.xml.
 */
export function ContactSection({ className = '' }: { className?: string }) {
  return (
    <section
      aria-label="Contact and elsewhere"
      className={`not-prose grid gap-8 text-sm text-neutral-600 sm:grid-cols-3 ${className}`}
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

      <nav className="flex min-w-0 flex-col gap-1.5" aria-label="Social links">
        <a
          href="https://github.com/parzival1l"
          className="hover:text-neutral-900"
          rel="me"
        >
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/nandyy/"
          className="hover:text-neutral-900"
          rel="me"
        >
          LinkedIn
        </a>
        <a
          href="https://x.com/parzival1l"
          className="hover:text-neutral-900"
          rel="me"
        >
          Twitter / X
        </a>
      </nav>

      <p className="min-w-0 text-neutral-500">
        A working journal — notes from projects, things I changed my mind
        about, occasional live demos.
      </p>
    </section>
  )
}
