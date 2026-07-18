import { Delaunay } from 'd3-delaunay'
import { geoBounds, geoCentroid, geoContains, geoDistance } from 'd3-geo'
import type { Topology } from '@con/engine'
import type { ProvinceFeature } from './geoData'

/**
 * The route network troops travel, in two realistic layers:
 *
 *  - LAND routes are the province borders — a planar web through the
 *    continents, never over water.
 *  - SEA routes are a mesh of WAYPOINT nodes dropped in the open water plus the
 *    coastal PORTS, wired peer-to-peer (a Delaunay web). Troops sail port →
 *    waypoint → waypoint → port along the water, not in straight inland lines
 *    flying over the ocean — like the source game's naval lanes.
 *
 * Ports are then linked to one another for the engine by walking the sea mesh
 * (through waypoints) up to a range, so province.neighbors/pathfinding stays
 * province-based while the drawn lanes go through the water nodes.
 */

const EARTH_KM = 6371
// Ocean waypoint field: sampled on a base grid, then thinned by distance to the
// nearest land so it's dense along coasts and sparse in the open ocean, and
// jittered so the mesh looks natural rather than gridded.
const GRID_STEP_DEG = 4
const GRID_LAT_MIN = -60
const GRID_LAT_MAX = 76
const NEAR_COAST_KM = 550 // full density inside this band
const MID_SEA_KM = 1400 // half density out to here, sparse beyond
const JITTER_FRAC = 0.45 // waypoint wobble, as a fraction of the grid step
// Mesh edge limits.
const MAX_LANE_KM = 2200 // longest single mesh edge (sparse open-ocean lanes)
const PORT_PORT_DIRECT_KM = 360 // ports may link directly only across a strait
const PORT_LINK_RANGE_KM = 3200 // how far a port reaches other ports through the mesh

