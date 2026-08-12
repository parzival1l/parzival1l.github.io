'use client'

import { useEffect, useRef, useState } from 'react'
import {
  FacebookIcon,
  LinkedInIcon,
  XIcon,
} from '@/components/social-icons'

const BTN =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-900'

function LinkIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

/**
 * Share row at the foot of every post. Origin comes from window.location so
 * links stay correct across the github.io domain and the future custom
 * domain; until hydration the anchors render without hrefs (no mismatch).
 */
export function ShareBar({ title, slug }: { title: string; slug: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setUrl(`${window.location.origin}/blog/${slug}/`)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [slug])

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (non-secure context, denied): leave the
      // button inert rather than faking success.
    }
  }

  const encoded = url ? encodeURIComponent(url) : null
  const targets = [
    {
      label: 'Share on LinkedIn',
      href: encoded
        ? `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`
        : undefined,
      icon: <LinkedInIcon className="h-4 w-4" />,
    },
    {
      label: 'Share on X',
      href: encoded
        ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encoded}`
        : undefined,
      icon: <XIcon className="h-4 w-4" />,
    },
    {
      label: 'Share on Facebook',
      href: encoded
        ? `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
        : undefined,
      icon: <FacebookIcon className="h-4 w-4" />,
    },
  ]

  return (
    <div className="mt-16 flex items-center gap-2 border-t border-neutral-200 pt-6">
      <span className="mr-1 font-mono text-sm text-neutral-500">Share</span>
      <button
        type="button"
        onClick={copy}
        title={copied ? 'Copied!' : 'Copy link'}
        aria-label={copied ? 'Link copied' : 'Copy link to this post'}
        className={BTN}
      >
        {copied ? (
          <CheckIcon className="h-4 w-4 text-accent" />
        ) : (
          <LinkIcon className="h-4 w-4" />
        )}
      </button>
      {targets.map(t => (
        <a
          key={t.label}
          href={t.href}
          target="_blank"
          rel="noreferrer"
          title={t.label}
          aria-label={t.label}
          className={BTN}
        >
          {t.icon}
        </a>
      ))}
    </div>
  )
}
