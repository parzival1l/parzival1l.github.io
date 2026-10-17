'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { CameraMode } from './scene'

type Status = 'loading' | 'ready' | 'error'

export function OasisScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [mode, setMode] = useState<CameraMode>('cinematic')
  const [paused, setPaused] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    let stop: (() => void) | undefined
    import('./scene')
      .then(({ startOasis }) => {
        if (cancelled || !canvasRef.current) return
        const startAt = Number(new URLSearchParams(window.location.search).get('t')) || 0
        stop = startOasis(canvasRef.current, {
          onReady: () => setStatus('ready'),
          onError: () => setStatus('error'),
          onModeChange: setMode,
          onPauseChange: setPaused,
          startAt,
        })
      })
      .catch(() => setStatus('error'))

    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelled = true
      stop?.()
      document.body.style.overflow = overflow
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') router.push('/')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  return (
    <div className="fixed inset-0 z-[100] bg-[#0d0f12] font-mono text-[11px] uppercase tracking-[0.2em] text-white/80">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />
      <div className="pointer-events-none absolute left-5 top-5">OASIS · Parzival</div>
      {status === 'ready' && (
        <div className="pointer-events-none absolute right-5 top-5 text-right leading-6">
          <div>{paused ? 'Paused' : mode === 'free' ? 'Free camera' : 'Cinematic'}</div>
          <div className="text-white/50">
            drag · orbit
            <br />
            scroll · zoom
            <br />
            space · {paused ? 'play' : 'pause'}
            {mode === 'free' && (
              <>
                <br />c · cinematic
              </>
            )}
          </div>
        </div>
      )}
      <Link
        href="/"
        className="absolute bottom-5 left-5 transition-colors hover:text-white"
      >
        esc · log out
      </Link>
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center text-white/80">
          {status === 'loading' ? 'Entering the OASIS…' : 'The OASIS is offline.'}
        </div>
      )}
    </div>
  )
}
