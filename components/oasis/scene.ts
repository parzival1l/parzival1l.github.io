import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

export type CameraMode = 'cinematic' | 'free'

type Options = {
  onReady: () => void
  onError: (err: unknown) => void
  onModeChange?: (mode: CameraMode) => void
  onPauseChange?: (paused: boolean) => void
  // Seconds into the loop to start at; handy for checking one phase.
  startAt?: number
}

// One loop of the flight, in seconds. Take-off: hover up off the road, fold
// the wheels flat, then climb. Landing runs the same steps in reverse, so the
// wheels are down and still before they touch the road.
const LOOP = 23
const WHEEL_RADIUS = 0.334
const GROUND_SPEED = 28
const AIR_SPEED = 42
const CRUISE_ALTITUDE = 5

const HAZE = new THREE.Color(0.22, 0.02, 0.24)

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1)
  return x * x * (3 - 2 * x)
}

const HOVER_HEIGHT = 0.55
const WHEEL_TUCK = 0.14
const WHEEL_DROP = 0.06

// The cinematic camera's shot list, timed to the flight loop. Each key is the
// camera's place around the car: `az` is the angle around it (0 in front,
// PI behind), `h` the height above it, `d` the distance, and `look` the point
// on the car it aims at. The camera eases through the keys, so it never holds
// still.
type ShotKey = { t: number; az: number; h: number; d: number; look: [number, number] }
const PI = Math.PI
const SHOTS: ShotKey[] = [
  { t: 0, az: PI + 0.25, h: 0.05, d: 2.4, look: [0.7, -1.8] }, // the PARZIVAL plate
  { t: 2.5, az: PI - 0.2, h: 0.5, d: 3.6, look: [0.7, -1.2] },
  { t: 4, az: PI + 0.5, h: 1.0, d: 5.5, look: [0.6, 0] }, // a full turn around the car
  { t: 6.5, az: 2 * PI + 0.5, h: 0.5, d: 5.2, look: [0.5, 0] }, // side-on as the wheels fold
  { t: 9, az: 3 * PI + 0.5, h: 0.2, d: 6, look: [0.5, 0] },
  { t: 11, az: 3 * PI + 0.9, h: -2.5, d: 7, look: [0.4, 0.5] }, // from below as it climbs
  { t: 13, az: 3 * PI - 1.3, h: 0.2, d: 8, look: [0.4, 0] }, // tracking alongside in flight
  { t: 16, az: 3 * PI - 2.4, h: 0.8, d: 8, look: [0.4, 0.5] }, // ahead of it, coming down
  { t: 19, az: 3 * PI - 2.7, h: 0.5, d: 6, look: [0.4, 0] },
  { t: 21.5, az: 3 * PI - 0.5, h: 0.6, d: 4.5, look: [0.6, -0.8] },
]

function shotAt(t: number) {
  const n = SHOTS.length
  let i = n - 1
  while (i > 0 && SHOTS[i].t > t) i--
  const key = (k: number) => {
    const s = SHOTS[((k % n) + n) % n]
    const lap = Math.floor(k / n)
    // Angles keep turning across the loop instead of snapping back.
    return { ...s, t: s.t + lap * LOOP, az: s.az + lap * 2 * PI }
  }
  const p0 = key(i - 1)
  const p1 = key(i)
  const p2 = key(i + 1)
  const p3 = key(i + 2)
  const u = (t - p1.t) / (p2.t - p1.t)
  // Catmull-Rom through the keys gives smooth speed changes between shots.
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u)
  return {
    az: cr(p0.az, p1.az, p2.az, p3.az),
    h: cr(p0.h, p1.h, p2.h, p3.h),
    d: cr(p0.d, p1.d, p2.d, p3.d),
    lookY: cr(p0.look[0], p1.look[0], p2.look[0], p3.look[0]),
    lookZ: cr(p0.look[1], p1.look[1], p2.look[1], p3.look[1]),
  }
}

function flightState(t: number) {
  const hover = smooth(5, 6, t) - smooth(20.5, 21.5, t)
  const fold = smooth(6, 7.5, t) - smooth(18.5, 20, t)
  const lift = smooth(7.5, 10, t) - smooth(15.5, 18.5, t)
  const cruise = smooth(10, 11.5, t) - smooth(14, 15.5, t)
  const phase = (t - 10) * 0.6
  // A small dip as the tyres take the weight.
  const touchdown = Math.sin(Math.PI * smooth(21.3, 22.1, t)) * -0.04
  return {
    hover,
    fold,
    lift,
    cruise,
    x: Math.sin(phase) * 4 * cruise,
    y: HOVER_HEIGHT * hover + CRUISE_ALTITUDE * lift + touchdown,
    roll: -Math.cos(phase) * 0.3 * cruise,
    pitch:
      -(smooth(7.5, 8.7, t) - smooth(9, 10, t)) * 0.12 +
      (smooth(15.5, 16.5, t) - smooth(17.5, 18.5, t)) * 0.08,
    speed: THREE.MathUtils.lerp(GROUND_SPEED, AIR_SPEED, lift),
    thrust: fold * (0.55 + 0.45 * lift),
  }
}

