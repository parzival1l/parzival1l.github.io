'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { CameraMode } from './scene'

type Status = 'loading' | 'ready' | 'error'

// Alan Silvestri's score, through Spotify's official player. The player only
// loads once the reader opens it, so visiting the page contacts no one.
const SOUNDTRACK_EMBED =
  'https://open.spotify.com/embed/album/166LfpstziUpezunLrOxUR?utm_source=generator&theme=0'

export function OasisScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [mode, setMode] = useState<CameraMode>('cinematic')
  const [paused, setPaused] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [driving, setDriving] = useState(false)
  const [rings, setRings] = useState({ passed: 0, total: 5 })
  // A message across the top of the screen for each ring flown through.
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)
  const toggleSoundRef = useRef<(() => void) | null>(null)
  // Once opened, the player stays mounted while hidden, so the music keeps
  // playing when the panel closes.
  const [musicLoaded, setMusicLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    let stop: (() => void) | undefined
    import('./scene')
      .then(({ startOasis }) => {
        if (cancelled || !canvasRef.current) return
        const startAt = Number(new URLSearchParams(window.location.search).get('t')) || 0
        const scene = startOasis(canvasRef.current, {
          onReady: () => setStatus('ready'),
          onError: () => setStatus('error'),
          onModeChange: setMode,
          onPauseChange: setPaused,
          onSoundChange: setSoundOn,
          onDriveChange: setDriving,
          onRings: (passed, total) => {
            setRings({ passed, total })
            if (passed === 0) return setToast(null)
            setToast({
              text:
                passed === total
                  ? `You have gone through all ${total} out of ${total}`
                  : `You have gone through ${passed} out of ${total}`,
              id: Date.now(),
            })
          },
          startAt,
        })
        stop = scene
        toggleSoundRef.current = scene.toggleSound
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
    if (!toast) return
    const timer = setTimeout(() => setToast(null), toast.text.includes('all') ? 5000 : 2600)
    return () => clearTimeout(timer)
  }, [toast])

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
          <div>
            {paused ? 'Paused' : mode === 'free' ? 'Free camera' : mode === 'drive' ? 'Driving' : 'Cinematic'}
          </div>
          <div className="text-white/50">
            w a s d · {driving ? 'drive' : 'take the wheel'}
            <br />e · {driving ? 'lift off · climb' : 'then lift off'}
            {driving && (
              <>
                <br />q · sink · land
              </>
            )}
            <br />r · restart
            <br />
            drag · orbit
            <br />
            scroll · zoom to cursor
            <br />
            right-drag · pan
            <br />
            space · {paused ? 'play' : 'pause'}
            <br />f · focus car
            <br />m · {soundOn ? 'mute' : 'sound on'}
            {mode === 'free' && (
              <>
                <br />c · {driving ? 'chase camera' : 'cinematic'}
              </>
            )}
          </div>
        </div>
      )}
      {status === 'ready' && driving && (
        <div className="pointer-events-none absolute bottom-5 left-5 leading-6">
          <div className="text-white/50">Fly through the rings under the blimps</div>
          <div className="text-[13px] text-[#ffc34d]">
            Rings {rings.passed} / {rings.total}
          </div>
        </div>
      )}
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-none absolute inset-x-0 top-[18%] flex justify-center [animation:oasis-toast_0.5s_ease-out]"
        >
          <div className="rounded-full bg-black/55 px-7 py-3 text-[15px] tracking-[0.3em] text-[#ffe9a8] backdrop-blur-sm [text-shadow:0_0_14px_rgba(255,195,77,0.7)]">
            {toast.text}
          </div>
        </div>
      )}
      {status === 'ready' && (
        <div className="absolute bottom-5 right-5 flex flex-col items-end gap-3">
          {musicLoaded && (
            <iframe
              title="Ready Player One: Original Motion Picture Soundtrack on Spotify"
              src={SOUNDTRACK_EMBED}
              width="320"
              height="152"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className={`rounded-xl border-0 shadow-2xl ${musicOpen ? '' : 'hidden'}`}
            />
          )}
          <button
            type="button"
            aria-pressed={soundOn}
            onClick={() => toggleSoundRef.current?.()}
            className="uppercase tracking-[0.2em] transition-colors hover:text-white"
          >
            {soundOn ? '🔊 mute sound' : '🔇 turn sound on'}
          </button>
          <button
            type="button"
            aria-expanded={musicOpen}
            onClick={() => {
              setMusicLoaded(true)
              setMusicOpen((open) => !open)
            }}
            className="uppercase tracking-[0.2em] transition-colors hover:text-white"
          >
            {musicOpen ? 'hide soundtrack' : '♪ soundtrack'}
          </button>
        </div>
      )}
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center text-white/80">
          {status === 'loading' ? 'Entering the OASIS…' : 'The OASIS is offline.'}
        </div>
      )}
    </div>
  )
}
