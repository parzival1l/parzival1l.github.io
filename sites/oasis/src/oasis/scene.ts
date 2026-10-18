import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import {
  CITY_EXTENT_X,
  CITY_HALF_LENGTH,
  aimSunLight,
  cityLayout,
  streetTreeSpots,
  buildAtmosphere,
  buildGround,
  buildCity,
  buildSunLight,
} from './world'
import {
  RING_DROP,
  RING_RADIUS,
  buildBlimp,
  buildFireworks,
  buildScoreboard,
  buildSparkles,
  buildExitPad,
  buildStartGate,
  EXIT_RADIUS,
  hangRing,
} from './sky-props'
import { createSound } from './sound'
import { type District, districtAt } from './districts'
import { buildPedestrians, buildTraffic, buildTrees } from './street-life'

export type CameraMode = 'cinematic' | 'free' | 'drive'

type Options = {
  onReady: () => void
  onError: (err: unknown) => void
  onModeChange?: (mode: CameraMode) => void
  onPauseChange?: (paused: boolean) => void
  onSoundChange?: (on: boolean) => void
  // The reader took the wheel (true) or pressed R to restart (false).
  onDriveChange?: (driving: boolean) => void
  onRings?: (passed: number, total: number) => void
  // The reader drove onto the exit pad.
  onExit?: () => void
  // The car crossed into another district (null: outside the city).
  onDistrict?: (district: District | null) => void
  // Seconds into the loop to start at; handy for checking one phase.
  startAt?: number
}

// One loop of the flight, in seconds. The car drives toward the city,
// hovers, folds its wheels, climbs over the rooftops, flies the length of
// the city, comes down on the far side and lands, wheels first.
// The city is two tiles long; EXTRA is the cruise time the second adds.
const EXTRA = 17
const late = (t: number) => t + EXTRA
const LOOP = late(40)
const WHEEL_RADIUS = 0.334
const GROUND_SPEED = 28
const AIR_SPEED = 70
// Clear of the tallest towers (about 190 m).
const CRUISE_ALTITUDE = 240
const HOVER_HEIGHT = 0.55
const WHEEL_TUCK = 0.14
const WHEEL_DROP = 0.06
// The city sits under the middle of the cruise.
const CITY_AT = 21 + EXTRA / 2
// The starting gate, in metres down the road from where each lap starts.
// The car passes under it about 1.6 seconds in.
const GATE_AT = 45
// The exit pad, on the grass to the car's right just past the gate.
const EXIT_X = -24
const EXIT_AT = 95

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1)
  return x * x * (3 - 2 * x)
}

function flightState(t: number) {
  const hover = smooth(5, 6, t) - smooth(late(36.5), late(37.5), t)
  const fold = smooth(6, 7.5, t) - smooth(late(34.5), late(36), t)
  const lift = smooth(7.5, 16, t) - smooth(late(26), late(34.5), t)
  const cruise = smooth(16, 17.5, t) - smooth(late(24.5), late(26), t)
  const phase = (t - 16) * 0.55
  // A small dip as the tyres take the weight.
  const touchdown = Math.sin(Math.PI * smooth(late(37.3), late(38.1), t)) * -0.04
  return {
    hover,
    fold,
    lift,
    cruise,
    x: Math.sin(phase) * 6 * cruise,
    y: HOVER_HEIGHT * hover + CRUISE_ALTITUDE * lift + touchdown,
    roll: -Math.cos(phase) * 0.35 * cruise,
    speed: THREE.MathUtils.lerp(GROUND_SPEED, AIR_SPEED, lift),
    thrust: fold * (0.55 + 0.45 * Math.min(lift * 3, 1)),
  }
}

// Distance travelled since the start of a loop, sampled once so the car's
// position (and the city's) follows from the clock alone.
const TABLE_STEP = 0.01
const DISTANCE = (() => {
  const n = Math.ceil(LOOP / TABLE_STEP) + 1
  const table = new Float32Array(n)
  for (let i = 1; i < n; i++) {
    table[i] = table[i - 1] + flightState((i - 0.5) * TABLE_STEP).speed * TABLE_STEP
  }
  return table
})()
const LOOP_DISTANCE = DISTANCE[DISTANCE.length - 1]
// When, in seconds into the lap, the car passes under the starting gate.
const GATE_TIME = DISTANCE.findIndex((d) => d >= GATE_AT) * TABLE_STEP

function distanceAt(elapsed: number) {
  const lap = Math.floor(elapsed / LOOP)
  const f = (elapsed - lap * LOOP) / TABLE_STEP
  const i = Math.min(Math.floor(f), DISTANCE.length - 2)
  return lap * LOOP_DISTANCE + THREE.MathUtils.lerp(DISTANCE[i], DISTANCE[i + 1], f - i)
}

