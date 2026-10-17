import * as THREE from 'three'

// Things in the sky, after the film's New York race: Halliday's high-score
// board hanging over the city, blimps, and fireworks to start the race.

// --- High-score board ------------------------------------------------------

const SCORES: [string, string][] = [
  ['PARZIVAL', '10,000'],
  ['ART3MIS', '9,000'],
  ['AECH', '8,000'],
  ['DAITO', '7,000'],
  ['SHO', '6,000'],
]

function drawScoreboard() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 640
  const g = canvas.getContext('2d')!
  const gold = '#ffcf5a'
  g.fillStyle = 'rgba(20, 12, 0, 0.55)'
  g.fillRect(0, 0, canvas.width, canvas.height)
  g.strokeStyle = gold
  g.lineWidth = 6
  g.strokeRect(14, 14, canvas.width - 28, canvas.height - 28)
  g.lineWidth = 2
  g.strokeRect(30, 30, canvas.width - 60, canvas.height - 60)

  g.fillStyle = gold
  g.textBaseline = 'middle'
  g.font = '700 64px ui-monospace, Menlo, monospace'
  g.textAlign = 'center'
  g.fillText('HIGH SCORES', canvas.width / 2, 98)
  g.fillRect(120, 146, canvas.width - 240, 3)

  g.font = '600 52px ui-monospace, Menlo, monospace'
  SCORES.forEach(([name, score], i) => {
    const y = 210 + i * 78
    g.globalAlpha = i === 0 ? 1 : 0.78
    g.textAlign = 'left'
    g.fillText(`${i + 1}.`, 110, y)
    g.fillText(name, 200, y)
    g.textAlign = 'right'
    g.fillText(score, canvas.width - 110, y)
  })
  g.globalAlpha = 1
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

// A slowly turning panel of light. Scanlines roll down it and it flickers
// now and then, like a hologram.
export function buildScoreboard() {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    fog: false,
    toneMapped: false,
    uniforms: { uMap: { value: drawScoreboard() }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(uMap, vUv);
        float scan = 0.82 + 0.18 * sin((vUv.y * 220.0) + uTime * 6.0);
        float roll = smoothstep(0.0, 0.04, abs(fract(vUv.y - uTime * 0.12) - 0.5));
        float flicker = step(0.985, fract(sin(floor(uTime * 12.0)) * 43758.5)) * 0.5;
        float a = c.a * scan * (0.75 + 0.25 * roll) * (1.0 - flicker);
        gl_FragColor = vec4(c.rgb * 1.6 * a, a);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(320, 200), material)
  return mesh
}

// --- Blimps ----------------------------------------------------------------

function drawBlimpSign() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const g = canvas.getContext('2d')!
  g.fillStyle = '#0d1a2b'
  g.fillRect(0, 0, 512, 128)
  g.fillStyle = '#ffcf5a'
  g.font = '800 84px ui-sans-serif, Helvetica, Arial, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('OASIS', 256, 68)
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function buildBlimp() {
  const blimp = new THREE.Group()
  const skin = new THREE.MeshStandardMaterial({ color: 0xc9c4ba, roughness: 0.55, metalness: 0.1 })
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), skin)
  hull.scale.set(9, 9, 34)
  blimp.add(hull)
  const finGeo = new THREE.BoxGeometry(0.4, 8, 7)
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, skin)
    const a = (i * Math.PI) / 2
    fin.position.set(Math.sin(a) * 5, Math.cos(a) * 5, -28)
    fin.rotation.z = -a
    blimp.add(fin)
  }
  const gondola = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.6 }),
  )
  gondola.position.set(0, -9.6, 4)
  blimp.add(gondola)
  // A lit sign down each flank.
  const sign = new THREE.MeshBasicMaterial({ map: drawBlimpSign(), toneMapped: false })
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), sign)
    panel.position.set(side * 9.05, 0, 0)
    panel.rotation.y = side * (Math.PI / 2)
    blimp.add(panel)
  }
  return blimp
}

// --- Fireworks -------------------------------------------------------------

type BurstStyle = {
  bursts: number
  sparks: number
  life: number // seconds
  reach: number // metres the sparks fly out
  gravity: number
  size: number
  twinkle: number // 0 steady, 1 flickering
  palette: number[]
}

const FIREWORKS: BurstStyle = {
  bursts: 24,
  sparks: 160,
  life: 2.6,
  reach: 38,
  gravity: 4.5,
  size: 900,
  twinkle: 0,
  palette: [0xffc34d, 0xff6b3d, 0xfff1c9, 0x7fd8ff, 0xff4d6d],
}

