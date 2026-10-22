'use client'

import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useRef, useState } from 'react'

export type TouchApi = {
  setStick: (x: number, y: number) => void
  setHeld: (key: 'rise' | 'sink', on: boolean) => void
  fly: () => void
  restart: () => void
}

// True on phones and tablets, and on any device the moment someone touches
// the screen.
export function useTouchScreen() {
  const [touch, setTouch] = useState(false)
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)')
    setTouch(coarse.matches)
    const onChange = () => coarse.matches && setTouch(true)
    const onPointer = (e: PointerEvent) => e.pointerType === 'touch' && setTouch(true)
    coarse.addEventListener('change', onChange)
    window.addEventListener('pointerdown', onPointer, { capture: true, passive: true })
    return () => {
      coarse.removeEventListener('change', onChange)
      window.removeEventListener('pointerdown', onPointer, { capture: true })
    }
  }, [])
  return touch
}

const STICK_RADIUS = 52
const DEAD_ZONE = 0.12

function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)

  const move = (e: ReactPointerEvent) => {
    const r = baseRef.current!.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const d = Math.hypot(dx, dy)
    if (d > STICK_RADIUS) {
      dx *= STICK_RADIUS / d
      dy *= STICK_RADIUS / d
    }
    knobRef.current!.style.transform = `translate(${dx}px, ${dy}px)`
    // Rescale past the dead zone so a small push still moves the car.
    const scale = (n: number) => {
      const a = Math.abs(n) / STICK_RADIUS
      return a < DEAD_ZONE ? 0 : (Math.sign(n) * (a - DEAD_ZONE)) / (1 - DEAD_ZONE)
    }
    onMove(scale(dx), -scale(dy))
  }
  const release = () => {
    pointer.current = null
    knobRef.current!.style.transform = ''
    onMove(0, 0)
  }

  return (
    <div
      ref={baseRef}
      className="relative flex h-36 w-36 touch-none items-center justify-center rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-sm"
      onPointerDown={(e) => {
        if (pointer.current !== null) return
        pointer.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={(e) => e.pointerId === pointer.current && move(e)}
      onPointerUp={(e) => e.pointerId === pointer.current && release()}
      onPointerCancel={(e) => e.pointerId === pointer.current && release()}
      aria-label="Joystick: push up to drive, left and right to steer"
      role="application"
    >
      <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-white/10" />
      <div
        ref={knobRef}
        className="pointer-events-none h-14 w-14 rounded-full border border-white/40 bg-white/25 shadow-[0_0_18px_rgba(95,227,255,0.35)]"
      />
    </div>
  )
}

const BUTTON =
  'flex touch-none items-center justify-center rounded-full border border-white/20 bg-white/[0.08] backdrop-blur-sm active:bg-white/25'

// A button that counts as held for as long as a finger is on it.
function HoldButton({ label, onHold, children }: { label: string; onHold: (on: boolean) => void; children: ReactNode }) {
  const down = useRef(false)
  const set = (on: boolean) => {
    if (down.current === on) return
    down.current = on
    onHold(on)
  }
  return (
    <button
      type="button"
      aria-label={label}
      className={`${BUTTON} h-14 w-14 text-[18px]`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

// A joystick on the left; fly, climb, sink and restart on the right.
export function TouchControls({ api, air }: { api: TouchApi; air: boolean }) {
  return (
    <>
      <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))]">
        <Joystick onMove={api.setStick} />
      </div>
      <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] grid grid-cols-[auto_auto] items-center gap-3">
        <div className="flex flex-col gap-3">
          <HoldButton label="Climb" onHold={(on) => api.setHeld('rise', on)}>
            ▲
          </HoldButton>
          <HoldButton label="Sink" onHold={(on) => api.setHeld('sink', on)}>
            ▼
          </HoldButton>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={api.restart}
            className={`${BUTTON} h-11 w-11 text-[16px]`}
            aria-label="Restart from the starting gate"
          >
            ↺
          </button>
          <button
            type="button"
            onClick={api.fly}
            className={`${BUTTON} h-[4.5rem] w-[4.5rem] border-[#5fe3ff]/50 text-[11px] uppercase tracking-[0.2em] text-[#bff4ff]`}
          >
            {air ? 'Land' : 'Fly'}
          </button>
        </div>
      </div>
    </>
  )
}

// Phones held upright get a nudge to turn sideways. It can be waved off.
export function RotateHint() {
  const [portrait, setPortrait] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    const q = window.matchMedia('(orientation: portrait)')
    const update = () => setPortrait(q.matches)
    update()
    q.addEventListener('change', update)
    return () => q.removeEventListener('change', update)
  }, [])
  if (!portrait || dismissed) return null
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#0d0f12]/90 px-8 text-center backdrop-blur-sm">
      <div className="text-[34px] [animation:oasis-rotate_2.4s_ease-in-out_infinite]">📱</div>
      <div className="text-[13px] leading-6 tracking-[0.25em] text-white">Turn your phone sideways</div>
      <div className="normal-case tracking-normal text-white/50">The OASIS plays best in landscape.</div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-full border border-white/20 px-5 py-2.5 text-white/70 active:bg-white/10"
      >
        Play upright anyway
      </button>
    </div>
  )
}