// The cinematic camera's shot list, timed to the flight loop. Each key is the
// camera's place around the car: `az` is the angle around it (0 in front,
// PI behind), `h` the height above it, `d` the distance, and `look` the point
// it aims at, as height above the car and distance ahead of it. The camera
// eases through the keys, so it never holds still.
// `look` is [height, ahead, across]; across defaults to 0.
type ShotKey = { t: number; az: number; h: number; d: number; look: [number, number, number?] }
const PI = Math.PI
const SHOTS: ShotKey[] = [
  { t: 0, az: PI, h: 2.4, d: 8, look: [4, 30] }, // behind, the starting gate ahead
  { t: 1.3, az: PI + 0.15, h: 1.1, d: 5, look: [2, 14] }, // under the gate
  { t: 2.3, az: PI + 0.25, h: 0.1, d: 2.6, look: [0.7, -1.8] }, // the PARZIVAL plate
  { t: 3.6, az: PI + 0.5, h: 1.0, d: 5.5, look: [0.6, 0] }, // a turn around the car
  { t: 5.2, az: 1.5 * PI + 0.45, h: 0.05, d: 3, look: [0.25, 1.2, -0.75] }, // close on the front wheel
  { t: 7, az: 1.5 * PI + 0.2, h: 0.15, d: 2.7, look: [0.2, 1.2, -0.75] }, // as it folds flat
  { t: 9.4, az: 1.5 * PI - 0.1, h: -4.5, d: 4, look: [0, 0.2] }, // underneath, the thrusters firing
  { t: 12, az: 2 * PI + 0.6, h: -3, d: 9, look: [0.4, 1] }, // from below as it climbs
  { t: 15, az: 3 * PI - 0.35, h: 6, d: 14, look: [-6, 30] }, // behind it, the city ahead
  { t: 19, az: 3 * PI - 0.4, h: 18, d: 40, look: [-20, 60] }, // over the rooftops
  { t: 23, az: 3 * PI - 1.4, h: 6, d: 22, look: [-10, 0] }, // alongside, towers below
  { t: 28, az: 3 * PI - 2.3, h: 25, d: 60, look: [-30, 40] }, // wide, from ahead and above
  { t: 33, az: 3 * PI - 0.6, h: 9, d: 24, look: [-8, 25] }, // behind, the second half of the city
  { t: late(23), az: 3 * PI - 1.4, h: 6, d: 22, look: [-10, 0] }, // alongside again
  { t: late(27), az: 2 * PI + 0.4, h: 3, d: 14, look: [0, 0] }, // ahead, coming down
  { t: late(31), az: 2 * PI + 1.2, h: 1.5, d: 10, look: [0.4, 0] },
  { t: late(35), az: 2.5 * PI + 0.45, h: 0.1, d: 3, look: [0.2, 1.2, 0.75] }, // close on a wheel as it unfolds
  { t: late(37.5), az: 2 * PI + 2.9, h: 0.6, d: 4.5, look: [0.6, -0.8] },
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
    lookX: cr(p0.look[2] ?? 0, p1.look[2] ?? 0, p2.look[2] ?? 0, p3.look[2] ?? 0),
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
    forceSinglePass: true,
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

export function startOasis(
  canvas: HTMLCanvasElement,
  { onReady, onError, onModeChange, onPauseChange, onSoundChange, onDriveChange, onRings, onExit, onDistrict, startAt = 0 }: Options,
) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let disposed = false

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.6
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  const atmosphere = buildAtmosphere(renderer)
  scene.environment = atmosphere.env.texture
  scene.fog = atmosphere.fog

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 12000)
  camera.position.set(0, 2.5, -8)

  const ground = buildGround()
  const light = buildSunLight()
  scene.add(atmosphere.sky, ground.mesh, light.sun, light.sun.target, light.fill)

  // One city per loop. When a loop ends, it jumps ahead to sit under the
  // next loop's cruise; by then it is far behind the car and lost in haze.
  const city = new THREE.Group()
  const { group: cityTiles, lots } = buildCity()
  city.add(cityTiles)
  scene.add(city)

  // Five blimps ride with the city, each with a ring slung underneath for
  // the reader to fly through. They drift a little back and forth along
  // their heading. Each one rises, if it must, until its ring clears the
  // roofs it drifts over.
  const BLIMP_DRIFT = 30
  const blimps = [
    { x: 40, y: 140, z: -1080, heading: 0.2 },
    { x: -260, y: 170, z: -600, heading: 0.7 },
    { x: 180, y: 120, z: 0, heading: -0.5 },
    { x: -120, y: 160, z: 600, heading: 2.6 },
    { x: 320, y: 150, z: 1080, heading: -2.9 },
  ].map(({ x, y, z, heading }, i) => {
    const reach = BLIMP_DRIFT + RING_RADIUS + 20
    let roofs = 0
    for (const l of lots) {
      const dx = Math.max(l.x0 - x, 0, x - l.x1)
      const dz = Math.max(l.z0 - z, 0, z - l.z1)
      if (Math.hypot(dx, dz) < reach) roofs = Math.max(roofs, l.h)
    }
    const at = new THREE.Vector3(x, Math.max(y, roofs + RING_DROP + RING_RADIUS + 25), z)
    const mesh = buildBlimp()
    mesh.position.copy(at)
    mesh.rotation.y = heading
    city.add(mesh)
    // `side` is which face of the ring the car was on last frame.
    return { mesh, at, heading, phase: i * 1.7, ring: hangRing(mesh), side: 0 }
  })
  const RINGS = blimps.length
  let ringsPassed = 0
  const playerAt = new THREE.Vector3()
  // Sparkles burst at the ring, and around the car itself, riding along
  // with it so the chase camera sees them.
  const sparkles = buildSparkles()
  const carSparkles = buildSparkles()
  scene.add(sparkles.points)
  for (const sp of [sparkles, carSparkles]) sp.material.uniforms.uPixel.value = renderer.getPixelRatio()
  const carSparkleAt = new THREE.Vector3(0, 0.6, 0)

  // Halliday's high-score board hangs in the sky ahead of the car.
  const scoreboard = buildScoreboard()
  scene.add(scoreboard)

  // Each lap starts under a gate, with fireworks going off over it.
  const startGate = buildStartGate()
  scene.add(startGate.gate)
  const exitPad = buildExitPad()
  scene.add(exitPad.pad)
  let exited = false
  const fireworks = buildFireworks()
  scene.add(fireworks.points)
  fireworks.material.uniforms.uPixel.value = renderer.getPixelRatio()
  const burstAt = new THREE.Vector3()
  let nextBurst = -1
  let passVolley = false

  const car = new THREE.Group()
  scene.add(car)
  car.add(carSparkles.points)
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
    forceSinglePass: true,
  })
  const hubGeometry = new THREE.CircleGeometry(0.26, 32)

  const draco = new DRACOLoader().setDecoderPath('/oasis/draco/')
  const loader = new GLTFLoader().setDRACOLoader(draco)
  let loaded = false
  const carReady = loader.loadAsync('/oasis/delorean.glb').then((gltf) => {
    if (disposed) return
    car.add(gltf.scene)
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true
      // One small, frosted strip on the car is transmissive. To refract
      // what's behind it, three draws the whole scene a second time every
      // frame. Plain see-through looks the same at that roughness.
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshPhysicalMaterial && o.material.transmission > 0) {
        o.material.transmission = 0
      }
      // three draws transparent double-sided materials in two passes,
      // flipping the side between them, which marks the material changed
      // and re-checks its shader every frame. One pass looks the same here.
      if (o instanceof THREE.Mesh && o.material.transparent && o.material.side === THREE.DoubleSide) {
        o.material.forceSinglePass = true
      }
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
  })

  // Street life: trees, traffic and people (see street-life.ts). The scene
  // starts without any that fail to load.
  const treeSpots = streetTreeSpots()
  const layout = cityLayout()
  let districtId: string | null = null
  let trees: ReturnType<typeof buildTrees> | null = null
  let traffic: ReturnType<typeof buildTraffic> | null = null
  let walkers: ReturnType<typeof buildPedestrians> | null = null
  const streetReady = Promise.allSettled([
    loader.loadAsync('/oasis/trees.glb').then((gltf) => {
      if (disposed) return
      trees = buildTrees(gltf, treeSpots)
      city.add(trees.group)
    }),
    loader.loadAsync('/oasis/traffic.glb').then((gltf) => {
      if (disposed) return
      traffic = buildTraffic(gltf, layout)
      city.add(traffic.mesh)
    }),
    Promise.all([0, 1, 2, 3, 4].map((i) => loader.loadAsync(`/oasis/person-${i}.glb`))).then((people) => {
      if (disposed) return
      walkers = buildPedestrians(people, layout)
      city.add(walkers.group)
    }),
  ])

  // three compiles a shader the first time something is drawn a new way,
  // and that stalls a frame for up to 100 ms: a tree first falling inside
  // the sun's shadow, say. So before the reader sees anything, draw the
  // whole scene once with nothing culled or hidden and the shadow covering
  // the city, which compiles them all.
  const warmUp = async () => {
    const restore: (() => void)[] = []
    scene.traverse((o) => {
      if (!o.visible) {
        o.visible = true
        restore.push(() => (o.visible = false))
      }
      if (o.frustumCulled) {
        o.frustumCulled = false
        restore.push(() => (o.frustumCulled = true))
      }
      if (o instanceof THREE.BatchedMesh && o.perObjectFrustumCulled) {
        o.perObjectFrustumCulled = false
        restore.push(() => (o.perObjectFrustumCulled = true))
      }
    })
    const shadow = light.sun.shadow.camera
    const frame = [shadow.left, shadow.right, shadow.top, shadow.bottom, shadow.far] as const
    Object.assign(shadow, { left: -4000, right: 4000, top: 4000, bottom: -4000, far: 20000 })
    shadow.updateProjectionMatrix()
    await renderer.compileAsync(scene, camera)
    composer.render()
    ;[shadow.left, shadow.right, shadow.top, shadow.bottom, shadow.far] = frame
    shadow.updateProjectionMatrix()
    for (const undo of restore) undo()
  }

  carReady
    .then(() => streetReady)
    .then(warmUp)
    .then(() => {
      if (disposed) return
      loaded = true
      if (import.meta.env.DEV) {
        Object.assign(window, { __oasis: { camera, controls, car, wheels, city, sound, drive, blimps, lots, THREE, renderer, composer, scene } })
      }
      onReady()
    })
    .catch((err) => {
      if (!disposed) onError(err)
    })

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.1, 0.2, 0.98))
  composer.addPass(new OutputPass())

  // On a machine that can't keep up, drop the resolution a step at a time,
  // judged on the median frame over a couple of seconds so that one-off
  // stalls (a shader compiling, a model loading) don't count.
  const SLOW_FRAME = 1000 / 45
  const frameTimes: number[] = []
  const stepDownResolution = () => {
    const ratio = Math.max(renderer.getPixelRatio() - 0.25, 1)
    renderer.setPixelRatio(ratio)
    composer.setPixelRatio(ratio)
    for (const p of [sparkles, carSparkles, fireworks]) p.material.uniforms.uPixel.value = ratio
  }

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  // Scroll zooms toward whatever is under the cursor (a tower, a blimp, the
  // car), and right-drag pans, so the reader can explore the whole city.
  controls.zoomToCursor = true
  controls.enablePan = true
  controls.screenSpacePanning = true
  controls.minDistance = 1
  controls.maxDistance = 2500
  controls.zoomSpeed = 1.2

  let mode: CameraMode = 'cinematic'
  let blend = 1
  const setMode = (next: CameraMode) => {
    if (mode === next) return
    mode = next
    if (next === 'cinematic') blend = 0
    onModeChange?.(next)
  }
  controls.addEventListener('start', () => {
    focus = null
    setMode('free')
  })

  // F glides the camera to a close view of the car, from whichever side the
  // camera is on. Offsets are kept relative to the car, so the glide tracks
  // it in flight.
  const FOCUS_DISTANCE = 9
  const FOCUS_TIME = 0.7
  const FOCUS_TARGET = new THREE.Vector3(0, 0.5, 0)
  let focus: { t: number; cam: THREE.Vector3; target: THREE.Vector3; endCam: THREE.Vector3 } | null = null
  const startFocus = () => {
    setMode('free')
    // Drop any orbit, pan or zoom still easing out; it would carry the focus
    // back off the car after the glide.
    const inner = controls as unknown as {
      _sphericalDelta: THREE.Spherical
      _panOffset: THREE.Vector3
      _scale: number
      _performCursorZoom: boolean
    }
    inner._sphericalDelta.set(0, 0, 0)
    inner._panOffset.set(0, 0, 0)
    inner._scale = 1
    inner._performCursorZoom = false
    const cam = camera.position.clone().sub(car.position)
    const dir = cam.clone().normalize()
    if (!Number.isFinite(dir.x)) dir.set(0.5, 0.3, -1).normalize()
    // Never end up looking straight down or from under the car.
    dir.y = THREE.MathUtils.clamp(dir.y, 0.1, 0.6)
    dir.normalize()
    focus = {
      t: 0,
      cam,
      target: controls.target.clone().sub(car.position),
      endCam: dir.multiplyScalar(FOCUS_DISTANCE).add(FOCUS_TARGET),
    }
  }

  // OrbitControls only zooms as deep as its focus point, which sits by the
  // car. Before each scroll, push that point out (straight ahead, so the
  // view doesn't jump) to the depth of whatever is under the cursor. Then a
  // scroll over a far tower flies to the tower.
  const ray = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const forward = new THREE.Vector3()
  const zoomTargets = [car, city, ground.mesh]
  const onWheel = (e: WheelEvent) => {
    if (e.target !== canvas) return
    const r = canvas.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(pointer, camera)
    const hit = ray.intersectObjects(zoomTargets, true)[0]
    if (!hit) return
    camera.getWorldDirection(forward)
    const depth = hit.point.clone().sub(camera.position).dot(forward)
    if (depth > controls.minDistance) controls.target.copy(camera.position).addScaledVector(forward, depth)
  }
  window.addEventListener('wheel', onWheel, { capture: true, passive: true })

  const sound = createSound()
  const toggleSound = () => {
    sound.setEnabled(!sound.enabled)
    onSoundChange?.(sound.enabled)
  }

  // The reader's own driving and flying. The car is a hover car: on the
  // road it steers like a car, in the air it turns on the spot and holds
  // its height until told to climb or sink.
  const DRIVE = {
    road: { accel: 12, brake: 30, reverse: 8, coast: 4, drag: 0.006, max: 35, maxReverse: 10 },
    air: { accel: 24, brake: 30, reverse: 10, coast: 6, drag: 0.0032, max: 85, maxReverse: 15 },
    steer: 0.55, // front-wheel lock, radians
    roadTurn: 1.2, // most the car turns on the road, radians a second
    airTurn: 1.0, // radians a second
    climb: 28, // m/s
    ceiling: 420,
    radius: 1.6, // the car, as a circle, for collisions
  }
  const WHEELBASE = 2.4
  const drive = { on: false, v: 0, yaw: 0, steer: 0, y: 0, vy: 0, fold: 0, folded: false, air: false, roll: 0, bump: -1 }
  const KEYS: Record<string, string> = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    KeyE: 'rise',
    KeyQ: 'sink',
  }
  const held = new Set<string>()

  // Hand the car to the reader wherever it is in the flight.
  const takeWheel = () => {
    const s = flightState(elapsed % LOOP)
    Object.assign(drive, {
      on: true,
      v: s.speed,
      yaw: 0,
      steer: 0,
      y: car.position.y,
      vy: 0,
      fold: s.fold,
      folded: s.fold > 0.5,
      air: car.position.y > 0.3,
      roll: s.roll,
    })
    for (const b of blimps) b.side = 0
    focus = null
    setMode('drive')
    onDriveChange?.(true)
  }

  // R: back to the starting line, and the cinematic flight from the top.
  const restart = () => {
    drive.on = false
    held.clear()
    elapsed = 0
    prevT = 0
    nextBurst = -1
    passVolley = false
    ringsPassed = 0
    for (const b of blimps) b.ring.reset()
    onRings?.(0, RINGS)
    focus = null
    if (paused) {
      paused = false
      onPauseChange?.(false)
      sound.setPaused(false)
    }
    mode = 'free'
    setMode('cinematic')
    // Cut straight to the opening shot, rather than gliding there.
    blend = 1
    onDriveChange?.(false)
  }

  let paused = false
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const key = KEYS[e.code]
    if (key) {
      e.preventDefault()
      held.add(key)
      if (!drive.on && loaded && !reducedMotion) takeWheel()
      return
    }
    if (e.repeat) return
    if (e.code === 'Space') {
      e.preventDefault()
      paused = !paused
      onPauseChange?.(paused)
      sound.setPaused(paused)
    } else if (e.key.toLowerCase() === 'c') {
      setMode(drive.on ? 'drive' : 'cinematic')
    } else if (e.key.toLowerCase() === 'r') {
      restart()
    } else if (e.key.toLowerCase() === 'm') {
      toggleSound()
    } else if (e.key.toLowerCase() === 'f') {
      startFocus()
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    const key = KEYS[e.code]
    if (key) held.delete(key)
  }
  // Keys released while the tab is in the background never send keyup.
  const onBlur = () => held.clear()
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
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
  const cityLead = DISTANCE[Math.round(CITY_AT / TABLE_STEP)]
  let elapsed = reducedMotion ? CITY_AT : startAt
  // `elapsed` is the lap clock and stops while the reader drives; `clock`
  // never stops, so fireworks, lights and blimps keep moving.
  let clock = elapsed
  let last = performance.now()
  let prevT = elapsed % LOOP

  const updateWheels = (spin: number, fold: number, steer: number, thrust: number) => {
    for (const w of wheels) {
      w.node.rotation.x += spin
      // Front wheels steer (only while they're down).
      w.node.rotation.y = w.home.z > 0 ? steer * (1 - fold) : 0
      w.node.rotation.z = -w.side * (Math.PI / 2) * fold
      // Folded flat, the wheel tucks in under the sill, hub facing the road.
      w.node.position.set(w.home.x - w.side * WHEEL_TUCK * fold, w.home.y - WHEEL_DROP * fold, w.home.z)
      const underside = w.node.position.y - 0.17
      w.hub.position.set(w.node.position.x, underside - 0.005, w.home.z)
      w.jet.position.set(w.node.position.x, underside, w.home.z)
      w.jet.scale.set(1, 0.3 + 0.7 * thrust, 1)
    }
    thrusterMaterial.uniforms.uPower.value = thrust
    thrusterMaterial.uniforms.uTime.value = clock
    hubMaterial.opacity = Math.min(thrust * 1.2, 0.85)
  }

  // One step of the reader's driving. W/S throttle, brake and reverse; A/D
  // steer; E lifts off and climbs, Q sinks and lands. Buildings, the gate's
  // posts and the edge of the map stop the car; it can land on a roof.
  const ringPoint = new THREE.Vector3()
  const stepDrive = (dt: number, cityZ: number, gateZ: number, lapZ: number) => {
    const input = (k: string) => (held.has(k) ? 1 : 0)
    const throttle = input('up') - input('down')
    const turn = input('left') - input('right')
    const p = drive.air ? DRIVE.air : DRIVE.road
    let v = drive.v
    if (throttle > 0) v += (v < 0 ? p.brake : p.accel) * dt
    else if (throttle < 0) v -= (v > 0 ? p.brake : p.reverse) * dt
    else v -= Math.sign(v) * Math.min(Math.abs(v), p.coast * dt)
    v -= v * Math.abs(v) * p.drag * dt
    v = THREE.MathUtils.clamp(v, -p.maxReverse, p.max)
    if (drive.air) {
      drive.steer += (0 - drive.steer) * Math.min(1, dt * 8)
      drive.yaw += turn * DRIVE.airTurn * dt
    } else {
      // Less lock at speed, so the car stays controllable; it turns about
      // its rear axle like a car.
      const lock = DRIVE.steer / (1 + Math.abs(v) / 18)
      drive.steer += (turn * lock - drive.steer) * Math.min(1, dt * 8)
      const rate = (v / WHEELBASE) * Math.tan(drive.steer)
      drive.yaw += THREE.MathUtils.clamp(rate, -DRIVE.roadTurn, DRIVE.roadTurn) * dt
    }

    // Height: E climbs (and lifts off the road), Q sinks.
    const lift = input('rise') - input('sink')
    if (!drive.air && lift > 0) {
      drive.air = true
      sound.hover(true)
    }
    if (drive.air) drive.vy += (lift * DRIVE.climb - drive.vy) * Math.min(1, dt * 3)
    else drive.vy = 0
    const prevY = drive.y
    let y = Math.min(drive.y + drive.vy * dt, DRIVE.ceiling)

    let x = car.position.x + Math.sin(drive.yaw) * v * dt
    let z = car.position.z + Math.cos(drive.yaw) * v * dt
    let hit = false
    let floor = 0
    const r = DRIVE.radius
    const solid = (x0: number, x1: number, z0: number, z1: number, top: number) => {
      const cx = THREE.MathUtils.clamp(x, x0, x1)
      const cz = THREE.MathUtils.clamp(z, z0, z1)
      const dx = x - cx
      const dz = z - cz
      const d2 = dx * dx + dz * dz
      if (d2 >= r * r) return
      // Coming down from above: it's a roof to stand on.
      if (prevY >= top - 0.3) {
        floor = Math.max(floor, top)
        return
      }
      hit = true
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2)
        x = cx + (dx / d) * r
        z = cz + (dz / d) * r
      } else {
        // Centre inside the box: leave by the nearest side.
        const out = [x - x0, x1 - x, z - z0, z1 - z]
        const k = out.indexOf(Math.min(...out))
        if (k === 0) x = x0 - r
        else if (k === 1) x = x1 + r
        else if (k === 2) z = z0 - r
        else z = z1 + r
      }
    }
    for (const l of lots) solid(l.x0, l.x1, l.z0 + cityZ, l.z1 + cityZ, l.h)
    // Traffic blocks the car on the ground; it can land on a roof.
    if (y < 3) traffic?.near(x, z - cityZ, r, (x0, x1, z0, z1) => solid(x0, x1, z0 + cityZ, z1 + cityZ, 2.2))
    // Tree trunks block the car on the ground; it flies over the crowns.
    if (y < 6) {
      for (let i = 0; i < treeSpots.length; i += 3) {
        const tx = treeSpots[i]
        const tz = treeSpots[i + 1] + cityZ
        if (Math.abs(tx - x) < 3 && Math.abs(tz - z) < 3) solid(tx - 0.4, tx + 0.4, tz - 0.4, tz + 0.4, 1e9)
      }
    }
    for (const side of [-1, 1]) solid(side * 11 - 0.9, side * 11 + 0.9, gateZ - 0.9, gateZ + 0.9, 11.5)
    // The edge of the map: the city's width, from just behind the start
    // line to just past the far end of the city.
    const zMin = lapZ - 30
    const zMax = cityZ + CITY_HALF_LENGTH + 60
    if (Math.abs(x) > CITY_EXTENT_X - r) {
      x = Math.sign(x) * (CITY_EXTENT_X - r)
      hit = true
    }
    if (z < zMin || z > zMax) {
      z = THREE.MathUtils.clamp(z, zMin, zMax)
      hit = true
    }
    if (hit) {
      if (Math.abs(v) > 4 && clock - drive.bump > 0.35) {
        sound.touchdown()
        drive.bump = clock
      }
      v = -v * 0.2
    }
    drive.v = v

    // Settle on the road or a roof. Sinking onto it lands the car; driving
    // off a roof's edge leaves it hovering.
    if (y <= floor) {
      y = floor
      if (drive.air && drive.vy <= 0 && lift < 0) {
        drive.air = false
        sound.touchdown()
      }
      drive.vy = Math.max(drive.vy, 0)
    } else if (!drive.air) {
      drive.air = true
    }
    drive.y = y

    // The wheels fold flat as the car climbs away from whatever is under
    // it, and swing back down as it comes within a few metres.
    const foldTo = drive.air ? smooth(0.5, 5, y - floor) : 0
    drive.fold += (foldTo - drive.fold) * Math.min(1, dt * 2.5)
    if (foldTo > 0.5 !== drive.folded) {
      drive.folded = foldTo > 0.5
      sound.wheelsFold(drive.folded, 1.2)
    }

    const bank = drive.air ? -turn * 0.35 * Math.min(Math.abs(v) / 20, 1) : 0
    drive.roll += (bank - drive.roll) * Math.min(1, dt * 4)
    const pitch = drive.air ? Math.atan2(drive.vy, Math.max(Math.abs(v), 12)) * 0.8 : 0
    const bob = drive.air ? Math.sin(clock * 9) * 0.012 * drive.fold : 0
    car.position.set(x, y + bob, z)
    car.rotation.set(-pitch, drive.yaw, drive.roll, 'YXZ')
    const thrust = drive.air ? 0.3 + 0.7 * drive.fold * Math.min(0.55 + Math.abs(drive.vy) / DRIVE.climb + Math.abs(v) / p.max, 1) : 0
    updateWheels(drive.air ? 0 : (v * dt) / WHEEL_RADIUS, drive.fold, drive.steer, thrust)
    sound.update({
      speed: Math.abs(v),
      hover: drive.air ? 1 : 0,
      fold: drive.fold,
      lift: Math.min(y / CRUISE_ALTITUDE, 1),
      thrust,
    })

    // Rings: the car passes one when it crosses the ring's plane inside it.
    for (const b of blimps) {
      if (b.ring.done) continue
      b.ring.ring.updateWorldMatrix(true, false)
      const local = b.ring.ring.worldToLocal(ringPoint.copy(car.position).setY(car.position.y + 0.6))
      const side = Math.sign(local.z)
      const inside = Math.hypot(local.x, local.y) < RING_RADIUS - 0.4 && Math.abs(local.z) < 8
      if (b.side !== 0 && side !== 0 && side !== b.side && inside) {
        b.ring.pass()
        ringsPassed++
        onRings?.(ringsPassed, RINGS)
        sound.sparkle()
        b.ring.ring.getWorldPosition(burstAt)
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2
          const at = k === 0 ? burstAt : ringPoint.set(Math.cos(a) * RING_RADIUS, Math.sin(a) * RING_RADIUS, 0)
          if (k > 0) b.ring.ring.localToWorld(at)
          sparkles.launch(at, clock)
        }
        for (let k = 0; k < 3; k++) carSparkles.launch(carSparkleAt, clock + k * 0.25)
        if (ringsPassed === RINGS) {
          sound.complete()
          for (let k = 0; k < 5; k++) {
            burstAt.set(car.position.x + (k - 2) * 25, car.position.y + 30 + (k % 2) * 15, car.position.z + 60)
            fireworks.launch(burstAt, clock)
          }
        }
      }
      b.side = side || b.side
    }
  }

  renderer.setAnimationLoop(() => {
    const now = performance.now()
    const frameDt = Math.min((now - last) / 1000, 0.05)
    if (loaded && renderer.getPixelRatio() > 1) {
      frameTimes.push(now - last)
      if (frameTimes.length === 120) {
        frameTimes.sort((a, b) => a - b)
        if (frameTimes[60] > SLOW_FRAME) stepDownResolution()
        frameTimes.length = 0
      }
    }
    last = now
    const liveDt = reducedMotion || paused || !loaded ? 0 : frameDt
    const dt = drive.on ? 0 : liveDt
    clock += liveDt
    elapsed += dt
    const t = elapsed % LOOP
    const lapZ = Math.floor(elapsed / LOOP) * LOOP_DISTANCE
    const cityZ = lapZ + cityLead
    const gateZ = lapZ + GATE_AT
    previous.copy(car.position)

    if (drive.on) {
      stepDrive(liveDt, cityZ, gateZ, lapZ)
    } else {
      const s = flightState(t)
      const carZ = distanceAt(elapsed)
      // One sound for each moment of the flight, fired as the lap clock
      // passes it.
      if (dt > 0 && t > prevT) {
        const at = (x: number) => prevT < x && t >= x
        if (at(5)) sound.hover(true)
        if (at(6)) sound.wheelsFold(true, 1.5)
        if (at(7.5)) sound.boost()
        if (at(late(26))) sound.descend()
        if (at(late(34.5))) sound.wheelsFold(false, 1.5)
        if (at(late(36.5))) sound.hover(false)
        if (at(late(37.4))) sound.touchdown()
      }
      prevT = t
      sound.update(s)

      car.position.set(s.x, s.y + Math.sin(elapsed * 9) * 0.012 * s.fold, carZ)
      // Pitch follows the flight path: nose up on the climb, down on descent.
      const ahead = flightState(Math.min(t + 0.05, LOOP))
      const climb = Math.atan2(ahead.y - s.y, Math.max(distanceAt(elapsed + 0.05) - carZ, 1e-3))
      car.rotation.set(-climb * 0.8, 0, s.roll, 'YXZ')
      updateWheels((s.speed * dt * (1 - s.hover)) / WHEEL_RADIUS, s.fold, 0, s.thrust)
    }

    // This loop's city sits under the middle of the cruise.
    city.position.set(0, 0, cityZ)
    for (const b of blimps) {
      const drift = Math.sin(clock * 0.05 + b.phase) * BLIMP_DRIFT
      b.mesh.position.set(
        b.at.x + Math.sin(b.heading) * drift,
        b.at.y + Math.sin(clock * 0.3 + b.phase) * 2,
        b.at.z + Math.cos(b.heading) * drift,
      )
      b.ring.update(clock, liveDt)
    }
    sparkles.material.uniforms.uTime.value = clock
    const camX = camera.position.x
    const camZ = camera.position.z - cityZ
    trees?.update(camX, camZ)
    playerAt.set(car.position.x, 0, car.position.z - cityZ)
    traffic?.update(liveDt, clock, camX, camZ, drive.on && car.position.y < 2 ? playerAt : null)
    walkers?.update(liveDt, camX, camZ, camera.position.y < 160)
    carSparkles.material.uniforms.uTime.value = clock

    scoreboard.position.set(0, 330, (drive.on ? cityZ : car.position.z + 950))
    scoreboard.rotation.y = Math.PI + Math.sin(clock * 0.15) * 0.25
    ;(scoreboard.material as THREE.ShaderMaterial).uniforms.uTime.value = clock

    // The gate stands GATE_AT metres down the road from where each lap
    // starts; a volley of shells bursts over it for the first seconds.
    const lapStart = elapsed - t
    startGate.gate.position.set(0, 0, gateZ)
    exitPad.pad.position.set(EXIT_X, 0, lapZ + EXIT_AT)
    exitPad.update(clock, camera)
    const here = districtAt(car.position.x, car.position.z - cityZ, layout.halfWidth, layout.halfLength)
    if ((here?.id ?? null) !== districtId) {
      districtId = here?.id ?? null
      onDistrict?.(here)
    }
    if (
      drive.on &&
      !exited &&
      car.position.y < 3 &&
      Math.hypot(car.position.x - EXIT_X, car.position.z - (lapZ + EXIT_AT)) < EXIT_RADIUS
    ) {
      exited = true
      drive.v = 0
      sound.gate()
      onExit?.()
    }
    startGate.update(clock, t, GATE_TIME)
    // Fireworks: an opening volley the moment the lap starts, a second as
    // the car passes under the gate, and quick single shells between.
    const volley = (k0: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const k = k0 + i
        const side = k % 2 === 0 ? -1 : 1
        burstAt.set(side * (8 + ((k * 37) % 30)), 26 + ((k * 53) % 30), gateZ + 10 + ((k * 71) % 45))
        fireworks.launch(burstAt, clock)
        sound.firework(camera.position.distanceTo(burstAt))
      }
    }
    if (!drive.on) {
      if (t < 4 && elapsed >= nextBurst) {
        if (nextBurst < lapStart) {
          nextBurst = lapStart
          volley(0, 4)
          passVolley = false
        } else volley(Math.round((nextBurst - lapStart) / 0.22) + 4, 1)
        nextBurst += 0.22
      } else if (t >= 4) nextBurst = lapStart + LOOP
      if (!passVolley && t >= GATE_TIME) {
        volley(40, 4)
        sound.gate()
        passVolley = true
      }
    }
    fireworks.material.uniforms.uTime.value = clock
    ground.cityZ.set(cityZ - CITY_HALF_LENGTH, cityZ + CITY_HALF_LENGTH, 1e9, 1e9)

    if (mode === 'drive') {
      // A chase camera behind the car. It rides along with the car, then
      // eases round behind it, pulling back with speed and height.
      const back = 7 + Math.abs(drive.v) * 0.06 + drive.fold * 3
      camera.position.add(lookAt.subVectors(car.position, previous))
      desired.set(
        car.position.x - Math.sin(drive.yaw) * back,
        car.position.y + 1.6 + back * 0.18,
        car.position.z - Math.cos(drive.yaw) * back,
      )
      camera.position.lerp(desired, 1 - Math.exp(-frameDt * 4))
      if (camera.position.y < 0.3) camera.position.y = 0.3
      lookAt.set(
        car.position.x + Math.sin(drive.yaw) * 4,
        car.position.y + 1,
        car.position.z + Math.cos(drive.yaw) * 4,
      )
      camera.lookAt(lookAt)
      controls.target.copy(lookAt)
    } else if (mode === 'cinematic') {
      const carZ = car.position.z
      const shot = shotAt(t)
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
      lookAt.set(car.position.x + shot.lookX, car.position.y + shot.lookY, carZ + shot.lookZ)
      camera.lookAt(lookAt)
      controls.target.copy(lookAt)
    } else {
      // Ride along with the car, keeping whatever angle the reader chose.
      camera.position.add(desired.subVectors(car.position, previous))
      // The focus point rides along too, rather than snapping back to the
      // car, so zooming and panning keep wherever the reader took them.
      controls.target.add(desired)
      if (focus) {
        focus.t = Math.min(focus.t + frameDt / FOCUS_TIME, 1)
        const k = focus.t * focus.t * (3 - 2 * focus.t)
        camera.position.copy(car.position).add(desired.lerpVectors(focus.cam, focus.endCam, k))
        controls.target.copy(car.position).add(desired.lerpVectors(focus.target, FOCUS_TARGET, k))
        if (focus.t === 1) focus = null
      }
      controls.update()
      if (camera.position.y < 0.15) camera.position.y = 0.15
    }

    // Keep the ground and sky centred on the car; the ground's pattern is
    // drawn in world space, so it doesn't slide.
    ground.mesh.position.set(0, 0, Math.round(car.position.z / 100) * 100)
    atmosphere.sky.position.copy(camera.position)
    aimSunLight(light.sun, car.position)

    composer.render()
  })

  const stop = () => {
    disposed = true
    sound.dispose()
    renderer.setAnimationLoop(null)
    window.removeEventListener('resize', resize)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('wheel', onWheel, { capture: true })
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
    atmosphere.env.dispose()
    draco.dispose()
    composer.dispose()
    renderer.dispose()
  }
  // For the map: the city's plan, which never changes, and where things
  // are now. Everything is in the city's coordinates, in metres.
  const mapPlan = {
    blocks: layout.blocks,
    halfWidth: layout.halfWidth,
    halfLength: layout.halfLength,
    avenueHalf: layout.avenueHalf,
    // The road from the start line, measured back from the city's centre.
    roadStart: -cityLead - 30,
  }
  const mapState = () => {
    const lapZ = Math.floor(elapsed / LOOP) * LOOP_DISTANCE
    const cityZ = lapZ + cityLead
    return {
      car: { x: car.position.x, z: car.position.z - cityZ, y: car.position.y, yaw: drive.on ? drive.yaw : 0 },
      gate: { x: 0, z: lapZ + GATE_AT - cityZ },
      exit: { x: EXIT_X, z: lapZ + EXIT_AT - cityZ },
      rings: blimps.map((b) => ({ x: b.mesh.position.x, z: b.mesh.position.z, done: b.ring.done })),
    }
  }
  return Object.assign(stop, { toggleSound, mapPlan, mapState })
}