// The small glittering burst when the car flies through a ring.
const SPARKLE: BurstStyle = {
  bursts: 12,
  sparks: 200,
  life: 1.8,
  reach: 9,
  gravity: 1.5,
  size: 150,
  twinkle: 1,
  palette: [0xffe9a8, 0xffffff, 0xffc34d, 0x9ff3ff],
}

// Each burst is a shell that explodes into a sphere of sparks, which slow,
// fall and fade. All bursts share one Points mesh; timing runs on the GPU.
export function buildFireworks(style: BurstStyle = FIREWORKS) {
  const { bursts: BURSTS, sparks: SPARKS, life: BURST_LIFE, palette: PALETTE } = style
  const count = BURSTS * SPARKS
  const dir = new Float32Array(count * 3)
  const burst = new Float32Array(count)
  const color = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const c = new THREE.Color()
  for (let b = 0; b < BURSTS; b++) {
    c.set(PALETTE[b % PALETTE.length])
    for (let i = 0; i < SPARKS; i++) {
      const k = b * SPARKS + i
      seed[k] = Math.random()
      // Sparkles mix their colours within each burst.
      if (style.twinkle > 0) c.set(PALETTE[Math.floor(Math.random() * PALETTE.length)])
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const r = Math.sqrt(1 - u * u)
      const speed = 0.8 + Math.random() * 0.25
      dir.set([r * Math.cos(th) * speed, u * speed, r * Math.sin(th) * speed], k * 3)
      burst[k] = b
      color.set([c.r, c.g, c.b], k * 3)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('aDir', new THREE.BufferAttribute(dir, 3))
  geometry.setAttribute('aBurst', new THREE.BufferAttribute(burst, 1))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(color, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  const centres = Array.from({ length: BURSTS }, () => new THREE.Vector4(0, 0, 0, -10))
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    toneMapped: false,
    uniforms: {
      uCentres: { value: centres },
      uTime: { value: 0 },
      uPixel: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform vec4 uCentres[${BURSTS}];
      uniform float uTime;
      uniform float uPixel;
      attribute vec3 aDir;
      attribute float aBurst;
      attribute vec3 aColor;
      attribute float aSeed;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec4 c = uCentres[int(aBurst)];
        float age = uTime - c.w;
        float live = step(0.0, age) * step(age, ${BURST_LIFE.toFixed(1)});
        // Fast out, then drag and gravity.
        float travel = ${style.reach.toFixed(1)} * (1.0 - exp(-age * 2.2));
        vec3 p = c.xyz + aDir * travel + vec3(0.0, -${style.gravity.toFixed(1)} * age * age, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float flicker = mix(1.0, step(0.45, fract(aSeed * 13.0 + uTime * (6.0 + aSeed * 10.0))), ${style.twinkle.toFixed(1)});
        vFade = live * flicker * (1.0 - smoothstep(0.6, ${BURST_LIFE.toFixed(1)}, age));
        vColor = aColor;
        gl_PointSize = live * uPixel * ${style.size.toFixed(1)} / -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vFade;
        gl_FragColor = vec4(vColor * 3.0 * a, a);
      }`,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  let next = 0
  return {
    points,
    material,
    // Fire one shell, centred at `at`, now.
    launch(at: THREE.Vector3, time: number) {
      centres[next].set(at.x, at.y, at.z, time)
      next = (next + 1) % BURSTS
    },
  }
}

export function buildSparkles() {
  return buildFireworks(SPARKLE)
}

// --- Rings -----------------------------------------------------------------

export const RING_RADIUS = 11
// From the blimp's centre down to the ring's centre.
export const RING_DROP = 36
const RING_IDLE = new THREE.Color(0x5fe3ff)
const RING_DONE = new THREE.Color(0xffc34d)

// A glowing ring slung on two cables under a blimp, square to its length,
// so the car flies through it along the blimp's heading. It glows through
// the haze, so it can be found from across the city.
export function hangRing(blimp: THREE.Group) {
  const material = new THREE.MeshBasicMaterial({ color: RING_IDLE.clone(), toneMapped: false, fog: false })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, 0.7, 16, 96), material)
  ring.position.set(0, -RING_DROP, 0)
  blimp.add(ring)
  const cable = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.7 })
  const top = new THREE.Vector3()
  const bottom = new THREE.Vector3()
  for (const side of [-1, 1]) {
    const a = side * 0.35
    top.set(side * 4.5, -7.5, 0)
    bottom.set(Math.sin(a) * RING_RADIUS, -RING_DROP + Math.cos(a) * RING_RADIUS, 0)
    const length = top.distanceTo(bottom)
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, length, 6), cable)
    line.position.copy(top).add(bottom).multiplyScalar(0.5)
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.sub(bottom).normalize())
    blimp.add(line)
  }
  let flash = 0
  let done = false
  return {
    ring,
    get done() {
      return done
    },
    pass() {
      done = true
      flash = 1
    },
    reset() {
      done = false
      flash = 0
    },
    // Unpassed rings pulse cyan; passed ones turn gold after a white flash.
    update(time: number, dt: number) {
      flash = Math.max(flash - dt * 1.5, 0)
      if (done) material.color.copy(RING_DONE).multiplyScalar(1.6).lerp(new THREE.Color(6, 6, 6), flash)
      else material.color.copy(RING_IDLE).multiplyScalar(2 + Math.sin(time * 3) * 0.6)
      ring.scale.setScalar(1 + flash * 0.15)
    },
  }
}

// --- Starting gate ---------------------------------------------------------

const GATE_SPAN = 22 // between the towers, clear of the road and shoulders
const GATE_HEIGHT = 11
const BULBS = 28

function drawGateSign() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 256
  const g = canvas.getContext('2d')!
  const gold = '#ffcf5a'
  g.fillStyle = '#0b0f17'
  g.fillRect(0, 0, canvas.width, canvas.height)
  g.strokeStyle = gold
  g.lineWidth = 10
  g.strokeRect(12, 12, canvas.width - 24, canvas.height - 24)
  g.fillStyle = gold
  g.font = '800 132px ui-sans-serif, Helvetica, Arial, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('WELCOME TO THE OASIS', canvas.width / 2, canvas.height / 2 + 6)
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function drawChecker() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 8
  const g = canvas.getContext('2d')!
  for (let x = 0; x < 64; x++) {
    for (let y = 0; y < 8; y++) {
      g.fillStyle = (x + y) % 2 === 0 ? '#e9e6dc' : '#121212'
      g.fillRect(x, y, 1, 1)
    }
  }
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  return t
}

// A steel truss over the road with a lit sign, a row of chase lights, and a
// checkered line painted across the road beneath it. The car approaches
// from -Z.
export function buildStartGate() {
  const gate = new THREE.Group()
  const steel = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.45, metalness: 0.75 })
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), steel)
    m.position.set(x, y, z)
    m.rotation.z = rz
    m.castShadow = true
    gate.add(m)
  }
  const half = GATE_SPAN / 2
  for (const side of [-1, 1]) {
    add(1.3, GATE_HEIGHT, 1.3, side * half, GATE_HEIGHT / 2, 0)
    add(2.6, 0.4, 2.6, side * half, 0.2, 0)
  }
  // Truss: two chords with diagonals between them.
  const top = GATE_HEIGHT
  const bottom = GATE_HEIGHT - 3.6
  add(GATE_SPAN + 1.3, 0.45, 0.9, 0, top, 0)
  add(GATE_SPAN + 1.3, 0.45, 0.9, 0, bottom, 0)
  const bays = 8
  const bay = GATE_SPAN / bays
  const rise = top - bottom
  const diag = Math.hypot(bay, rise)
  for (let i = 0; i < bays; i++) {
    const x = -half + bay * (i + 0.5)
    const tilt = Math.atan2(rise, bay) * (i % 2 === 0 ? 1 : -1)
    add(diag, 0.22, 0.5, x, (top + bottom) / 2, 0.35, tilt)
    add(diag, 0.22, 0.5, x, (top + bottom) / 2, -0.35, tilt)
  }

  // The sign, readable from both sides.
  // Not tone mapped, so pushing its colour above 1 makes it flare through
  // the bloom.
  const signMat = new THREE.MeshBasicMaterial({ map: drawGateSign(), toneMapped: false })
  for (const face of [-1, 1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(GATE_SPAN - 3, (GATE_SPAN - 3) / 8), signMat)
    sign.position.set(0, (top + bottom) / 2, face * 0.8)
    sign.rotation.y = face < 0 ? Math.PI : 0
    gate.add(sign)
  }

  // Chase lights along the top chord, both faces.
  const bulbGeo = new THREE.SphereGeometry(0.16, 10, 8)
  const bulbMat = new THREE.MeshBasicMaterial({ toneMapped: false })
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, BULBS * 2)
  const m = new THREE.Matrix4()
  for (let i = 0; i < BULBS; i++) {
    const x = -half + (GATE_SPAN * (i + 0.5)) / BULBS
    m.setPosition(x, top + 0.45, 0.5)
    bulbs.setMatrixAt(i, m)
    m.setPosition(x, top + 0.45, -0.5)
    bulbs.setMatrixAt(i + BULBS, m)
  }
  gate.add(bulbs)

  // Checkered start line across the road.
  const checker = drawChecker()
  checker.wrapS = THREE.RepeatWrapping
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 2),
    new THREE.MeshStandardMaterial({ map: checker, roughness: 0.8 }),
  )
  line.rotation.x = -Math.PI / 2
  line.position.y = 0.02
  line.receiveShadow = true
  gate.add(line)

  const on = new THREE.Color(0xffd27a).multiplyScalar(2.2)
  const off = new THREE.Color(0x3a2a10)
  const flash = new THREE.Color()
  return {
    gate,
    // `lapTime` is seconds into the lap, `passTime` when the car goes under.
    // The sign snaps on at the start of the lap, the lights chase fast, and
    // everything flares as the car passes beneath.
    update(time: number, lapTime: number, passTime: number) {
      const snapOn = Math.min(lapTime / 0.12, 1)
      const since = lapTime - passTime
      const flare = since >= 0 ? Math.exp(-since * 5) : 0
      // A short double blink before the car arrives.
      const blink = lapTime > passTime - 0.5 && lapTime < passTime && Math.floor(lapTime * 12) % 2 === 0 ? 0.6 : 0
      signMat.color.setScalar(snapOn * (1 + 2.2 * flare + blink))
      const step = Math.floor(time * 16)
      flash.copy(on).multiplyScalar(1 + 1.5 * flare)
      for (let i = 0; i < BULBS; i++) {
        const c = flare > 0.2 || (i + step) % 3 === 0 ? flash : off
        bulbs.setColorAt(i, c)
        bulbs.setColorAt(i + BULBS, c)
      }
      bulbs.instanceColor!.needsUpdate = true
    },
  }
}

// --- Exit pad --------------------------------------------------------------

export const EXIT_RADIUS = 5

function drawExitSign() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = 'rgba(8, 10, 14, 0.85)'
  g.fillRect(0, 0, c.width, c.height)
  g.strokeStyle = '#ff5c7a'
  g.lineWidth = 10
  g.strokeRect(10, 10, c.width - 20, c.height - 20)
  g.fillStyle = '#ffd6de'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = 'bold 96px monospace'
  g.fillText('EXIT · HOME', c.width / 2, 100)
  g.font = '44px monospace'
  g.fillStyle = '#ff8fa3'
  g.fillText('drive onto the pad', c.width / 2, 190)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// A glowing pad on the ground with a column of light over it and a sign.
// Driving onto it leaves the OASIS.
export function buildExitPad() {
  const pad = new THREE.Group()
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5c7a), toneMapped: false })
  const ring = new THREE.Mesh(new THREE.RingGeometry(EXIT_RADIUS - 0.5, EXIT_RADIUS, 64), glow)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.03
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(EXIT_RADIUS - 0.5, 64),
    new THREE.MeshBasicMaterial({ color: 0xff5c7a, transparent: true, opacity: 0.18, depthWrite: false }),
  )
  inner.rotation.x = -Math.PI / 2
  inner.position.y = 0.02
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(EXIT_RADIUS - 0.5, EXIT_RADIUS - 0.5, 30, 48, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float fade = pow(1.0 - vUv.y, 2.5);
          float bands = 0.75 + 0.25 * sin(vUv.y * 40.0 - uTime * 4.0);
          gl_FragColor = vec4(vec3(1.0, 0.36, 0.48) * fade * bands * 0.5, 1.0);
        }`,
    }),
  )
  beam.position.y = 15
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2),
    new THREE.MeshBasicMaterial({ map: drawExitSign(), toneMapped: false, side: THREE.DoubleSide }),
  )
  sign.position.set(0, 7, 0)
  pad.add(ring, inner, beam, sign)
  return {
    pad,
    update(time: number, camera: THREE.Camera) {
      ;(beam.material as THREE.ShaderMaterial).uniforms.uTime.value = time
      glow.color.setRGB(1, 0.36, 0.48).multiplyScalar(1.6 + Math.sin(time * 4) * 0.5)
      // The sign turns to face the camera, upright.
      sign.rotation.y = Math.atan2(camera.position.x - pad.position.x, camera.position.z - pad.position.z)
    },
  }
}
