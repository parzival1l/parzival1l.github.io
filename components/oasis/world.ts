import * as THREE from 'three'
import { Sky } from 'three/addons/objects/Sky.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Golden hour, after the film's race through a "gritty and dirty" New York:
// a low sun behind cloud, over the far end of the road (+Z) and to the right.
const SUN_ELEVATION = THREE.MathUtils.degToRad(5)
const SUN_AZIMUTH = THREE.MathUtils.degToRad(-28)
const SUN_DIRECTION = new THREE.Vector3(
  Math.sin(SUN_AZIMUTH) * Math.cos(SUN_ELEVATION),
  Math.sin(SUN_ELEVATION),
  Math.cos(SUN_AZIMUTH) * Math.cos(SUN_ELEVATION),
)
// Matches the sky just above the horizon, so distant ground fades into it.
const FOG_COLOR = new THREE.Color(0.42, 0.33, 0.27)

// Highway cross-section, in metres from the centre line.
const LANE = 3.6
const ROAD_EDGE = LANE * 1.5 + 2.5 // three lanes plus a paved shoulder
const VERGE = ROAD_EDGE + 1.5 // gravel strip before the grass

// The city: a grid of blocks either side of the road, which carries on
// through it as an avenue.
const BLOCK_X = 90 // block width across the road
const BLOCK_Z = 70 // block length along the road
const STREET = 22
const SIDEWALK = 4 // each side of a street; the rest is roadway
const COLUMNS = 7 // blocks on each side of the avenue
const ROWS = 13
const AVENUE_HALF = 22 // from the centre line to the first row of buildings
// One generated tile of city. The city is two tiles end to end, the second
// a copy of the first turned half a turn.
const TILE_HALF_LENGTH = (ROWS * (BLOCK_Z + STREET)) / 2
export const CITY_HALF_LENGTH = TILE_HALF_LENGTH * 2
const CITY_HALF_WIDTH = AVENUE_HALF + COLUMNS * (BLOCK_X + STREET)

// The brightest the sky gets, before tone mapping. At the scene's exposure
// this keeps the area round the sun below white.
const SKY_PEAK = 0.9

function configureSky(sky: Sky) {
  const u = sky.material.uniforms
  // Dusty air reddens the low sun and the horizon.
  u.turbidity.value = 9
  u.rayleigh.value = 2.4
  // A tight, faint glow around the sun instead of a blown-out halo.
  u.mieCoefficient.value = 0.002
  u.mieDirectionalG.value = 0.75
  // The stock sun disc is hundreds of times brighter than the sky; keep a
  // visible disc without flooding the frame.
  u.showSunDisc.value = 0.01
  // Heavy, broken cloud.
  u.cloudCoverage.value = 0.62
  u.cloudDensity.value = 0.7
  u.cloudScale.value = 0.00028
  u.sunPosition.value.copy(SUN_DIRECTION)

  // The stock shader lights cloud edges near the sun far brighter than the
  // rest of the sky, and bloom smears that across the frame. Soften those
  // edges, then roll off anything brighter than SKY_PEAK so the sun reads as
  // a warm glow rather than a white-out.
  const m = sky.material
  m.fragmentShader = m.fragmentShader
    .replace('cloudColor += sunColor * silver * edge * 0.6;', 'cloudColor += sunColor * silver * edge * 0.12;')
    .replace(
      'gl_FragColor = vec4( texColor, 1.0 );',
      /* glsl */ `float peak = max(texColor.r, max(texColor.g, texColor.b));
      texColor *= ${SKY_PEAK.toFixed(3)} * (1.0 - exp(-peak / ${SKY_PEAK.toFixed(3)})) / max(peak, 1e-5);
      gl_FragColor = vec4( texColor, 1.0 );`,
    )
  m.needsUpdate = true
}

export function buildAtmosphere(renderer: THREE.WebGLRenderer) {
  const sky = new Sky()
  sky.scale.setScalar(9000)
  configureSky(sky)

  // Light the car from the same sky the reader sees.
  const envScene = new THREE.Scene()
  const envSky = new Sky()
  envSky.scale.setScalar(100)
  configureSky(envSky)
  envScene.add(envSky)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(envScene, 0.02)
  pmrem.dispose()
  envSky.geometry.dispose()
  envSky.material.dispose()

  const fog = new THREE.Fog(FOG_COLOR, 250, 2600)
  return { sky, env, fog }
}

