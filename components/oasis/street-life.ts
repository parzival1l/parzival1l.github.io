// Street life for the OASIS city: trees of several kinds, traffic that
// stops at lights, and people walking the sidewalks. Everything here lives
// in the city's own coordinates, so it rides along with the city.
//
// Models, all CC0:
// - trees.glb: "Tree", "Trees", "Birch Trees" and "Maple Trees" by Quaternius
// - traffic.glb: Kenney's Car Kit
// - person-*.glb: animated characters by Quaternius

import * as THREE from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import type { CityLayout } from './world'

const hash = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

// --- Trees -----------------------------------------------------------------

const TREE_RANGE = 900

// Rows are one species, mostly green, some birch and some red maple; each
// tree in a row is a random variant of it, sized and turned at random.
export function buildTrees(gltf: GLTF, spots: number[]) {
  const species: Record<string, { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] }[]> = {}
  gltf.scene.traverse((o) => {
    const m = /^(common|green|birch|maple)-\d+$/.exec(o.name)
    if (!m) return
    const parts: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] } = { geometries: [], materials: [] }
    o.traverse((c) => {
      if (!(c instanceof THREE.Mesh)) return
      parts.geometries.push(c.geometry)
      parts.materials.push(c.material as THREE.Material)
    })
    ;(species[m[1]] ??= []).push(parts)
  })
  const green = [...(species.common ?? []), ...(species.green ?? [])]
  const pick = (row: number) => {
    const r = hash(row)
    return r < 0.6 ? green : r < 0.8 ? species.birch : species.maple
  }

  // One BatchedMesh per material: a single draw call each, with every tree
  // culled on its own.
  type Batch = { mesh: THREE.BatchedMesh; ids: Map<THREE.BufferGeometry, number>; instances: number[] }
  const batches = new Map<THREE.Material, Batch>()
  const plan: { variant: (typeof green)[number]; matrix: THREE.Matrix4 }[] = []
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < spots.length; i += 3) {
    const kind = pick(spots[i + 2])
    const variant = kind[Math.floor(hash(i + 0.5) * kind.length)]
    const scale = 0.85 + hash(i + 1.5) * 0.35
    q.setFromAxisAngle(up, hash(i + 2.5) * Math.PI * 2)
    plan.push({
      variant,
      matrix: new THREE.Matrix4().compose(new THREE.Vector3(spots[i], 0, spots[i + 1]), q, new THREE.Vector3(scale, scale, scale)),
    })
  }
  const group = new THREE.Group()
  const counts = new Map<THREE.Material, { instances: number; geometries: Set<THREE.BufferGeometry> }>()
  for (const { variant } of plan) {
    variant.materials.forEach((m, k) => {
      const c = counts.get(m) ?? { instances: 0, geometries: new Set() }
      c.instances++
      c.geometries.add(variant.geometries[k])
      counts.set(m, c)
    })
  }
  for (const [material, c] of counts) {
    let vertices = 0
    let indices = 0
    for (const g of c.geometries) {
      vertices += g.attributes.position.count
      indices += g.index!.count
    }
    const mat = material as THREE.MeshStandardMaterial
    mat.metalness = 0
    mat.roughness = 0.9
    // Cut-out leaves rather than blended ones: they sort and shadow cleanly.
    if (mat.transparent) {
      mat.transparent = false
      mat.alphaTest = 0.5
      mat.side = THREE.DoubleSide
    }
    const mesh = new THREE.BatchedMesh(c.instances, vertices, indices, mat)
    mesh.castShadow = true
    const ids = new Map<THREE.BufferGeometry, number>()
    for (const g of c.geometries) ids.set(g, mesh.addGeometry(g))
    batches.set(material, { mesh, ids, instances: [] })
    group.add(mesh)
  }
  const placed: { batch: Batch; id: number; x: number; z: number }[] = []
  for (const { variant, matrix } of plan) {
    variant.materials.forEach((m, k) => {
      const batch = batches.get(m)!
      const id = batch.mesh.addInstance(batch.ids.get(variant.geometries[k])!)
      batch.mesh.setMatrixAt(id, matrix)
      placed.push({ batch, id, x: matrix.elements[12], z: matrix.elements[14] })
    })
  }

  let frame = 0
  return {
    group,
    // Hide trees far from the camera (`camX`, `camZ` in city coordinates).
    // Every few frames is plenty.
    update(camX: number, camZ: number) {
      if (frame++ % 10 !== 0) return
      for (const p of placed) {
        const dx = p.x - camX
        const dz = p.z - camZ
        p.batch.mesh.setVisibleAt(p.id, dx * dx + dz * dz < TREE_RANGE * TREE_RANGE)
      }
    },
  }
}