// A soft jet of light under each flattened wheel. Bright at the hub, fading
// to nothing at the tip, and softer at the silhouette edges.
function buildThrusterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uPower: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uPower;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float facing = pow(abs(dot(vN, vV)), 1.4);
        float along = pow(vUv.y, 1.8);
        float flicker = 0.85 + 0.15 * sin(uTime * 45.0 + vUv.y * 18.0);
        vec3 col = mix(vec3(0.05, 0.55, 1.0), vec3(0.85, 0.98, 1.0), along);
        float a = facing * along * uPower * flicker;
        gl_FragColor = vec4(col * 1.2, a * 0.8);
      }`,
  })
}

function buildEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene()
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: /* glsl */ `
          varying vec3 vP;
          void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vP;
          void main() {
            float h = normalize(vP).y;
            vec3 top = vec3(0.03, 0.0, 0.1);
            vec3 horizon = vec3(1.0, 0.25, 0.65);
            vec3 ground = vec3(0.04, 0.0, 0.08);
            vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.5)) : mix(horizon * 0.5, ground, pow(-h, 0.4));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    ),
  )
  const panel = (color: THREE.Color, position: THREE.Vector3, w: number, h: number) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    )
    mesh.position.copy(position)
    mesh.lookAt(0, 0, 0)
    scene.add(mesh)
  }
  panel(new THREE.Color(0x00e5ff).multiplyScalar(4), new THREE.Vector3(-30, 8, 0), 24, 6)
  panel(new THREE.Color(0xff2bd6).multiplyScalar(4), new THREE.Vector3(30, 8, 0), 24, 6)
  panel(new THREE.Color(0xffffff).multiplyScalar(2.5), new THREE.Vector3(0, 40, 0), 40, 20)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const target = pmrem.fromScene(scene, 0.02)
  pmrem.dispose()
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose()
      o.material.dispose()
    }
  })
  return target
}

function buildSky() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uHaze: { value: HAZE } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uHaze;
        varying vec3 vDir;
        float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
        void main() {
          float h = max(vDir.y, 0.0);
          vec3 c = mix(uHaze, vec3(0.005, 0.0, 0.02), pow(h, 0.35));
          vec3 cell = floor(vDir * 260.0);
          float star = step(0.9975, hash(cell)) * smoothstep(0.05, 0.3, h);
          c += vec3(star) * 1.5;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  )
}