export function buildSunLight() {
  const sun = new THREE.DirectionalLight(0xffb070, 2.4)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const cam = sun.shadow.camera
  cam.left = -14
  cam.right = 14
  cam.top = 14
  cam.bottom = -14
  cam.near = 1
  cam.far = 900
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.03
  const fill = new THREE.HemisphereLight(0x8f9ab8, 0x3a3028, 0.45)
  return { sun, fill }
}

// The shadow box follows the car, so its shadow lands on the road beneath
// it, even mid-flight.
export function aimSunLight(sun: THREE.DirectionalLight, target: THREE.Vector3) {
  sun.target.position.set(target.x, 0, target.z)
  sun.position.copy(SUN_DIRECTION).multiplyScalar(600).add(sun.target.position)
  sun.target.updateMatrixWorld()
  const cam = sun.shadow.camera
  // Stretch the box upward so a car high in the air still casts.
  cam.far = 600 + target.y * 1.5 + 50
  cam.updateProjectionMatrix()
}

// Highway, verge and grass, drawn in the ground's shader so one plane covers
// everything and moves with the car. In the city, everything off the road
// turns to concrete streets and sidewalks.
export function buildGround() {
  const uniforms = { uCityZ: { value: new THREE.Vector4(1e9, 1e9, 1e9, 1e9) } }
  const material = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCityZ = uniforms.uCityZ
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGroundPos;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvGroundPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform vec4 uCityZ;
        varying vec3 vGroundPos;
        float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float gNoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(gHash(i), gHash(i + vec2(1, 0)), f.x), mix(gHash(i + vec2(0, 1)), gHash(i + vec2(1, 1)), f.x), f.y);
        }
        float band(float x, float c, float w) {
          float fw = fwidth(x);
          return 1.0 - smoothstep(w - fw, w + fw, abs(x - c));
        }
        bool inCity(vec3 p, vec2 z) {
          return abs(p.x) < ${CITY_HALF_WIDTH.toFixed(1)} && p.z > z.x && p.z < z.y;
        }
        // The streets between the blocks: two-lane asphalt with a double
        // yellow line, crosswalks at each intersection, curbs and paved
        // sidewalks. The grid repeats every tile, starting where
        // the city begins.
        vec3 cityGround(vec3 p, float start, float fine, vec3 asphalt) {
          const float halfStreet = ${(STREET / 2).toFixed(2)};
          const float roadway = ${(STREET / 2 - SIDEWALK).toFixed(2)};
          float xr = abs(p.x) - ${AVENUE_HALF.toFixed(2)};
          float zl = mod(p.z - start, ${(TILE_HALF_LENGTH * 2).toFixed(2)});
          // Distance from the centre line of the nearest cross street, and of
          // the nearest street running along the avenue.
          float dz = abs(mod(zl + ${((BLOCK_Z + STREET) / 2).toFixed(2)}, ${(BLOCK_Z + STREET).toFixed(2)}) - ${((BLOCK_Z + STREET) / 2).toFixed(2)});
          float dx = xr > 0.0
            ? abs(mod(xr - ${(BLOCK_X + STREET / 2).toFixed(2)} + ${((BLOCK_X + STREET) / 2).toFixed(2)}, ${(BLOCK_X + STREET).toFixed(2)}) - ${((BLOCK_X + STREET) / 2).toFixed(2)})
            : 1e3;
          vec3 sidewalk = vec3(0.5, 0.49, 0.46) * (0.88 + 0.18 * fine);
          float joints = max(band(fract(p.x / 1.5), 0.5, 0.02), band(fract(p.z / 1.5), 0.5, 0.02));
          sidewalk *= 1.0 - 0.12 * joints;
          float s = min(dz, dx);
          // The avenue's wide sidewalks, crossed only by the cross streets.
          if (xr <= 0.0) return dz < roadway ? asphalt : sidewalk;
          // Inside a block, between and behind the buildings.
          if (s >= halfStreet) return vec3(0.36, 0.35, 0.33) * (0.85 + 0.2 * fine);
          if (s >= roadway) return s < roadway + 0.3 ? vec3(0.62, 0.6, 0.56) : sidewalk;
          vec3 col = asphalt;
          if (dz >= halfStreet || dx >= halfStreet) {
            // Not an intersection: centre line, and a crosswalk where the
            // street meets the next one.
            float along = dx < dz ? dz : dx;
            col = mix(col, vec3(0.88, 0.72, 0.22), band(s, 0.2, 0.07));
            if (along < halfStreet + 3.0) {
              float q = dx < dz ? p.x : p.z;
              col = mix(asphalt, vec3(0.86, 0.84, 0.78), step(0.5, fract(q / 1.2)));
            }
          }
          return col;
        }`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          vec3 p = vGroundPos;
          float x = abs(p.x);
          float fine = gNoise(p.xz * 2.5);
          float broad = gNoise(p.xz * 0.04) * 0.6 + gNoise(p.xz * 0.006) * 0.4;

          vec3 asphalt = vec3(0.1, 0.1, 0.105) * (0.85 + 0.25 * fine);
          asphalt *= 1.0 - 0.07 * band(mod(p.x + ${(LANE / 2).toFixed(2)}, ${LANE.toFixed(2)}), ${(LANE / 2).toFixed(2)}, 0.8);
          float dash = step(0.6, fract(p.z / 12.0));
          float lines = band(x, ${(LANE / 2).toFixed(2)}, 0.07) * dash + band(x, ${(LANE * 1.5).toFixed(2)}, 0.1);
          vec3 road = mix(asphalt, vec3(0.86, 0.84, 0.78), clamp(lines, 0.0, 1.0));
          road = mix(road, vec3(0.9, 0.78, 0.3), band(x, ${(ROAD_EDGE - 0.15).toFixed(2)}, 0.08));

          vec3 gravel = vec3(0.38, 0.35, 0.31) * (0.8 + 0.35 * fine);
          vec3 grass = mix(vec3(0.17, 0.22, 0.09), vec3(0.3, 0.3, 0.14), broad) * (0.85 + 0.25 * fine);

          vec3 col = x < ${ROAD_EDGE.toFixed(2)} ? road : (x < ${VERGE.toFixed(2)} ? gravel : grass);
          if (x > ${ROAD_EDGE.toFixed(2)} && inCity(p, uCityZ.xy)) {
            col = cityGround(p, uCityZ.x, fine, asphalt);
          }
          diffuseColor.rgb = col;
        }`,
      )
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.receiveShadow = true
  return { mesh, cityZ: uniforms.uCityZ.value }
}


