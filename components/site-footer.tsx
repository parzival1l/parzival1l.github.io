export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-neutral-200">
      <div className="mx-auto grid max-w-3xl gap-8 px-6 py-10 text-sm text-neutral-600 sm:grid-cols-3">
        <div>
          <p className="font-medium text-neutral-900">Nanda Kumar</p>
          <p className="mt-2 break-words">
            nanda [dot] kumark [at] mail [dot] concordia [dot] ca
          </p>
        </div>

        <nav className="flex flex-col gap-1.5" aria-label="Social links">
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
          <a href="/feed.xml" className="hover:text-neutral-900">
            RSS
          </a>
        </nav>

        <p className="text-neutral-500">
          A working journal — notes from projects, things I changed my mind
          about, occasional live demos.
        </p>
      </div>
    </footer>
  )
}
