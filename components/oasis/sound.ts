// Sound effects for the OASIS scene, synthesised with Web Audio. Nothing is
// downloaded: every sound is built from oscillators and filtered noise.
//
// Browsers only allow audio after a click or key press, so the context is
// created the first time the reader turns sound on.

export type FlightSound = {
  speed: number // m/s
  hover: number // 0 on the road, 1 off it
  fold: number // 0 wheels down, 1 folded flat
  lift: number // 0 on the ground, 1 at cruise height
  thrust: number // thruster power, 0 to 1
}

const SPEED_OF_SOUND = 343

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function build(ctx: AudioContext) {
  const out = ctx.createDynamicsCompressor()
  out.threshold.value = -18
  out.ratio.value = 4
  const master = ctx.createGain()
  master.gain.value = 0
  out.connect(master).connect(ctx.destination)
  const noise = noiseBuffer(ctx, 2)

  const loopNoise = () => {
    const src = ctx.createBufferSource()
    src.buffer = noise
    src.loop = true
    src.start()
    return src
  }

  // Engine: two detuned saws through a low-pass, pitched by road speed.
  const engineGain = ctx.createGain()
  engineGain.gain.value = 0
  const engineFilter = ctx.createBiquadFilter()
  engineFilter.type = 'lowpass'
  engineFilter.frequency.value = 420
  engineFilter.Q.value = 2
  const engineA = ctx.createOscillator()
  const engineB = ctx.createOscillator()
  engineA.type = 'sawtooth'
  engineB.type = 'sawtooth'
  engineB.detune.value = 14
  engineA.connect(engineFilter)
  engineB.connect(engineFilter)
  engineFilter.connect(engineGain).connect(out)
  engineA.start()
  engineB.start()

  // Tyre roar: low noise that follows road speed.
  const roadGain = ctx.createGain()
  roadGain.gain.value = 0
  const roadFilter = ctx.createBiquadFilter()
  roadFilter.type = 'lowpass'
  roadFilter.frequency.value = 500
  loopNoise().connect(roadFilter).connect(roadGain).connect(out)

  // Thrusters: a band of rushing noise over a low hum.
  const jetGain = ctx.createGain()
  jetGain.gain.value = 0
  const jetFilter = ctx.createBiquadFilter()
  jetFilter.type = 'bandpass'
  jetFilter.Q.value = 0.8
  loopNoise().connect(jetFilter).connect(jetGain).connect(out)
  const humGain = ctx.createGain()
  humGain.gain.value = 0
  const hum = ctx.createOscillator()
  hum.type = 'sine'
  hum.frequency.value = 62
  hum.connect(humGain).connect(out)
  hum.start()

  // Wind: high, airy noise that grows with altitude and speed.
  const windGain = ctx.createGain()
  windGain.gain.value = 0
  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'highpass'
  windFilter.frequency.value = 1200
  loopNoise().connect(windFilter).connect(windGain).connect(out)

  return { master, out, noise, engineA, engineB, engineFilter, engineGain, roadGain, roadFilter, jetGain, jetFilter, humGain, windGain }
}