// --- Buildings -------------------------------------------------------------

// Facade palettes: masonry in brick, brownstone, limestone and render; towers
// in tinted glass. Each building picks one, then varies it slightly.
const MASONRY = [0x8e4434, 0xa0573d, 0x7a3e2e, 0xc2b49a, 0xd6cbb4, 0xb39b7c, 0x9a8a78, 0xcfc6b8]
const GLASS = [0x3f5a6b, 0x4c6670, 0x2f4a55, 0x55606a, 0x5a6b5e, 0x6b5f52]
const ROOF = new THREE.Color(0x2e2c2a)
const STONE = new THREE.Color(0xddd5c4)

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Style codes the facade shader reads: 0 masonry, 1 glass, 2 plain (roofs,
// cornices, rooftop plant).
function box(
  parts: THREE.BufferGeometry[],
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: THREE.Color,
  style: number,
) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y + h / 2, z)
  const n = g.attributes.position.count
  const colors = new Float32Array(n * 3)
  const styles = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    colors.set([color.r, color.g, color.b], i * 3)
    styles[i] = style
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.setAttribute('aStyle', new THREE.BufferAttribute(styles, 1))
  g.deleteAttribute('uv')
  parts.push(g)
}

// One building on a lot centred at (x, z). Floors are a whole number of
// storeys, so the window grid always ends cleanly at the roofline.
function building(
  parts: THREE.BufferGeometry[],
  rand: () => number,
  x: number,
  z: number,
  w: number,
  d: number,
  downtown: number,
  lots: CityLot[],
) {
  const tower = rand() < 0.08 + 0.4 * downtown
  // About half the towers are pre-war stone and brick, not glass.
  const glass = tower && rand() < 0.5
  const storey = tower ? 3.8 : 3.6
  const floors = tower
    ? Math.round(14 + rand() * (12 + 30 * downtown))
    : Math.round(3 + rand() * (4 + 10 * downtown))
  const h = floors * storey + (tower ? 0 : 1.2)
  const palette = glass ? GLASS : MASONRY
  const color = new THREE.Color(palette[Math.floor(rand() * palette.length)])
  color.offsetHSL(0, (rand() - 0.5) * 0.05, (rand() - 0.5) * 0.06)
  const style = glass ? 1 : 0
  box(parts, w, h, d, x, 0, z, color, style)
  if (tower) {
    // Setbacks: one or two narrower stages on top.
    let sw = w
    let sd = d
    let top = h
    const stages = rand() < 0.6 ? 1 + Math.floor(rand() * 2) : 0
    for (let i = 0; i < stages; i++) {
      sw *= 0.7 + rand() * 0.15
      sd *= 0.7 + rand() * 0.15
      const sh = Math.round(4 + rand() * 10) * storey
      box(parts, sw, sh, sd, x, top, z, color, style)
      top += sh
    }
    box(parts, sw * 0.4, 4, sd * 0.4, x, top, z, ROOF, 2)
    lots.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h: top })
    return { tower, h }
  } else {
    // A stone cornice along the roofline, and plant on the roof.
    // (Its top sits just above the roof, so the two don't flicker.)
    box(parts, w + 0.8, 0.9, d + 0.8, x, h - 0.8, z, STONE, 2)
    if (rand() < 0.6) box(parts, w * 0.25, 2.5, d * 0.25, x + (rand() - 0.5) * w * 0.4, h, z, ROOF, 2)
    lots.push({ x0: x - w / 2 - 0.4, x1: x + w / 2 + 0.4, z0: z - d / 2 - 0.4, z1: z + d / 2 + 0.4, h: h + 0.1 })
    return { tower, h }
  }
}