// --- Traffic ---------------------------------------------------------------

// Mostly cars and taxis; vans, trucks and the odd police car or ambulance.
const FLEET: [string, number][] = [
  ['taxi', 5],
  ['sedan', 4],
  ['suv', 3],
  ['hatchback-sports', 2],
  ['sedan-sports', 2],
  ['suv-luxury', 2],
  ['van', 2],
  ['delivery', 1.5],
  ['police', 1],
  ['truck', 1],
  ['ambulance', 0.5],
  ['garbage-truck', 0.5],
]
const LANE_OFFSET = 3.3
const CAR_SPACING = 70 // metres of lane per car, on average
const TRAFFIC_RANGE = 700
const LIGHT_CYCLE = 24 // seconds: along-avenue green, then cross green
const ALL_RED = 2.5
const BRAKE = 6 // m/s²
const ACCEL = 3 // m/s²
const MIN_GAP = 3.5 // metres, bumper to bumper

type Lane = {
  axis: 'z' | 'x' // the axis the lane runs along
  dir: 1 | -1
  across: number // the other coordinate of the lane's centre
  from: number
  to: number
  stops: number[] // stop lines, in travel order along the lane
  cars: Car[]
}
type Car = { s: number; v: number; vmax: number; length: number; id: number; geometry: number }

