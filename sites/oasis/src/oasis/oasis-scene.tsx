'use client'

import { useEffect, useRef, useState } from 'react'
import type { CameraMode } from './scene'
import type { District } from './districts'
import { type MapPlan, type MapState, OasisMap } from './oasis-map'
import { RotateHint, type TouchApi, TouchControls, useTouchScreen } from './touch-controls'

type Status = 'loading' | 'ready' | 'error'

// Alan Silvestri's score, through Spotify's official player. The player only
// loads once the reader opens it, so visiting the page contacts no one.
const SOUNDTRACK_EMBED =
  'https://open.spotify.com/embed/album/166LfpstziUpezunLrOxUR?utm_source=generator&theme=0'

// `homeUrl` is where the exit pad and Esc take the reader.
export function OasisScene({ homeUrl }: { homeUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [mode, setMode] = useState<CameraMode>('cinematic')
  const [paused, setPaused] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [driving, setDriving] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [map, setMap] = useState<{ plan: MapPlan; state: () => MapState } | null>(null)
  // The district the car is in, shown briefly as it crosses into one.
  const [district, setDistrict] = useState<{ d: District; id: number } | null>(null)
  const [rings, setRings] = useState({ passed: 0, total: 5 })
  // A message across the top of the screen for each ring flown through.
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)
  const [air, setAir] = useState(false)
  const touch = useTouchScreen()
  const [touchApi, setTouchApi] = useState<(TouchApi & { followCar: () => void }) | null>(null)
  const toggleSoundRef = useRef<(() => void) | null>(null)
  // Once opened, the player stays mounted while hidden, so the music keeps
  // playing when the panel closes.
  const [musicLoaded, setMusicLoaded] = useState(false)

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
          onAirChange: setAir,
          onExit: () => setExiting(true),
          onDistrict: (d) => setDistrict(d ? { d, id: Date.now() } : null),
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
        setMap({ plan: scene.mapPlan, state: scene.mapState })
        const { setStick, setHeld, fly, restart, followCar } = scene
        setTouchApi({ setStick, setHeld, fly, restart, followCar })
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

  // Fade to black, then go home.
  useEffect(() => {
    if (!exiting) return
    const timer = setTimeout(() => window.location.assign(homeUrl), 900)
    return () => clearTimeout(timer)
  }, [exiting, homeUrl])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), toast.text.includes('all') ? 5000 : 2600)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!district) return
    const timer = setTimeout(() => setDistrict(null), 3500)
    return () => clearTimeout(timer)
  }, [district])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (e.key === 'Escape') {
        // Esc closes the map first, and leaves the OASIS after.
        if (mapOpen) setMapOpen(false)
        else window.location.assign(homeUrl)
      } else if (e.key.toLowerCase() === 'n') {
        setMapOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [homeUrl, mapOpen])

  const modeLabel = paused ? 'Paused' : mode === 'free' ? 'Free camera' : mode === 'drive' ? 'Driving' : 'Cinematic'
  const ready = status === 'ready'
  // Insets clear the notch and home bar on phones held sideways.
  const top = 'top-[max(1.25rem,env(safe-area-inset-top))]'
  const left = 'left-[max(1.25rem,env(safe-area-inset-left))]'
  const right = 'right-[max(1.25rem,env(safe-area-inset-right))]'
  const bottom = 'bottom-[max(1.25rem,env(safe-area-inset-bottom))]'

  const soundtrack = musicLoaded && (
    <iframe
      title="Ready Player One: Original Motion Picture Soundtrack on Spotify"
      src={SOUNDTRACK_EMBED}
      width="320"
      height="152"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className={`max-w-[60vw] rounded-xl border-0 shadow-2xl ${musicOpen ? '' : 'hidden'}`}
    />
  )
  const utilityButtons = (
    <>
      <button
        type="button"
        aria-expanded={mapOpen}
        aria-label="Map"
        onClick={() => setMapOpen((open) => !open)}
        className="uppercase tracking-[0.2em] transition-colors hover:text-white"
      >
        {touch ? '🗺' : mapOpen ? 'close map' : '🗺 map'}
      </button>
      <button
        type="button"
        aria-pressed={soundOn}
        aria-label={soundOn ? 'Mute sound' : 'Turn sound on'}
        onClick={() => toggleSoundRef.current?.()}
        className="uppercase tracking-[0.2em] transition-colors hover:text-white"
      >
        {touch ? (soundOn ? '🔊' : '🔇') : soundOn ? '🔊 mute sound' : '🔇 turn sound on'}
      </button>
      <button
        type="button"
        aria-expanded={musicOpen}
        aria-label={musicOpen ? 'Hide soundtrack' : 'Soundtrack'}
        onClick={() => {
          setMusicLoaded(true)
          setMusicOpen((open) => !open)
        }}
        className="uppercase tracking-[0.2em] transition-colors hover:text-white"
      >
        {touch ? (musicOpen ? '♪ hide' : '♪') : musicOpen ? 'hide soundtrack' : '♪ soundtrack'}
      </button>
    </>
  )

  return (
    <div className="fixed inset-0 z-[100] bg-[#0d0f12] font-mono text-[11px] uppercase tracking-[0.2em] text-white/80">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />
      <div className={`absolute ${left} ${top} flex gap-4`}>
        <span className="pointer-events-none">OASIS · Parzival</span>
        <a href="/credits/" className="text-white/40 transition-colors hover:text-white">
          credits
        </a>
      </div>
      {ready && !touch && (
        <div className="pointer-events-none absolute right-5 top-5 text-right leading-6">
          <div>{modeLabel}</div>
          <div className="text-white/50">
            w a s d · {driving ? 'drive' : 'take the wheel'}
            <br />e · {driving ? 'lift off · climb' : 'then lift off'}
            {driving && (
              <>
                <br />q · sink · land
              </>
            )}
            <br />n · map
            <br />r · restart
            <br />
            red pad · exit home
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
      {ready && touch && (
        <div className={`absolute ${right} ${top} flex flex-col items-end gap-3`}>
          <div className="flex gap-5 text-[13px]">{utilityButtons}</div>
          {mode === 'free' ? (
            <button
              type="button"
              onClick={() => touchApi?.followCar()}
              className="rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 active:bg-white/25"
            >
              {driving ? '⟲ chase camera' : '⟲ cinematic'}
            </button>
          ) : (
            <div className="pointer-events-none text-white/50">{modeLabel}</div>
          )}
          {soundtrack}
        </div>
      )}
      {ready && driving && (
        <div
          className={`pointer-events-none absolute leading-6 ${
            touch ? `inset-x-0 ${top} mt-6 text-center` : 'bottom-5 left-5'
          }`}
        >
          <div className="text-white/50">Fly through the rings under the blimps</div>
          <div className="text-[13px] text-[#ffc34d]">
            Rings {rings.passed} / {rings.total}
          </div>
        </div>
      )}
      {ready && touch && !driving && (
        <div className={`pointer-events-none absolute ${left} ${bottom} mb-40 normal-case tracking-normal text-white/70 [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]`}>
          Push the stick to take the wheel
        </div>
      )}
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-none absolute inset-x-0 top-[18%] flex justify-center [animation:oasis-toast_0.5s_ease-out]"
        >
          <div className="rounded-full bg-black/55 px-7 py-3 text-center text-[15px] tracking-[0.3em] text-[#ffe9a8] backdrop-blur-sm [text-shadow:0_0_14px_rgba(255,195,77,0.7)]">
            {toast.text}
          </div>
        </div>
      )}
      {district && (
        <div
          key={district.id}
          className="pointer-events-none absolute inset-x-0 bottom-[14%] flex justify-center [animation:oasis-toast_0.5s_ease-out]"
        >
          <div className="text-center">
            <div className="text-[10px] tracking-[0.35em] text-white/60">Now entering</div>
            <div
              className="mt-1 text-[22px] tracking-[0.3em]"
              style={{ color: district.d.color, textShadow: `0 0 18px ${district.d.color}99` }}
            >
              {district.d.name}
            </div>
          </div>
        </div>
      )}
      {ready && touch && touchApi && !mapOpen && <TouchControls api={touchApi} air={driving && air} />}
      {mapOpen && map && <OasisMap plan={map.plan} state={map.state} onClose={() => setMapOpen(false)} />}
      {ready && !touch && (
        <div className="absolute bottom-5 right-5 flex flex-col items-end gap-3">
          {soundtrack}
          {utilityButtons}
        </div>
      )}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-black text-[15px] tracking-[0.3em] text-[#ffd6de] transition-opacity duration-700 ${exiting ? 'opacity-100' : 'opacity-0'}`}
      >
        {exiting && 'Logging out of the OASIS'}
      </div>
      {touch && <RotateHint />}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0f12] text-white/80">
          {status === 'loading' ? 'Entering the OASIS…' : 'The OASIS is offline.'}
        </div>
      )}
    </div>
  )
}