// --- Company signs ---------------------------------------------------------

// Firms from Ready Player One's world, the author's own, and invented ones.
const COMPANIES: { name: string; bg: string; fg: string; accent: string }[] = [
  { name: 'IOI', bg: '#0b1a33', fg: '#ffffff', accent: '#3d8bff' },
  { name: 'GREGARIOUS GAMES', bg: '#2a0d3a', fg: '#ffd6f5', accent: '#ff5cc8' },
  { name: 'AMPLIWORK', bg: '#101418', fg: '#f4f4f4', accent: '#7fd8ff' },
  { name: 'DISTRACTED GLOBE', bg: '#1a0f2e', fg: '#c9b6ff', accent: '#8f6bff' },
  { name: "AECH'S GARAGE", bg: '#2b1608', fg: '#ffcf8a', accent: '#ff8a1f' },
  { name: 'HALLIDAY & MORROW', bg: '#14231a', fg: '#e8f5d0', accent: '#b6e36b' },
  { name: 'COPPER KEY COFFEE', bg: '#3a1e12', fg: '#ffd7b0', accent: '#d9773a' },
  { name: 'JADE KEY JEWELERS', bg: '#0d2b25', fg: '#c6ffe9', accent: '#2fe0a6' },
  { name: 'CRYSTAL KEY HOTEL', bg: '#0f2233', fg: '#e3f4ff', accent: '#9fe1ff' },
  { name: 'PARZIVAL LABS', bg: '#0d0f12', fg: '#ffe9a8', accent: '#ffc34d' },
  { name: 'ART3MIS STUDIO', bg: '#2e0b14', fg: '#ffd1dc', accent: '#ff4d6d' },
  { name: 'DAITO & SHO', bg: '#1f1f1f', fg: '#ffffff', accent: '#e8442e' },
  { name: 'OASIS BANK', bg: '#0f1c2e', fg: '#ffffff', accent: '#ffc34d' },
  { name: 'SIXERS SUPPLY CO', bg: '#262626', fg: '#d9d9d9', accent: '#9aa0a6' },
  { name: 'PIXEL PIZZA', bg: '#b3261e', fg: '#fff3d6', accent: '#ffd23f' },
  { name: '8-BIT BURGERS', bg: '#1d3557', fg: '#f1faee', accent: '#e63946' },
  { name: 'RETRO RECORDS', bg: '#22223b', fg: '#f2e9e4', accent: '#c9ada7' },
  { name: 'GALAXY CINEMA', bg: '#0b0b2b', fg: '#fff7c2', accent: '#ffd400' },
  { name: 'NOVA PHARMACY', bg: '#0e5e3a', fg: '#ffffff', accent: '#7cff9e' },
  { name: 'MIDTOWN DELI', bg: '#f2e8cf', fg: '#7a1f1f', accent: '#bc4749' },
  { name: 'QUANTUM MOTORS', bg: '#111827', fg: '#e5e7eb', accent: '#60a5fa' },
  { name: 'NEON NOODLES', bg: '#14001f', fg: '#ff9cf2', accent: '#00f0ff' },
  { name: 'STACKS BOOKSHOP', bg: '#2d3a2e', fg: '#f6efd2', accent: '#d4a373' },
  { name: 'HIGH SCORE ARCADE', bg: '#000000', fg: '#39ff14', accent: '#ff2079' },
  { name: 'FLUX CAPACITOR LTD', bg: '#1b1b1b', fg: '#fff3b0', accent: '#ffb703' },
  { name: 'GRID CAPITAL', bg: '#0a2540', fg: '#ffffff', accent: '#00d4ff' },
  { name: 'CATACLYST INSURANCE', bg: '#2f2f3a', fg: '#ececf1', accent: '#a3a3ff' },
  { name: 'ZEMECKIS CUBE', bg: '#3b0d0d', fg: '#ffe0e0', accent: '#ff6b6b' },
  { name: 'PLAYER ONE FITNESS', bg: '#003049', fg: '#fcbf49', accent: '#f77f00' },
  { name: 'ADVENTURE CAFE', bg: '#283618', fg: '#fefae0', accent: '#dda15e' },
  { name: 'LUDUS ACADEMY', bg: '#1e2a4a', fg: '#f0f4ff', accent: '#8ab4ff' },
  { name: 'OOLOGIST BAKERY', bg: '#fff1e6', fg: '#6b2d0f', accent: '#e07a5f' },
]
const SIGN_COLS = 4
const SIGN_ROWS = 16 // two styles per company

