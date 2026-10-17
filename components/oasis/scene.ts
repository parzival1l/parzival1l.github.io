import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import {
  CITY_HALF_LENGTH,
  aimSunLight,
  buildAtmosphere,
  buildGround,
  buildCity,
  buildSunLight,
} from './world'
import { buildBlimp, buildFireworks, buildScoreboard, buildStartGate } from './sky-props'

export type CameraMode = 'cinematic' | 'free'

type Options = {
  onReady: () => void
  onError: (err: unknown) => void
  onModeChange?: (mode: CameraMode) => void
  onPauseChange?: (paused: boolean) => void
  // Seconds into the loop to start at; handy for checking one phase.
  startAt?: number
}

// One loop of the flight, in seconds. The car drives toward Times Square,
// hovers, folds its wheels, climbs over the rooftops, flies the length of
// Broadway, comes down on the far side and lands, wheels first.
const LOOP = 40
const WHEEL_RADIUS = 0.334
const GROUND_SPEED = 28
const AIR_SPEED = 70
// Clear of the tallest towers (about 190 m).
const CRUISE_ALTITUDE = 240
const HOVER_HEIGHT = 0.55
const WHEEL_TUCK = 0.14
const WHEEL_DROP = 0.06
// The city sits under the middle of the cruise.
const CITY_AT = 21
// The starting gate, in metres down the road from where each lap starts.
// The car passes under it about three seconds in.
const GATE_AT = 85

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1)
  return x * x * (3 - 2 * x)
}

