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

const BURSTS = 8
const SPARKS = 160
const BURST_LIFE = 2.6
const PALETTE = [0xffc34d, 0xff6b3d, 0xfff1c9, 0x7fd8ff, 0xff4d6d]

// Each burst is a shell that explodes into a sphere of sparks, which slow,
// fall and fade. All bursts share one Points mesh; timing runs on the GPU.
export function buildFireworks() {
  const count = BURSTS * SPARKS
  const dir = new Float32Array(count * 3)
  const burst = new Float32Array(count)
  const color = new Float32Array(count * 3)
  const c = new THREE.Color()
  for (let b = 0; b < BURSTS; b++) {
    c.set(PALETTE[b % PALETTE.length])
    for (let i = 0; i < SPARKS; i++) {
      const k = b * SPARKS + i
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
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec4 c = uCentres[int(aBurst)];
        float age = uTime - c.w;
        float live = step(0.0, age) * step(age, ${BURST_LIFE.toFixed(1)});
        // Fast out, then drag and gravity.
        float travel = 38.0 * (1.0 - exp(-age * 2.2));
        vec3 p = c.xyz + aDir * travel + vec3(0.0, -4.5 * age * age, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vFade = live * (1.0 - smoothstep(0.6, ${BURST_LIFE.toFixed(1)}, age));
        vColor = aColor;
        gl_PointSize = live * uPixel * 900.0 / -mv.z;
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