// Where one sign goes: centre, outward normal (x, z), size, atlas cell and
// whether it's a lit crown sign on a tower or a shop sign over the door.
type SignSpot = { x: number; y: number; z: number; nx: number; nz: number; w: number; h: number; cell: number; crown: boolean }

function placeSign(
  signs: SignSpot[],
  rand: () => number,
  tower: boolean,
  height: number,
  x: number,
  z: number,
  w: number,
  d: number,
  faces: [number, number][],
) {
  if (faces.length === 0) return
  const [nx, nz] = faces[Math.floor(rand() * faces.length)]
  const facade = nx !== 0 ? d : w
  const company = Math.floor(rand() * COMPANIES.length)
  const out = (nx !== 0 ? w : d) / 2 + 0.15
  if (tower && rand() < 0.55) {
    // A big lit sign near the top of the shaft, below any setbacks.
    const sw = Math.min(facade * 0.8, 28)
    const sh = sw / 4
    signs.push({ x: x + nx * out, y: height - sh / 2 - 2, z: z + nz * out, nx, nz, w: sw, h: sh, cell: company * 2, crown: true })
  }
  if (rand() < 0.75) {
    // A shop sign over the ground floor.
    const sw = Math.min(facade * 0.7, 11)
    const sh = sw / 4
    signs.push({ x: x + nx * out, y: 4.4 + sh / 2, z: z + nz * out, nx, nz, w: sw, h: sh, cell: company * 2 + 1, crown: false })
  }
}

