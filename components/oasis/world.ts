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
          if (x > ${ROAD_EDGE.toFixed(2)} && (inCity(p, uCityZ.xy) || inCity(p, uCityZ.zw))) {
            col = vec3(0.36, 0.35, 0.33) * (0.85 + 0.2 * fine);
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
  } else {
    // A stone cornice along the roofline, and plant on the roof.
    // (Its top sits just above the roof, so the two don't flicker.)
    box(parts, w + 0.8, 0.9, d + 0.8, x, h - 0.8, z, STONE, 2)
    if (rand() < 0.6) box(parts, w * 0.25, 2.5, d * 0.25, x + (rand() - 0.5) * w * 0.4, h, z, ROOF, 2)
    lots.push({ x0: x - w / 2 - 0.4, x1: x + w / 2 + 0.4, z0: z - d / 2 - 0.4, z1: z + d / 2 + 0.4, h: h + 0.1 })
  }
}

// A building's footprint and roof height, for collisions.
export type CityLot = { x0: number; x1: number; z0: number; z1: number; h: number }

function buildCityGeometry(lots: CityLot[]) {
  const rand = mulberry32(7)
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
            building(parts, rand, lx, lz, lw - 1.5, ld - 1.5, downtown, lots)
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
  const geometry = buildCityGeometry(tileLots)
  const material = buildingMaterial()
  const group = new THREE.Group()
  const lots: CityLot[] = []
  for (const side of [-1, 1]) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.z = side * TILE_HALF_LENGTH
    // The far tile is turned around, so it doesn't read as a repeat.
    if (side > 0) mesh.rotation.y = Math.PI
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