function buildSun() {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        if (length(p) > 1.0) discard;
        float y = vUv.y;
        if (y < 0.48) {
          float band = fract(y * 16.0 - uTime * 0.35);
          float gap = mix(0.04, 0.55, (0.48 - y) / 0.48);
          if (band < gap) discard;
        }
        vec3 c = mix(vec3(1.0, 0.08, 0.5), vec3(1.0, 0.85, 0.25), smoothstep(0.1, 0.95, y));
        gl_FragColor = vec4(c * 1.05, 1.0);
      }`,
  })
  return new THREE.Mesh(new THREE.PlaneGeometry(220, 220), material)
}

function buildGrid() {
  const material = new THREE.ShaderMaterial({
    uniforms: { uCenter: { value: new THREE.Vector3() }, uHaze: { value: HAZE } },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCenter;
      uniform vec3 uHaze;
      varying vec3 vW;
      void main() {
        vec2 c = vW.xz / 4.0;
        vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
        float grid = 1.0 - min(min(g.x, g.y), 1.0);

        float fx = fwidth(vW.x);
        float edge = 1.0 - min(max(abs(abs(vW.x) - 3.2) - 0.06, 0.0) / fx, 1.0);
        float dash = step(0.5, fract(vW.z / 6.0)) * (1.0 - min(max(abs(vW.x) - 0.06, 0.0) / fx, 1.0));
        float road = 1.0 - step(3.2, abs(vW.x));

        float d = length(vW.xz - uCenter.xz);
        float fade = 1.0 - smoothstep(30.0, 280.0, d);

        vec3 col = vec3(0.012, 0.0, 0.03);
        col = mix(col, vec3(0.0, 0.0, 0.01), road);
        col += vec3(1.0, 0.12, 0.85) * 0.9 * grid * fade * (1.0 - road);
        col += vec3(0.1, 0.9, 1.0) * 1.2 * (edge + dash * 0.5) * fade;
        col = mix(col, uHaze, smoothstep(140.0, 320.0, d));
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), material)
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

// City blocks line both sides of the road. The scan is one block of
// Manhattan around the Flatiron (229 m wide, 317 m deep); copies repeat
// along the road, turned alternately so the repeat is harder to spot, and
// leapfrog ahead as the car passes them. The road stays open down the middle
// so the sun shows at the end of it.
const BLOCK_WIDTH = 229
const BLOCK_DEPTH = 317
const BLOCKS_PER_SIDE = 3
const CITY_SPAN = BLOCK_DEPTH * BLOCKS_PER_SIDE
const ROAD_CLEARANCE = 42

function buildCity(source: THREE.Object3D) {
  source.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const m = o.material as THREE.MeshStandardMaterial
    // Night-time: darken the daylight scan, and let its own texture glow
    // faintly pink so windows and facades read against the haze.
    m.color.setScalar(0.2)
    m.emissiveMap = m.map
    m.emissive.set(0xff6ad5).multiplyScalar(0.16)
    m.roughness = 0.9
    m.metalness = 0
  })
  const blocks = Array.from({ length: BLOCKS_PER_SIDE * 2 }, (_, i) => {
    const block = source.clone()
    const side = i % 2 === 0 ? 1 : -1
    block.rotation.y = (Math.floor(i / 2) + (side > 0 ? 0 : 1)) % 2 === 0 ? 0 : Math.PI
    return { block, side, z: Math.floor(i / 2) * BLOCK_DEPTH }
  })
  return blocks
}

function placeCity(blocks: ReturnType<typeof buildCity>, carZ: number) {
  for (const b of blocks) {
    const rel = (((b.z - carZ + BLOCK_DEPTH) % CITY_SPAN) + CITY_SPAN) % CITY_SPAN
    b.block.position.set(
      b.side * (ROAD_CLEARANCE + BLOCK_WIDTH / 2),
      0.15,
      carZ - BLOCK_DEPTH / 2 + rel,
    )
  }
}

export function startOasis(
  canvas: HTMLCanvasElement,
  { onReady, onError, onModeChange, onPauseChange, startAt = 0 }: Options,
) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let disposed = false

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  const scene = new THREE.Scene()
  const env = buildEnvironment(renderer)
  scene.environment = env.texture

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000)
  camera.position.set(0, 2.5, -8)

  const sky = buildSky()
  const sun = buildSun()
  const grid = buildGrid()
  scene.add(sky, sun, grid)
  scene.fog = new THREE.Fog(HAZE, 140, 700)
  let city: ReturnType<typeof buildCity> = []

  const car = new THREE.Group()
  scene.add(car)
  const wheels: {
    node: THREE.Object3D
    side: number
    home: THREE.Vector3
    hub: THREE.Mesh
    jet: THREE.Mesh
  }[] = []
  const thrusterMaterial = buildThrusterMaterial()
  const thrusterGeometry = new THREE.CylinderGeometry(0.24, 0.05, 1.2, 24, 1, true)
  thrusterGeometry.translate(0, -0.6, 0)
  const hubMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x8ff0ff).multiplyScalar(1.1),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const hubGeometry = new THREE.CircleGeometry(0.26, 32)

  const draco = new DRACOLoader().setDecoderPath('/oasis/draco/')
  const loader = new GLTFLoader().setDRACOLoader(draco)
  let loaded = false
  loader.load(
    '/oasis/delorean.glb',
    (gltf) => {
      if (disposed) return
      car.add(gltf.scene)
      gltf.scene.traverse((o) => {
        // Each wheel loads as a group of per-material meshes (Wheel_FL_1, ...);
        // only the group itself should turn.
        if (!/^Wheel_(FL|FR|RL|RR)$/.test(o.name)) return
        // Spin about the axle first, then fold about the car's length.
        o.rotation.order = 'ZYX'
        const hub = new THREE.Mesh(hubGeometry, hubMaterial)
        hub.rotation.x = Math.PI / 2
        const jet = new THREE.Mesh(thrusterGeometry, thrusterMaterial)
        car.add(hub, jet)
        wheels.push({ node: o, side: o.position.x > 0 ? 1 : -1, home: o.position.clone(), hub, jet })
      })
      loaded = true
      if (process.env.NODE_ENV === 'development') {
        Object.assign(window, { __oasis: { camera, controls, car, wheels, THREE } })
      }
      onReady()
    },
    undefined,
    (err) => {
      if (!disposed) onError(err)
    },
  )
  // The car doesn't wait for the city; the blocks appear once they load.
  loader.load('/oasis/city.glb', (gltf) => {
    if (disposed) return
    city = buildCity(gltf.scene)
    for (const b of city) scene.add(b.block)
  })

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.35, 0.85))
  composer.addPass(new OutputPass())

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.minDistance = 2.2
  controls.maxDistance = 40
  controls.zoomSpeed = 0.8

  let mode: CameraMode = 'cinematic'
  let blend = 1
  const setMode = (next: CameraMode) => {
    if (mode === next) return
    mode = next
    if (next === 'cinematic') blend = 0
    onModeChange?.(next)
  }
  controls.addEventListener('start', () => setMode('free'))

  let paused = false
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.code === 'Space') {
      e.preventDefault()
      paused = !paused
      onPauseChange?.(paused)
    } else if (e.key.toLowerCase() === 'c') {
      setMode('cinematic')
    }
  }
  window.addEventListener('keydown', onKeyDown)

  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  const desired = new THREE.Vector3()
  const lookAt = new THREE.Vector3()
  const previous = new THREE.Vector3()
  let elapsed = reducedMotion ? 12 : startAt
  let carZ = 0
  let last = performance.now()

  renderer.setAnimationLoop(() => {
    const now = performance.now()
    const frameDt = Math.min((now - last) / 1000, 0.05)
    last = now
    const dt = reducedMotion || paused || !loaded ? 0 : frameDt
    elapsed += dt
    const s = flightState(elapsed % LOOP)

    previous.copy(car.position)
    carZ += s.speed * dt
    car.position.set(s.x, s.y + Math.sin(elapsed * 9) * 0.012 * s.fold, carZ)
    car.rotation.set(s.pitch, 0, s.roll, 'YXZ')

    for (const w of wheels) {
      w.node.rotation.x += (s.speed * dt * (1 - s.hover)) / WHEEL_RADIUS
      w.node.rotation.z = -w.side * (Math.PI / 2) * s.fold
      // Folded flat, the wheel tucks in under the sill, hub facing the road.
      w.node.position.set(
        w.home.x - w.side * WHEEL_TUCK * s.fold,
        w.home.y - WHEEL_DROP * s.fold,
        w.home.z,
      )
      const underside = w.node.position.y - 0.17
      w.hub.position.set(w.node.position.x, underside - 0.005, w.home.z)
      w.jet.position.set(w.node.position.x, underside, w.home.z)
      w.jet.scale.set(1, 0.3 + 0.7 * s.thrust, 1)
    }
    thrusterMaterial.uniforms.uPower.value = s.thrust
    thrusterMaterial.uniforms.uTime.value = elapsed
    hubMaterial.opacity = Math.min(s.thrust * 1.2, 0.85)

    if (mode === 'cinematic') {
      const shot = shotAt(elapsed % LOOP)
      desired.set(
        car.position.x + Math.sin(shot.az) * shot.d,
        Math.max(car.position.y + shot.h, 0.25),
        carZ + Math.cos(shot.az) * shot.d,
      )
      // Glide back into the shot after the reader lets go of the camera.
      blend = Math.min(blend + frameDt / 1.2, 1)
      if (blend < 1) {
        camera.position.add(lookAt.subVectors(car.position, previous))
        camera.position.add(desired.sub(camera.position).multiplyScalar(blend * blend))
      } else camera.position.copy(desired)
      lookAt.set(car.position.x, car.position.y + shot.lookY, carZ + shot.lookZ)
      camera.lookAt(lookAt)
      controls.target.copy(lookAt)
    } else {
      // Ride along with the car, keeping whatever angle the reader chose.
      camera.position.add(desired.subVectors(car.position, previous))
      controls.target.set(car.position.x, car.position.y + 0.5, carZ)
      controls.update()
      if (camera.position.y < 0.15) camera.position.y = 0.15
    }

    grid.position.set(0, 0, Math.round(carZ / 4) * 4)
    ;(grid.material as THREE.ShaderMaterial).uniforms.uCenter.value.set(0, 0, carZ)
    sky.position.copy(camera.position)
    sun.position.set(0, 55, carZ + 520)
    sun.lookAt(sun.position.x, sun.position.y, carZ)
    ;(sun.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed
    placeCity(city, carZ)

    composer.render()
  })

  return () => {
    disposed = true
    renderer.setAnimationLoop(null)
    window.removeEventListener('resize', resize)
    window.removeEventListener('keydown', onKeyDown)
    controls.dispose()
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of mats) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
          m.dispose()
        }
      }
    })
    env.dispose()
    draco.dispose()
    composer.dispose()
    renderer.dispose()
  }
}