function flightState(t: number) {
  const hover = smooth(5, 6, t) - smooth(36.5, 37.5, t)
  const fold = smooth(6, 7.5, t) - smooth(34.5, 36, t)
  const lift = smooth(7.5, 16, t) - smooth(26, 34.5, t)
  const cruise = smooth(16, 17.5, t) - smooth(24.5, 26, t)
  const phase = (t - 16) * 0.55
  // A small dip as the tyres take the weight.
  const touchdown = Math.sin(Math.PI * smooth(37.3, 38.1, t)) * -0.04
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
type ShotKey = { t: number; az: number; h: number; d: number; look: [number, number] }
const PI = Math.PI
const SHOTS: ShotKey[] = [
  { t: 0, az: PI, h: 2.6, d: 10, look: [4, 45] }, // behind, the starting gate ahead
  { t: 2.2, az: PI + 0.12, h: 1.3, d: 6, look: [2.5, 22] }, // under the gate
  { t: 3.4, az: PI + 0.25, h: 0.1, d: 2.6, look: [0.7, -1.8] }, // the PARZIVAL plate
  { t: 4.6, az: PI + 0.5, h: 1.0, d: 5.5, look: [0.6, 0] }, // a turn around the car
  { t: 6.5, az: 2 * PI + 0.5, h: 0.5, d: 5.2, look: [0.5, 0] }, // side-on as the wheels fold
  { t: 9, az: 3 * PI + 0.5, h: 0.2, d: 6, look: [0.5, 0] },
  { t: 11.5, az: 3 * PI + 0.9, h: -3, d: 9, look: [0.4, 1] }, // from below as it climbs
  { t: 15, az: 3 * PI - 0.35, h: 6, d: 14, look: [-6, 30] }, // behind it, the city ahead
  { t: 19, az: 3 * PI - 0.4, h: 18, d: 40, look: [-20, 60] }, // over the rooftops
  { t: 23, az: 3 * PI - 1.4, h: 6, d: 22, look: [-10, 0] }, // alongside, towers below
  { t: 27, az: 2 * PI + 0.4, h: 3, d: 14, look: [0, 0] }, // ahead, coming down
  { t: 31, az: 2 * PI + 1.2, h: 1.5, d: 10, look: [0.4, 0] },
  { t: 35, az: 2 * PI + 2.0, h: 0.6, d: 6, look: [0.4, 0] }, // side-on as the wheels unfold
  { t: 37.5, az: 2 * PI + 2.9, h: 0.6, d: 4.5, look: [0.6, -0.8] },
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

export function startOasis(
  canvas: HTMLCanvasElement,
  { onReady, onError, onModeChange, onPauseChange, startAt = 0 }: Options,
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
  city.add(buildCity())
  scene.add(city)

  // Blimps ride with the city, drifting slowly across it.
  const blimps = [
    { at: new THREE.Vector3(-260, 170, -120), heading: 0.5 },
    { at: new THREE.Vector3(320, 230, 260), heading: -2.4 },
    { at: new THREE.Vector3(-120, 300, 520), heading: 2.0 },
  ].map(({ at, heading }) => {
    const mesh = buildBlimp()
    mesh.position.copy(at)
    mesh.rotation.y = heading
    city.add(mesh)
    return { mesh, at, heading }
  })

  // Halliday's high-score board hangs in the sky ahead of the car.
  const scoreboard = buildScoreboard()
  scene.add(scoreboard)

  // Each lap starts under a gate, with fireworks going off over it.
  const startGate = buildStartGate()
  scene.add(startGate.gate)
  const fireworks = buildFireworks()
  scene.add(fireworks.points)
  fireworks.material.uniforms.uPixel.value = renderer.getPixelRatio()
  const burstAt = new THREE.Vector3()
  let nextBurst = 0

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
        if (o instanceof THREE.Mesh) o.castShadow = true
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
        Object.assign(window, { __oasis: { camera, controls, car, wheels, city, THREE } })
      }
      onReady()
    },
    undefined,
    (err) => {
      if (!disposed) onError(err)
    },
  )

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.1, 0.2, 0.98))
  composer.addPass(new OutputPass())

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

  let paused = false
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.code === 'Space') {
      e.preventDefault()
      paused = !paused
      onPauseChange?.(paused)
    } else if (e.key.toLowerCase() === 'c') {
      setMode('cinematic')
    } else if (e.key.toLowerCase() === 'f') {
      startFocus()
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
  const cityLead = DISTANCE[Math.round(CITY_AT / TABLE_STEP)]
  let elapsed = reducedMotion ? 21 : startAt
  let last = performance.now()

  renderer.setAnimationLoop(() => {
    const now = performance.now()
    const frameDt = Math.min((now - last) / 1000, 0.05)
    last = now
    const dt = reducedMotion || paused || !loaded ? 0 : frameDt
    elapsed += dt
    const t = elapsed % LOOP
    const s = flightState(t)
    const carZ = distanceAt(elapsed)

    previous.copy(car.position)
    car.position.set(s.x, s.y + Math.sin(elapsed * 9) * 0.012 * s.fold, carZ)
    // Pitch follows the flight path: nose up on the climb, down on descent.
    const ahead = flightState(Math.min(t + 0.05, LOOP))
    const climb = Math.atan2(ahead.y - s.y, Math.max(distanceAt(elapsed + 0.05) - carZ, 1e-3))
    car.rotation.set(-climb * 0.8, 0, s.roll, 'YXZ')

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

    // This loop's city sits under the middle of the cruise.
    const cityZ = Math.floor(elapsed / LOOP) * LOOP_DISTANCE + cityLead
    city.position.set(0, 0, cityZ)
    for (const b of blimps) {
      const drift = elapsed * 2.2
      b.mesh.position.set(
        b.at.x + Math.sin(b.heading) * drift,
        b.at.y + Math.sin(elapsed * 0.3 + b.at.x) * 2,
        b.at.z + Math.cos(b.heading) * drift,
      )
    }

    scoreboard.position.set(0, 330, carZ + 950)
    scoreboard.rotation.y = Math.PI + Math.sin(elapsed * 0.15) * 0.25
    ;(scoreboard.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed

    // The gate stands GATE_AT metres down the road from where each lap
    // starts; a volley of shells bursts over it for the first seconds.
    const lapStart = elapsed - t
    const gateZ = Math.floor(elapsed / LOOP) * LOOP_DISTANCE + GATE_AT
    startGate.gate.position.set(0, 0, gateZ)
    startGate.update(elapsed)
    if (t < 6 && elapsed >= nextBurst) {
      if (nextBurst < lapStart) nextBurst = lapStart
      const k = Math.round((nextBurst - lapStart) / 0.32)
      const side = k % 2 === 0 ? -1 : 1
      burstAt.set(side * (10 + ((k * 37) % 40)), 32 + ((k * 53) % 40), gateZ + 15 + ((k * 71) % 60))
      fireworks.launch(burstAt, elapsed)
      nextBurst += 0.32
    } else if (t >= 6) nextBurst = lapStart + LOOP
    fireworks.material.uniforms.uTime.value = elapsed
    ground.cityZ.set(cityZ - CITY_HALF_LENGTH, cityZ + CITY_HALF_LENGTH, 1e9, 1e9)

    if (mode === 'cinematic') {
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
      lookAt.set(car.position.x, car.position.y + shot.lookY, carZ + shot.lookZ)
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
    ground.mesh.position.set(0, 0, Math.round(carZ / 100) * 100)
    atmosphere.sky.position.copy(camera.position)
    aimSunLight(light.sun, car.position)

    composer.render()
  })

  return () => {
    disposed = true
    renderer.setAnimationLoop(null)
    window.removeEventListener('resize', resize)
    window.removeEventListener('keydown', onKeyDown)
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
}
