'use client'

import { useEffect, useRef } from 'react'
import { DISTRICTS, districtAt } from './districts'

export type MapPlan = {
  blocks: { x0: number; x1: number; z0: number; z1: number }[]
  halfWidth: number
  halfLength: number
  avenueHalf: number
  roadStart: number
}
export type MapState = {
  car: { x: number; z: number; y: number; yaw: number }
  gate: { x: number; z: number }
  exit: { x: number; z: number }
  rings: { x: number; z: number; done: boolean }[]
}

const PAD = 28
const ROAD_END = 60 // metres past the city's far edge

// The whole map: the road from the start line, then the city, with the far
// end at the top. +x is drawn on the left, as the driver sees it.
export function OasisMap({ plan, state, onClose }: { plan: MapPlan; state: () => MapState; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const g = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio, 2)
    const zTop = plan.halfLength + ROAD_END
    const zBottom = plan.roadStart
    const worldW = plan.halfWidth * 2
    const worldH = zTop - zBottom

    let frame = 0
    let base: HTMLCanvasElement | null = null
    let scale = 1
    let w = 0
    let h = 0
    const toScreen = (x: number, z: number): [number, number] => [w / 2 - x * scale, PAD + (zTop - z) * scale]

    // The parts that never change, drawn once per size.
    const drawBase = () => {
      const r = canvas.getBoundingClientRect()
      w = r.width
      h = r.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      scale = Math.min((w - PAD * 2) / worldW, (h - PAD * 2) / worldH)
      base = document.createElement('canvas')
      base.width = canvas.width
      base.height = canvas.height
      const b = base.getContext('2d')!
      b.scale(dpr, dpr)
      // Grass.
      const [gx0, gy0] = toScreen(plan.halfWidth, zTop)
      b.fillStyle = '#1b2414'
      b.fillRect(gx0, gy0, worldW * scale, worldH * scale)
      // The highway to the city.
      const [rx, ry0] = toScreen(5, plan.roadStart)
      const [, ry1] = toScreen(5, -plan.halfLength)
      b.fillStyle = '#3a3b3e'
      b.fillRect(rx, ry1, 10 * scale, ry0 - ry1)
      // City streets, then the blocks over them in their district colours.
      const [cx0, cy0] = toScreen(plan.halfWidth, plan.halfLength)
      b.fillStyle = '#2e2f33'
      b.fillRect(cx0, cy0, worldW * scale, plan.halfLength * 2 * scale)
      for (const k of plan.blocks) {
        const d = districtAt((k.x0 + k.x1) / 2, (k.z0 + k.z1) / 2, plan.halfWidth, plan.halfLength)
        const [sx, sy] = toScreen(k.x1, k.z1)
        b.fillStyle = d ? `${d.color}38` : '#55565a'
        b.fillRect(sx, sy, (k.x1 - k.x0) * scale, (k.z1 - k.z0) * scale)
      }
      // District outlines and names.
      b.textAlign = 'center'
      b.textBaseline = 'middle'
      for (const d of DISTRICTS) {
        const [x0, y0] = toScreen(d.x[1] * plan.halfWidth, d.z[1] * plan.halfLength)
        const dw = (d.x[1] - d.x[0]) * plan.halfWidth * scale
        const dh = (d.z[1] - d.z[0]) * plan.halfLength * scale
        b.strokeStyle = `${d.color}aa`
        b.lineWidth = 1.5
        b.setLineDash([5, 4])
        b.strokeRect(x0 + 1, y0 + 1, dw - 2, dh - 2)
        b.setLineDash([])
        b.font = `600 ${Math.max(10, Math.min(15, dw / 10))}px ui-monospace, monospace`
        b.fillStyle = 'rgba(8, 9, 12, 0.7)'
        const label = d.name.toUpperCase()
        const tw = b.measureText(label).width + 14
        b.fillRect(x0 + dw / 2 - tw / 2, y0 + dh / 2 - 11, tw, 22)
        b.fillStyle = d.color
        b.fillText(label, x0 + dw / 2, y0 + dh / 2 + 1)
      }
    }

    const draw = () => {
      if (!base) drawBase()
      const s = state()
      const t = performance.now() / 1000
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, canvas.width, canvas.height)
      g.drawImage(base!, 0, 0)
      g.scale(dpr, dpr)

      // Start gate, exit pad and rings.
      const [gx, gy] = toScreen(s.gate.x, s.gate.z)
      g.fillStyle = '#ffc34d'
      g.fillRect(gx - 9, gy - 2, 18, 4)
      const [ex, ey] = toScreen(s.exit.x, s.exit.z)
      g.fillStyle = '#ff5c7a'
      g.beginPath()
      g.arc(ex, ey, 5, 0, Math.PI * 2)
      g.fill()
      for (const r of s.rings) {
        const [x, y] = toScreen(r.x, r.z)
        g.strokeStyle = r.done ? '#ffc34d' : '#5fe3ff'
        g.lineWidth = 2.5
        g.beginPath()
        g.arc(x, y, 7 + (r.done ? 0 : Math.sin(t * 3) * 1.5), 0, Math.PI * 2)
        g.stroke()
        if (r.done) {
          g.fillStyle = '#ffc34d'
          g.beginPath()
          g.arc(x, y, 3, 0, Math.PI * 2)
          g.fill()
        }
      }

      // You are here: a pulse, then an arrow along the car's heading.
      const [px, py] = toScreen(s.car.x, s.car.z)
      const pulse = (t * 0.8) % 1
      g.strokeStyle = `rgba(255, 233, 168, ${1 - pulse})`
      g.lineWidth = 2
      g.beginPath()
      g.arc(px, py, 6 + pulse * 18, 0, Math.PI * 2)
      g.stroke()
      g.save()
      g.translate(px, py)
      // Heading 0 points up the map; +x is on the left, so turning toward
      // +x turns the arrow left.
      g.rotate(-s.car.yaw)
      g.fillStyle = '#ffe9a8'
      g.strokeStyle = '#0d0f12'
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(0, -11)
      g.lineTo(7, 8)
      g.lineTo(0, 4)
      g.lineTo(-7, 8)
      g.closePath()
      g.stroke()
      g.fill()
      g.restore()

      frame = requestAnimationFrame(draw)
    }
    const onResize = () => {
      base = null
    }
    window.addEventListener('resize', onResize)
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [plan, state])

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-[min(92vw,880px)] gap-6 rounded-2xl border border-white/10 bg-[#0d0f12]/90 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <canvas ref={canvasRef} className="h-full min-w-0 flex-1" aria-label="Map of the OASIS city" role="img" />
        <div className="flex w-56 shrink-0 flex-col gap-5 normal-case tracking-normal">
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] uppercase tracking-[0.25em] text-white">Map</div>
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-white"
            >
              n · close
            </button>
          </div>
          <ul className="space-y-2 text-[12px] text-white/70">
            <li className="flex items-center gap-2.5">
              <span className="inline-block h-0 w-0 border-x-[6px] border-b-[11px] border-x-transparent border-b-[#ffe9a8]" />
              You
            </li>
            <li className="flex items-center gap-2.5">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-[#5fe3ff]" />
              Ring to fly through
            </li>
            <li className="flex items-center gap-2.5">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-[#ffc34d] bg-[#ffc34d]/60" />
              Ring done
            </li>
            <li className="flex items-center gap-2.5">
              <span className="inline-block h-1 w-3.5 bg-[#ffc34d]" />
              Starting gate
            </li>
            <li className="flex items-center gap-2.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ff5c7a]" />
              Exit home
            </li>
          </ul>
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">Districts</div>
            {DISTRICTS.map((d) => (
              <div key={d.id} className="text-[12px] leading-snug">
                <div className="flex items-center gap-2 font-medium" style={{ color: d.color }}>
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                  {d.name}
                </div>
                <div className="mt-0.5 pl-[18px] text-white/50">{d.blurb}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