export function buildTraffic(gltf: GLTF, layout: CityLayout) {
  const models: { name: string; geometry: THREE.BufferGeometry; length: number }[] = []
  let material: THREE.Material | null = null
  gltf.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    o.geometry.computeBoundingBox()
    const b = o.geometry.boundingBox!
    models.push({ name: o.name, geometry: o.geometry, length: b.max.z - b.min.z })
    material ??= o.material as THREE.Material
  })
  const weighted = FLEET.flatMap(([name, w]) => {
    const m = models.find((x) => x.name === name)
    return m ? [{ m, w }] : []
  })
  const total = weighted.reduce((s, x) => s + x.w, 0)
  const choose = (r: number) => {
    let acc = 0
    for (const x of weighted) {
      acc += x.w / total
      if (r <= acc) return x.m
    }
    return weighted[weighted.length - 1].m
  }

  // Lanes: right-hand traffic, two lanes per street.
  const { alongX, crossZ, halfWidth, halfLength, streetHalf, avenueHalf } = layout
  const xs = [0, ...alongX, ...alongX.map((x) => -x)]
  const lanes: Lane[] = []
  // Where a street running along x crosses each along-z street, and back.
  const crossingsX = [...alongX, ...alongX.map((x) => -x)].map((x) => [x - streetHalf, x + streetHalf])
  crossingsX.push([-avenueHalf, avenueHalf])
  const crossingsZ = crossZ.map((z) => [z - streetHalf, z + streetHalf])
  const stopsFor = (spans: number[][], dir: number) =>
    spans.map(([a, b]) => (dir > 0 ? a - 1 : -(b + 1))).sort((p, q) => p - q)
  for (const x of xs) {
    if (Math.abs(x) + streetHalf > halfWidth + 0.5) continue
    for (const dir of [1, -1] as const) {
      // Facing +z, the right-hand side is -x.
      const offset = x === 0 ? 3.6 : LANE_OFFSET
      lanes.push({
        axis: 'z',
        dir,
        across: x - dir * offset,
        from: -halfLength,
        to: halfLength,
        stops: stopsFor(crossingsZ, dir),
        cars: [],
      })
    }
  }
  for (const z of crossZ) {
    for (const dir of [1, -1] as const) {
      // Facing +x, the right-hand side is +z.
      lanes.push({
        axis: 'x',
        dir,
        across: z + dir * LANE_OFFSET,
        from: -halfWidth,
        to: halfWidth,
        stops: stopsFor(crossingsX, dir),
        cars: [],
      })
    }
  }

  // Fill the lanes. `s` is the distance travelled along the lane, measured
  // in the direction of travel from its start.
  let capacity = 0
  let seed = 1
  for (const lane of lanes) {
    const length = lane.to - lane.from
    const n = Math.floor(length / CAR_SPACING)
    for (let k = 0; k < n; k++) {
      const m = choose(hash(seed++))
      lane.cars.push({
        s: (k + hash(seed++) * 0.5) * (length / n),
        v: 0,
        vmax: 10 + hash(seed++) * 4,
        length: m.length,
        id: -1,
        geometry: models.indexOf(m),
      })
    }
    capacity += n
  }
  let vertices = 0
  let indices = 0
  for (const m of models) {
    vertices += m.geometry.attributes.position.count
    indices += m.geometry.index!.count
  }
  const mesh = new THREE.BatchedMesh(capacity, vertices, indices, material!)
  mesh.castShadow = true
  const geometryIds = models.map((m) => mesh.addGeometry(m.geometry))
  for (const lane of lanes) for (const car of lane.cars) car.id = mesh.addInstance(geometryIds[car.geometry])

  const matrix = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const pos = new THREE.Vector3()
  const one = new THREE.Vector3(1, 1, 1)
  const up = new THREE.Vector3(0, 1, 0)
  const world = (lane: Lane, s: number) => {
    const along = lane.dir > 0 ? lane.from + s : lane.to - s
    return lane.axis === 'z' ? [lane.across, along] : [along, lane.across]
  }
  // Stop lines in lane distance.
  const stopS = (lane: Lane, stop: number) => (lane.dir > 0 ? stop - lane.from : lane.to + stop)

  return {
    mesh,
    // `time` drives the lights. `player` is the reader's car, in city
    // coordinates, or null; traffic queues behind it like any other car.
    update(dt: number, time: number, camX: number, camZ: number, player: THREE.Vector3 | null) {
      const phase = time % LIGHT_CYCLE
      const half = LIGHT_CYCLE / 2
      const greenZ = phase < half - ALL_RED
      const greenX = phase >= half && phase < LIGHT_CYCLE - ALL_RED
      for (const lane of lanes) {
        const length = lane.to - lane.from
        const green = lane.axis === 'z' ? greenZ : greenX
        const cars = lane.cars
        // Cars stay in order along the lane; each follows the one ahead,
        // the last following the first around the loop.
        for (let k = 0; k < cars.length; k++) {
          const car = cars[k]
          const ahead = cars[(k + 1) % cars.length]
          let gap = ahead.s - car.s
          if (gap <= 0) gap += length
          gap -= (car.length + ahead.length) / 2 + MIN_GAP
          let room = gap
          if (!green) {
            for (const stop of lane.stops) {
              const d = stopS(lane, stop) - (car.s + car.length / 2)
              if (d > -0.5) {
                room = Math.min(room, d)
                break
              }
            }
          }
          if (player) {
            const [px, pz] = lane.axis === 'z' ? [player.x, player.z] : [player.z, player.x]
            if (Math.abs(px - lane.across) < 1.8) {
              const ps = lane.dir > 0 ? pz - lane.from : lane.to - pz
              const d = ps - car.s - car.length / 2 - 2.5 - MIN_GAP
              if (d > -2 && d < room) room = d
            }
          }
          // Brake to stop within the room left; otherwise speed up.
          const safe = Math.sqrt(2 * BRAKE * Math.max(room, 0))
          const target = Math.min(car.vmax, safe)
          car.v = target < car.v ? target : Math.min(target, car.v + ACCEL * dt)
        }
        for (const car of cars) {
          car.s += car.v * dt
          if (car.s >= length) car.s -= length
        }
        // Keep the list in order after wrapping.
        if (cars.length > 1 && cars[cars.length - 1].s < cars[0].s) cars.unshift(cars.pop()!)
        const heading = lane.axis === 'z' ? (lane.dir > 0 ? 0 : Math.PI) : lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2
        q.setFromAxisAngle(up, heading)
        for (const car of cars) {
          const [x, z] = world(lane, car.s)
          const dx = x - camX
          const dz = z - camZ
          const near = dx * dx + dz * dz < TRAFFIC_RANGE * TRAFFIC_RANGE
          mesh.setVisibleAt(car.id, near)
          if (!near) continue
          mesh.setMatrixAt(car.id, matrix.compose(pos.set(x, 0, z), q, one))
        }
      }
    },
    // Traffic cars within `r` of (x, z), as boxes, for the reader's car to
    // bump into.
    near(x: number, z: number, r: number, hit: (x0: number, x1: number, z0: number, z1: number) => void) {
      for (const lane of lanes) {
        const across = lane.axis === 'z' ? x : z
        if (Math.abs(across - lane.across) > r + 2) continue
        for (const car of lane.cars) {
          const [cx, cz] = world(lane, car.s)
          if (Math.abs(cx - x) > r + car.length || Math.abs(cz - z) > r + car.length) continue
          const hl = car.length / 2
          const hw = 1.0
          if (lane.axis === 'z') hit(cx - hw, cx + hw, cz - hl, cz + hl)
          else hit(cx - hl, cx + hl, cz - hw, cz + hw)
        }
      }
    },
  }
}