export function createSound() {
  let ctx: AudioContext | null = null
  let nodes: ReturnType<typeof build> | null = null
  let enabled = false

  const glide = (param: AudioParam, value: number, time = 0.08) => {
    if (!ctx) return
    param.setTargetAtTime(value, ctx.currentTime, time)
  }

  // A short burst of filtered noise with a fast decay.
  const burst = (at: number, gain: number, type: BiquadFilterType, freq: number, decay: number) => {
    if (!ctx || !nodes) return
    const src = ctx.createBufferSource()
    src.buffer = nodes.noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(gain, at + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay)
    src.connect(filter).connect(g).connect(nodes.out)
    src.start(at, Math.random() * 1.5)
    src.stop(at + decay + 0.05)
  }

  const tone = (at: number, type: OscillatorType, from: number, to: number, gain: number, length: number) => {
    if (!ctx || !nodes) return
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(from, at)
    osc.frequency.exponentialRampToValueAtTime(to, at + length)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(gain, at + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, at + length)
    osc.connect(g).connect(nodes.out)
    osc.start(at)
    osc.stop(at + length + 0.05)
  }

  return {
    get enabled() {
      return enabled
    },

    setEnabled(on: boolean) {
      enabled = on
      if (on && !ctx) {
        ctx = new AudioContext()
        nodes = build(ctx)
      }
      if (!ctx || !nodes) return
      if (on) void ctx.resume()
      glide(nodes.master.gain, on ? 0.9 : 0, 0.15)
    },

    // Pause silences the scene without losing its state.
    setPaused(paused: boolean) {
      if (!ctx || !enabled) return
      void (paused ? ctx.suspend() : ctx.resume())
    },

    update(s: FlightSound) {
      if (!ctx || !nodes || !enabled) return
      const n = nodes
      const ground = 1 - s.hover
      const rpm = 38 + s.speed * 1.6 + s.lift * 30
      glide(n.engineA.frequency, rpm)
      glide(n.engineB.frequency, rpm * 1.5)
      glide(n.engineFilter.frequency, 300 + s.speed * 9)
      glide(n.engineGain.gain, 0.05 * (0.35 + 0.65 * ground))
      glide(n.roadGain.gain, 0.05 * ground * Math.min(s.speed / 28, 1))
      glide(n.roadFilter.frequency, 250 + s.speed * 12)
      glide(n.jetGain.gain, 0.09 * s.thrust)
      glide(n.jetFilter.frequency, 500 + 1400 * s.lift)
      glide(n.humGain.gain, 0.05 * s.thrust)
      glide(n.windGain.gain, 0.035 * s.lift * Math.min(s.speed / 60, 1))
    },

    // The wheels swing flat (or back down): a servo whine that climbs, then
    // a latch clunk as they lock.
    wheelsFold(folding: boolean, seconds: number) {
      if (!ctx) return
      const at = ctx.currentTime
      const [a, b] = folding ? [220, 720] : [720, 220]
      tone(at, 'square', a, b, 0.018, seconds)
      tone(at, 'sawtooth', a * 1.5, b * 1.5, 0.008, seconds)
      burst(at + seconds, 0.35, 'lowpass', 700, 0.12)
      tone(at + seconds, 'sine', 120, 50, 0.3, 0.18)
    },

    // A firework at `distance` metres: a crack, then crackle, arriving
    // late by the speed of sound.
    firework(distance: number) {
      if (!ctx) return
      const at = ctx.currentTime + distance / SPEED_OF_SOUND
      const level = 0.6 / (1 + distance / 40)
      burst(at, level, 'lowpass', 1800, 0.35)
      tone(at, 'sine', 90, 40, level * 0.8, 0.4)
      for (let i = 0; i < 6; i++) {
        burst(at + 0.25 + Math.random() * 0.6, level * 0.25, 'highpass', 3000, 0.04)
      }
    },

    // Passing under the starting gate: a quick rising arpeggio.
    gate() {
      if (!ctx) return
      const at = ctx.currentTime
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(at + i * 0.07, 'triangle', f, f, 0.07, 0.35))
    },

    // A soft rising (or falling) swell as the car lifts off the road or
    // settles back toward it.
    hover(rising: boolean) {
      if (!ctx) return
      const at = ctx.currentTime
      const [a, b] = rising ? [80, 260] : [260, 80]
      tone(at, 'sine', a, b, 0.12, 0.9)
      burst(at, 0.12, 'bandpass', rising ? 900 : 500, 0.8)
    },

    // The thrusters opening up for the climb: a long rushing swell with a
    // low boom under it.
    boost() {
      if (!ctx || !nodes) return
      const at = ctx.currentTime
      const src = ctx.createBufferSource()
      src.buffer = nodes.noise
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.Q.value = 0.7
      filter.frequency.setValueAtTime(300, at)
      filter.frequency.exponentialRampToValueAtTime(2400, at + 1.6)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(0.28, at + 0.5)
      g.gain.exponentialRampToValueAtTime(0.0001, at + 2.2)
      src.connect(filter).connect(g).connect(nodes.out)
      src.start(at)
      src.stop(at + 2.3)
      tone(at, 'sine', 70, 38, 0.3, 1.2)
    },

    // Coming down: a falling whoosh.
    descend() {
      if (!ctx) return
      const at = ctx.currentTime
      tone(at, 'sine', 300, 90, 0.08, 1.6)
      burst(at, 0.14, 'bandpass', 1200, 1.4)
    },

    // Tyres taking the car's weight again.
    touchdown() {
      if (!ctx) return
      const at = ctx.currentTime
      tone(at, 'sine', 95, 45, 0.35, 0.25)
      burst(at, 0.2, 'lowpass', 400, 0.2)
    },

    dispose() {
      void ctx?.close()
      ctx = null
      nodes = null
    },
  }
}