/** Deterministic [0,1) hash so the jittered field is stable across reloads. */
function hash01(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

const km = (a: [number, number], b: [number, number]) => geoDistance(a, b) * EARTH_KM

export interface RouteGraph {
  adjacency: Record<string, string[]>
  landEdges: Array<[string, string]>
  /** All sea-mesh node positions [lon,lat]: ports first, then waypoints. */
  seaNodes: Array<[number, number]>
  /** Index where waypoints begin in seaNodes (earlier entries are ports). */
  waypointStart: number
  /** Sea-mesh edges as index pairs into seaNodes. */
  seaEdges: Array<[number, number]>
  /** Provinces that host a port. */
  portIds: Set<string>
}

function eachArcIndex(arcs: unknown, cb: (i: number) => void): void {
  if (typeof arcs === 'number') cb(arcs < 0 ? ~arcs : arcs)
  else if (Array.isArray(arcs)) for (const a of arcs) eachArcIndex(a, cb)
}

/** Coastal provinces: those owning a boundary arc shared with no other province. */
export function detectCoastal(topology: Topology, objectName: string): Set<string> {
  const geometries = (topology.objects[objectName] as { geometries: Array<{ id?: string | number; arcs?: unknown }> })
    .geometries
  const useCount = new Map<number, number>()
  for (const g of geometries) eachArcIndex(g.arcs, (i) => useCount.set(i, (useCount.get(i) ?? 0) + 1))
  const coastal = new Set<string>()
  for (const g of geometries) {
    if (g.id == null) continue
    let onCoast = false
    eachArcIndex(g.arcs, (i) => {
      if (useCount.get(i) === 1) onCoast = true
    })
    if (onCoast) coastal.add(String(g.id))
  }
  return coastal
}

export function buildRouteGraph(
  features: ProvinceFeature[],
  landAdjacency: Record<string, string[]>,
  coastal: Set<string>,
): RouteGraph {
  const ids = features.map((f) => f.id)

  const adj = new Map<string, Set<string>>()
  for (const id of ids) adj.set(id, new Set(landAdjacency[id] ?? []))

  // Land layer: the province borders (unique pairs).
  const landEdges: Array<[string, string]> = []
  const seenLand = new Set<string>()
  for (const [id, neighbors] of Object.entries(landAdjacency)) {
    for (const n of neighbors) {
      const key = id < n ? `${id}|${n}` : `${n}|${id}`
      if (seenLand.has(key)) continue
      seenLand.add(key)
      landEdges.push([id, n])
    }
  }

  // Water test (inside no province), with a bounding-box prefilter.
  const bounds = features.map((f) => geoBounds(f as never))
  const inWater = (lon: number, lat: number): boolean => {
    for (let i = 0; i < features.length; i++) {
      const b = bounds[i]
      if (lon < b[0][0] || lon > b[1][0] || lat < b[0][1] || lat > b[1][1]) continue
      if (geoContains(features[i] as never, [lon, lat])) return false
    }
    return true
  }

  // Classify a base grid into land and water cells.
  const landPts: Array<[number, number]> = []
  const waterCells: Array<{ lon: number; lat: number; gi: number; gj: number }> = []
  let gj = 0
  for (let lat = GRID_LAT_MIN; lat <= GRID_LAT_MAX; lat += GRID_STEP_DEG, gj++) {
    let gi = 0
    for (let lon = -180; lon < 180; lon += GRID_STEP_DEG, gi++) {
      if (inWater(lon, lat)) waterCells.push({ lon, lat, gi, gj })
      else landPts.push([lon, lat])
    }
  }

  // Keep each water cell at a spacing that grows with distance to the nearest
  // land (dense near coasts, sparse offshore), and jitter it for a natural web.
  const waypoints: Array<[number, number]> = []
  for (const cell of waterCells) {
    let coastKm = Infinity
    for (const lp of landPts) {
      const d = km([cell.lon, cell.lat], lp)
      if (d < coastKm) coastKm = d
    }
    const keepEvery = coastKm < NEAR_COAST_KM ? 1 : coastKm < MID_SEA_KM ? 2 : 3
    if (cell.gi % keepEvery !== 0 || cell.gj % keepEvery !== 0) continue
    const amp = GRID_STEP_DEG * JITTER_FRAC
    let jLon = cell.lon + (hash01(cell.lon, cell.lat) - 0.5) * 2 * amp
    let jLat = cell.lat + (hash01(cell.lat, cell.lon) - 0.5) * 2 * amp
    if (!inWater(jLon, jLat)) {
      jLon = cell.lon
      jLat = cell.lat
    }
    waypoints.push([jLon, jLat])
  }

  // Sea-mesh nodes: coastal ports first, then the ocean waypoints.
  const portList = ids.filter((id) => coastal.has(id))
  const portPoint = new Map(ids.map((id, i) => [id, geoCentroid(features[i] as never) as [number, number]]))
  const seaNodes: Array<[number, number]> = [
    ...portList.map((id) => portPoint.get(id)!),
    ...waypoints,
  ]
  const waypointStart = portList.length
  const isPortNode = (n: number) => n < waypointStart
  const portIdOf = (n: number) => portList[n]

  // Delaunay web over all sea nodes; drop long edges and long direct port↔port
  // links (those must route through waypoints instead).
  const meshAdj: Array<Set<number>> = seaNodes.map(() => new Set())
  const seaEdges: Array<[number, number]> = []
  const linkMesh = (u: number, v: number) => {
    const d = km(seaNodes[u], seaNodes[v])
    if (d > MAX_LANE_KM) return
    if (isPortNode(u) && isPortNode(v) && d > PORT_PORT_DIRECT_KM) return
    if (meshAdj[u].has(v)) return
    meshAdj[u].add(v)
    meshAdj[v].add(u)
    seaEdges.push([u, v])
  }
  if (seaNodes.length >= 3) {
    const delaunay = Delaunay.from(seaNodes)
    const { triangles } = delaunay
    for (let t = 0; t < triangles.length; t += 3) {
      const a = triangles[t]
      const b = triangles[t + 1]
      const c = triangles[t + 2]
      linkMesh(a, b)
      linkMesh(b, c)
      linkMesh(c, a)
    }
  }

  const portIds = new Set<string>()

  // Derive port↔port province adjacency by walking the mesh from each port
  // through waypoints (never through another port) up to a range; the first
  // ports reached become sea neighbours.
  const linkPorts = (a: string, b: string) => {
    if (a === b) return
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
    portIds.add(a)
    portIds.add(b)
  }
  for (let p = 0; p < waypointStart; p++) {
    const from = portIdOf(p)
    const dist = new Map<number, number>([[p, 0]])
    const queue: number[] = [p]
    while (queue.length) {
      const node = queue.shift()!
      const d0 = dist.get(node)!
      for (const nb of meshAdj[node]) {
        const nd = d0 + km(seaNodes[node], seaNodes[nb])
        if (nd > PORT_LINK_RANGE_KM) continue
        if (isPortNode(nb)) {
          // Reached another port — connect and don't expand past it.
          linkPorts(from, portIdOf(nb))
          continue
        }
        if ((dist.get(nb) ?? Infinity) <= nd) continue
        dist.set(nb, nd)
        queue.push(nb)
      }
    }
  }

  // Lifeline: never strand a province.
  const centroid = (i: number) => portPoint.get(ids[i])!
  for (let i = 0; i < ids.length; i++) {
    if (adj.get(ids[i])!.size > 0) continue
    let best = -1
    let bestKm = Infinity
    for (let j = 0; j < ids.length; j++) {
      if (i === j) continue
      const d = km(centroid(i), centroid(j))
      if (d < bestKm) {
        bestKm = d
        best = j
      }
    }
    if (best >= 0) {
      adj.get(ids[i])!.add(ids[best])
      adj.get(ids[best])!.add(ids[i])
      portIds.add(ids[i])
      portIds.add(ids[best])
    }
  }

  const adjacency: Record<string, string[]> = {}
  for (const id of ids) adjacency[id] = [...adj.get(id)!]
  return { adjacency, landEdges, seaNodes, waypointStart, seaEdges, portIds }
}