// --- People ----------------------------------------------------------------

const WALKERS = 70
const WALK_RANGE = 260
const WALK_SPEED = 1.35 // m/s

// People walk loops around the blocks near the camera, some clockwise by
// the buildings, some the other way near the curb. When one falls far
// behind the camera, it reappears around a block near it.
export function buildPedestrians(people: GLTF[], layout: CityLayout) {
  const group = new THREE.Group()
  const { blocks, streetHalf, roadwayHalf } = layout
  type Walker = {
    root: THREE.Object3D
    mixer: THREE.AnimationMixer
    block: number
    offset: number
    s: number
    dir: 1 | -1
    speed: number
  }
  const walkers: Walker[] = []
  const prototypes = people.map((gltf) => {
    gltf.scene.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(gltf.scene)
    const height = box.max.y - box.min.y
    return { gltf, scale: 1.72 / height }
  })
  for (let i = 0; i < WALKERS; i++) {
    const p = prototypes[i % prototypes.length]
    const root = SkeletonUtils.clone(p.gltf.scene)
    root.scale.setScalar(p.scale * (0.92 + hash(i + 0.3) * 0.14))
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = false
        o.frustumCulled = false
      }
    })
    const mixer = new THREE.AnimationMixer(root)
    const speed = WALK_SPEED * (0.85 + hash(i + 0.7) * 0.3)
    const action = mixer.clipAction(p.gltf.animations[0])
    action.timeScale = speed / WALK_SPEED
    action.time = hash(i + 0.9) * p.gltf.animations[0].duration
    action.play()
    const curb = hash(i + 0.1) < 0.4
    walkers.push({
      root,
      mixer,
      block: -1,
      // Metres out from the block's edge: by the shop fronts, or the curb.
      offset: curb ? streetHalf - roadwayHalf - 0.9 : 1.0,
      s: 0,
      dir: curb ? -1 : 1,
      speed,
    })
    root.visible = false
    group.add(root)
  }

  const perimeter = (b: (typeof blocks)[number], o: number) => 2 * (b.x1 - b.x0 + 2 * o) + 2 * (b.z1 - b.z0 + 2 * o)
  // Position and heading at distance `s` around block `b`, `o` metres out.
  const at = (b: (typeof blocks)[number], o: number, s: number, out: THREE.Vector3) => {
    const x0 = b.x0 - o
    const x1 = b.x1 + o
    const z0 = b.z0 - o
    const z1 = b.z1 + o
    const w = x1 - x0
    const d = z1 - z0
    s = ((s % (2 * (w + d))) + 2 * (w + d)) % (2 * (w + d))
    if (s < w) return out.set(x0 + s, 0, z0), Math.PI / 2
    s -= w
    if (s < d) return out.set(x1, 0, z0 + s), 0
    s -= d
    if (s < w) return out.set(x1 - s, 0, z1), -Math.PI / 2
    s -= w
    return out.set(x0, 0, z1 - s), Math.PI
  }
  const centre = (b: (typeof blocks)[number]) => [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2]
  // Blocks near (x, z), nearest first.
  const nearby = (x: number, z: number) =>
    blocks
      .map((b, i) => {
        const [cx, cz] = centre(b)
        return { i, d: Math.hypot(cx - x, cz - z) }
      })
      .filter((e) => e.d < WALK_RANGE)
      .sort((a, b) => a.d - b.d)

  const pos = new THREE.Vector3()
  let seed = 0
  return {
    group,
    // `show` is false when the camera is too high to see anyone.
    update(dt: number, camX: number, camZ: number, show: boolean) {
      group.visible = show
      if (!show) return
      let candidates: ReturnType<typeof nearby> | null = null
      for (const w of walkers) {
        const b = w.block >= 0 ? blocks[w.block] : null
        const far = !b || Math.hypot(centre(b)[0] - camX, centre(b)[1] - camZ) > WALK_RANGE * 1.3
        if (far) {
          candidates ??= nearby(camX, camZ)
          if (candidates.length === 0) {
            w.root.visible = false
            continue
          }
          const pick = candidates[Math.floor(hash(seed++) * candidates.length)]
          w.block = pick.i
          w.s = hash(seed++) * perimeter(blocks[w.block], w.offset)
        }
        const block = blocks[w.block]
        w.s += w.dir * w.speed * dt
        const heading = at(block, w.offset, w.s, pos)
        w.root.position.copy(pos)
        w.root.rotation.y = heading + (w.dir < 0 ? Math.PI : 0)
        w.root.visible = true
        w.mixer.update(dt)
      }
    },
  }
}