function drawSigns() {
  const cw = 512
  const ch = 128
  const c = document.createElement('canvas')
  c.width = cw * SIGN_COLS
  c.height = ch * SIGN_ROWS
  const g = c.getContext('2d')!
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  COMPANIES.forEach((co, i) => {
    for (const style of [0, 1]) {
      const cell = i * 2 + style
      const x = (cell % SIGN_COLS) * cw
      const y = Math.floor(cell / SIGN_COLS) * ch
      const fit = (text: string, size: number, weight: string, max: number) => {
        let s = size
        do {
          g.font = `${weight} ${s}px "Helvetica Neue", Arial, sans-serif`
          s -= 2
        } while (g.measureText(text).width > max && s > 20)
      }
      if (style === 0) {
        // Crown sign: dark panel, glowing letters, an accent rule.
        g.fillStyle = '#07080b'
        g.fillRect(x, y, cw, ch)
        g.fillStyle = co.accent
        g.fillRect(x + 24, y + ch - 22, cw - 48, 6)
        fit(co.name, 76, '800', cw - 50)
        g.shadowColor = co.accent
        g.shadowBlur = 18
        g.fillStyle = co.fg
        g.fillText(co.name, x + cw / 2, y + ch / 2 - 6)
        g.shadowBlur = 0
      } else {
        // Shop sign: painted board in the firm's colours.
        g.fillStyle = co.bg
        g.fillRect(x, y, cw, ch)
        g.strokeStyle = co.accent
        g.lineWidth = 8
        g.strokeRect(x + 8, y + 8, cw - 16, ch - 16)
        fit(co.name, 64, '700', cw - 60)
        g.fillStyle = co.fg
        g.fillText(co.name, x + cw / 2, y + ch / 2 + 2)
      }
    }
  })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function buildSigns(spots: SignSpot[]) {
  const geometry = (crown: boolean) => {
    const list = spots.filter((s) => s.crown === crown)
    const pos = new Float32Array(list.length * 12)
    const uv = new Float32Array(list.length * 8)
    const index: number[] = []
    list.forEach((s, k) => {
      // Seen from outside, the sign's right is up × normal.
      const rx = s.nz
      const rz = -s.nx
      const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]
      const u0 = (s.cell % SIGN_COLS) / SIGN_COLS
      const v1 = 1 - Math.floor(s.cell / SIGN_COLS) / SIGN_ROWS
      const v0 = v1 - 1 / SIGN_ROWS
      corners.forEach(([a, b], c) => {
        pos.set([s.x + (rx * a * s.w) / 2, s.y + (b * s.h) / 2, s.z + (rz * a * s.w) / 2], (k * 4 + c) * 3)
        uv.set([a < 0 ? u0 : u0 + 1 / SIGN_COLS, b < 0 ? v0 : v1], (k * 4 + c) * 2)
      })
      const o = k * 4
      index.push(o, o + 1, o + 2, o, o + 2, o + 3)
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    g.setIndex(index)
    g.computeVertexNormals()
    return g
  }
  const map = drawSigns()
  // Crown signs are lit, bright enough to catch a little bloom; shop signs
  // are painted boards.
  const crownMaterial = new THREE.MeshBasicMaterial({ map, toneMapped: false })
  crownMaterial.color.setScalar(1.25)
  const shopMaterial = new THREE.MeshBasicMaterial({ map })
  shopMaterial.color.setScalar(0.85)
  return { crown: geometry(true), shop: geometry(false), crownMaterial, shopMaterial }
}

// A building's footprint and roof height, for collisions.
export type CityLot = { x0: number; x1: number; z0: number; z1: number; h: number }

function buildCityGeometry(lots: CityLot[], signs: SignSpot[]) {
  const rand = mulberry32(7)
  // A separate stream for signs, so adding them leaves the city unchanged.
  const signRand = mulberry32(99)
  const parts: THREE.BufferGeometry[] = []
  const pitchX = BLOCK_X + STREET
  const pitchZ = BLOCK_Z + STREET
  for (const side of [-1, 1]) {
    for (let c = 0; c < COLUMNS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const bx = side * (AVENUE_HALF + c * pitchX + BLOCK_X / 2)
        const bz = (r - (ROWS - 1) / 2) * pitchZ
        // Taller near the middle of the city and close to the avenue.
        const dz = Math.abs(bz) / TILE_HALF_LENGTH
        const downtown = Math.max(0, 1 - Math.hypot(dz, c / COLUMNS) * 1.15)
        // Split each block into lots: two rows deep, two to four across.
        const across = 2 + Math.floor(rand() * 3)
        for (let i = 0; i < across; i++) {
          for (let j = 0; j < 2; j++) {
            const lw = BLOCK_X / across
            const ld = BLOCK_Z / 2
            const lx = bx - BLOCK_X / 2 + lw * (i + 0.5)
            const lz = bz - BLOCK_Z / 2 + ld * (j + 0.5)
            const b = building(parts, rand, lx, lz, lw - 1.5, ld - 1.5, downtown, lots)
            // Each lot is on the block's edge on at least one side; those
            // sides face a street.
            const faces: [number, number][] = []
            if (j === 0) faces.push([0, -1])
            if (j === 1) faces.push([0, 1])
            if (i === 0) faces.push([-1, 0])
            if (i === across - 1) faces.push([1, 0])
            placeSign(signs, signRand, b.tower, b.h, lx, lz, lw - 1.5, ld - 1.5, faces)
          }
        }
      }
    }
  }
  return mergeGeometries(parts)!
}

function buildingMaterial() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        attribute float aStyle;
        varying float vStyle;
        varying vec3 vLocal;
        varying vec3 vLocalNormal;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vStyle = aStyle;
        vLocal = position;
        vLocalNormal = normal;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying float vStyle;
        varying vec3 vLocal;
        varying vec3 vLocalNormal;
        float wHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float rect(vec2 f, vec2 half_) {
          vec2 fw = fwidth(f) * 0.75;
          vec2 e = smoothstep(half_ + fw, half_ - fw, abs(f - 0.5));
          return e.x * e.y;
        }
        float glassMask;`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          glassMask = 0.0;
          bool wall = abs(vLocalNormal.y) < 0.5;
          if (wall && vStyle < 1.5) {
            vec2 p = vec2(abs(vLocalNormal.x) > 0.5 ? vLocal.z : vLocal.x, vLocal.y);
            bool curtain = vStyle > 0.5;
            vec2 cell = curtain ? vec2(1.5, 3.8) : vec2(2.6, 3.6);
            vec2 id = floor(p / cell);
            vec2 f = fract(p / cell);
            if (curtain) {
              glassMask = rect(f, vec2(0.47, 0.36));
              diffuseColor.rgb *= 0.7;
            } else {
              float ground = 1.0 - step(4.2, p.y);
              glassMask = rect(f, vec2(0.24, 0.3)) * (1.0 - ground);
              // Shopfronts: wide glass at street level.
              glassMask = max(glassMask, ground * rect(fract(vec2(p.x / 5.0, p.y / 4.2)), vec2(0.42, 0.34)));
              // Lintels: a light band over each window.
              float lintel = rect(vec2(f.x, fract(f.y - 0.28)), vec2(0.27, 0.035)) * (1.0 - ground);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.83, 0.76), lintel);
            }
            // Panes vary: blinds down, lights on, sky reflection.
            float v = wHash(id + floor(vLocal.xz * 0.05));
            vec3 pane = mix(vec3(0.08, 0.1, 0.12), vec3(0.22, 0.26, 0.3), v);
            pane = mix(pane, vec3(0.55, 0.5, 0.4), step(0.93, v) * (curtain ? 0.0 : 1.0));
            diffuseColor.rgb = mix(diffuseColor.rgb, pane, glassMask);
          }
          if (!wall) diffuseColor.rgb = vec3(0.16, 0.155, 0.15) * (0.85 + 0.3 * wHash(floor(vLocal.xz * 0.2)));
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.08, glassMask);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        /* glsl */ `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.6, glassMask);`,
      )
  }
  return material
}

// The whole city, centred on the origin, and every building's footprint in
// the city's own coordinates.
export function buildCity() {
  const tileLots: CityLot[] = []
  const signSpots: SignSpot[] = []
  const geometry = buildCityGeometry(tileLots, signSpots)
  const material = buildingMaterial()
  const signs = buildSigns(signSpots)
  const group = new THREE.Group()
  const lots: CityLot[] = []
  for (const side of [-1, 1]) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.z = side * TILE_HALF_LENGTH
    // The far tile is turned around, so it doesn't read as a repeat.
    if (side > 0) mesh.rotation.y = Math.PI
    mesh.add(new THREE.Mesh(signs.crown, signs.crownMaterial), new THREE.Mesh(signs.shop, signs.shopMaterial))
    group.add(mesh)
    for (const l of tileLots) {
      lots.push(
        side < 0
          ? { ...l, z0: l.z0 - TILE_HALF_LENGTH, z1: l.z1 - TILE_HALF_LENGTH }
          : { x0: -l.x1, x1: -l.x0, z0: TILE_HALF_LENGTH - l.z1, z1: TILE_HALF_LENGTH - l.z0, h: l.h },
      )
    }
  }
  return { group, lots }
}

export const CITY_EXTENT_X = CITY_HALF_WIDTH

// Where the street trees stand, as x, z, row triples in the city's
// coordinates: on the sidewalks of every street, two metres in from the
// curb, and along the avenue. None stand in an intersection. Trees along
// one stretch of sidewalk share a row number, so a row can be one species.
const TREE_SPACING = 18
export function streetTreeSpots() {
  const spots: number[] = []
  const pitchX = BLOCK_X + STREET
  const pitchZ = BLOCK_Z + STREET
  const inset = STREET / 2 - 2
  // Trees along a stretch of sidewalk, from a to b, kept clear of its ends.
  let rowId = 0
  const row = (a: number, b: number, place: (t: number) => void) => {
    const n = Math.max(1, Math.round((b - a - 8) / TREE_SPACING) + 1)
    for (let i = 0; i < n; i++) place(n === 1 ? (a + b) / 2 : a + 4 + ((b - a - 8) * i) / (n - 1))
    rowId++
  }
  for (const tile of [-1, 1]) {
    const o = tile * TILE_HALF_LENGTH
    for (const side of [-1, 1]) {
      for (let r = 0; r < ROWS; r++) {
        const z0 = o + (r - (ROWS - 1) / 2) * pitchZ - BLOCK_Z / 2
        // Streets running along the avenue, and the avenue itself.
        for (let k = 0; k < COLUMNS; k++) {
          const cx = AVENUE_HALF + BLOCK_X + STREET / 2 + k * pitchX
          for (const x of [cx - inset, cx + inset]) {
            if (x > CITY_HALF_WIDTH - 1) continue
            row(z0, z0 + BLOCK_Z, (z) => spots.push(side * x, z, rowId))
          }
        }
        row(z0, z0 + BLOCK_Z, (z) => spots.push(side * (AVENUE_HALF - 8), z, rowId))
      }
      // Cross streets. Where the tiles meet, only the first tile plants.
      for (let k = 0; k <= ROWS; k++) {
        if (tile < 0 && k === ROWS) continue
        const cz = o - TILE_HALF_LENGTH + k * pitchZ
        for (const z of [cz - inset, cz + inset]) {
          if (Math.abs(z) > CITY_HALF_LENGTH - 1) continue
          for (let c = 0; c < COLUMNS; c++) {
            const x0 = AVENUE_HALF + c * pitchX
            row(x0, x0 + BLOCK_X, (x) => spots.push(side * x, z, rowId))
          }
        }
      }
    }
  }
  return spots
}

// The street grid, in the city's coordinates, for traffic and walkers.
// The grid is symmetric, so the turned-around tile shares it.
export function cityLayout() {
  const pitchX = BLOCK_X + STREET
  const pitchZ = BLOCK_Z + STREET
  // Centre lines of the streets running along the avenue (x > 0 side; the
  // other side mirrors them), and of the cross streets inside the city.
  const alongX: number[] = []
  for (let k = 0; k < COLUMNS; k++) alongX.push(AVENUE_HALF + BLOCK_X + STREET / 2 + k * pitchX)
  const crossZ: number[] = []
  for (let k = 1; k < ROWS * 2; k++) crossZ.push(-CITY_HALF_LENGTH + k * pitchZ)
  const blocks: { x0: number; x1: number; z0: number; z1: number }[] = []
  for (const tile of [-1, 1]) {
    for (const side of [-1, 1]) {
      for (let c = 0; c < COLUMNS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const bx = side * (AVENUE_HALF + c * pitchX + BLOCK_X / 2)
          const bz = tile * TILE_HALF_LENGTH + (r - (ROWS - 1) / 2) * pitchZ
          blocks.push({ x0: bx - BLOCK_X / 2, x1: bx + BLOCK_X / 2, z0: bz - BLOCK_Z / 2, z1: bz + BLOCK_Z / 2 })
        }
      }
    }
  }
  return {
    alongX,
    crossZ,
    blocks,
    halfWidth: CITY_HALF_WIDTH,
    halfLength: CITY_HALF_LENGTH,
    streetHalf: STREET / 2,
    roadwayHalf: STREET / 2 - SIDEWALK,
    avenueHalf: AVENUE_HALF,
  }
}
export type CityLayout = ReturnType<typeof cityLayout>
