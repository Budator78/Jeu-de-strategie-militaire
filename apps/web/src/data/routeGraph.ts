import { Delaunay } from 'd3-delaunay'
import { geoCentroid, geoDistance } from 'd3-geo'
import type { Topology } from '@con/engine'
import type { ProvinceFeature } from './geoData'

/**
 * The route network troops travel, split into two layers so sea travel is
 * realistic:
 *
 *  - LAND routes are the province land borders (a clean, planar web through
 *    the continents — never over water).
 *  - SEA routes are maritime lanes between PORTS. Ports sit on coastal
 *    provinces (real coastlines, detected from the map's un-shared boundary
 *    arcs). Lanes link each port to nearby ports across the water (a Delaunay
 *    web of the coasts), so troops sail port-to-port instead of flying over
 *    open sea in straight inland-to-inland lines.
 *
 * The merged graph feeds the engine (province.neighbors → movement/pathfinding)
 * and the drawn map; a lifeline keeps every island port reachable.
 */

const EARTH_KM = 6371
const MAX_SEA_LANE_KM = 1300 // longest maritime lane between two ports

export interface RouteGraph {
  adjacency: Record<string, string[]>
  landEdges: Array<[string, string]>
  seaEdges: Array<[string, string]>
  /** Provinces that host a port (coastal, with at least one sea lane). */
  portIds: Set<string>
}

/** Recurse a TopoJSON geometry's arc structure, yielding each arc's index. */
function eachArcIndex(arcs: unknown, cb: (i: number) => void): void {
  if (typeof arcs === 'number') {
    cb(arcs < 0 ? ~arcs : arcs)
  } else if (Array.isArray(arcs)) {
    for (const a of arcs) eachArcIndex(a, cb)
  }
}

/** Coastal provinces: those owning a boundary arc shared with no other province. */
export function detectCoastal(topology: Topology, objectName: string): Set<string> {
  const geometries = (topology.objects[objectName] as { geometries: Array<{ id?: string | number; arcs?: unknown }> })
    .geometries
  const useCount = new Map<number, number>()
  for (const g of geometries) {
    eachArcIndex(g.arcs, (i) => useCount.set(i, (useCount.get(i) ?? 0) + 1))
  }
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
  const indexOf = new Map(ids.map((id, i) => [id, i]))
  const points = features.map((f) => geoCentroid(f as never) as [number, number])
  const kmBetween = (a: number, b: number) => geoDistance(points[a], points[b]) * EARTH_KM

  const adj = new Map<string, Set<string>>()
  for (const id of ids) adj.set(id, new Set(landAdjacency[id] ?? []))

  // Land layer: the province borders themselves (dedup to unique pairs).
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

  // Sea layer: Delaunay web over the coastal provinces only, keeping the
  // cross-water lanes (pairs that aren't already land neighbours).
  const coastList = ids.filter((id) => coastal.has(id))
  const seaEdges: Array<[string, string]> = []
  const portIds = new Set<string>()
  const addSea = (a: number, b: number) => {
    if (kmBetween(a, b) > MAX_SEA_LANE_KM) return
    if (adj.get(ids[a])!.has(ids[b])) return // already a land border
    adj.get(ids[a])!.add(ids[b])
    adj.get(ids[b])!.add(ids[a])
    seaEdges.push([ids[a], ids[b]])
    portIds.add(ids[a])
    portIds.add(ids[b])
  }
  if (coastList.length >= 3) {
    const coastPoints = coastList.map((id) => points[indexOf.get(id)!])
    const delaunay = Delaunay.from(coastPoints)
    const { triangles } = delaunay
    const localToGlobal = (local: number) => indexOf.get(coastList[local])!
    for (let t = 0; t < triangles.length; t += 3) {
      const a = localToGlobal(triangles[t])
      const b = localToGlobal(triangles[t + 1])
      const c = localToGlobal(triangles[t + 2])
      addSea(a, b)
      addSea(b, c)
      addSea(c, a)
    }
  }

  // Lifeline: never strand a province — tie any isolated one to its nearest.
  for (let i = 0; i < ids.length; i++) {
    if (adj.get(ids[i])!.size > 0) continue
    let best = -1
    let bestKm = Infinity
    for (let j = 0; j < ids.length; j++) {
      if (i === j) continue
      const km = kmBetween(i, j)
      if (km < bestKm) {
        bestKm = km
        best = j
      }
    }
    if (best >= 0) {
      adj.get(ids[i])!.add(ids[best])
      adj.get(ids[best])!.add(ids[i])
      seaEdges.push([ids[i], ids[best]])
      portIds.add(ids[i])
      portIds.add(ids[best])
    }
  }

  const adjacency: Record<string, string[]> = {}
  for (const id of ids) adjacency[id] = [...adj.get(id)!]
  return { adjacency, landEdges, seaEdges, portIds }
}
