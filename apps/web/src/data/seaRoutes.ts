import { geoCentroid, geoDistance } from 'd3-geo'
import type { ProvinceFeature } from './geoData'

/**
 * Land adjacency (shared TopoJSON borders) leaves 80 island provinces with no
 * links — unreachable, and no sea lanes for troops. This adds naval routes so
 * troops can cross water: every province gains a few short sea crossings to
 * nearby coasts, and any island still isolated is tied to its nearest neighbor.
 *
 * The links are merged into the province adjacency used by BOTH the engine
 * (province.neighbors → movement/pathfinding) and the map's route network, so
 * "troops can take water paths" holds end to end. `seaPairs` marks which links
 * are sea crossings so the map can draw them differently (dashed lanes).
 */

const EARTH_KM = 6371
const SEA_CROSSING_KM = 520 // short straits/channels between coastal provinces
const SEA_CROSSING_MAX = 3 // sea links added per province in the main pass
const ISLAND_LIFELINE_KM = 1700 // reach for connecting an otherwise-cut-off island

export interface SeaRouteResult {
  adjacency: Record<string, string[]>
  seaPairs: Set<string>
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export function buildSeaRoutes(
  features: ProvinceFeature[],
  base: Record<string, string[]>,
): SeaRouteResult {
  const ids = features.map((f) => f.id)
  const centroids = features.map((f) => geoCentroid(f as never) as [number, number])
  const adj = new Map<string, Set<string>>()
  for (const id of ids) adj.set(id, new Set(base[id] ?? []))

  const seaPairs = new Set<string>()
  const link = (i: number, j: number) => {
    adj.get(ids[i])!.add(ids[j])
    adj.get(ids[j])!.add(ids[i])
    seaPairs.add(pairKey(ids[i], ids[j]))
  }

  const kmBetween = (i: number, j: number) => geoDistance(centroids[i], centroids[j]) * EARTH_KM

  // Main pass: each province links to its few nearest non-neighbors within a
  // short crossing distance (Channel/Baltic/strait-scale), so coasts and small
  // archipelagos connect without transoceanic hops.
  for (let i = 0; i < features.length; i++) {
    const near: Array<[number, number]> = []
    for (let j = 0; j < features.length; j++) {
      if (i === j || adj.get(ids[i])!.has(ids[j])) continue
      const km = kmBetween(i, j)
      if (km <= SEA_CROSSING_KM) near.push([km, j])
    }
    near.sort((a, b) => a[0] - b[0])
    for (const [, j] of near.slice(0, SEA_CROSSING_MAX)) link(i, j)
  }

  // Lifeline pass: any province still cut off gets tied to its single nearest
  // neighbor (up to a generous reach) so no island is ever unreachable.
  for (let i = 0; i < features.length; i++) {
    if (adj.get(ids[i])!.size > 0) continue
    let best = -1
    let bestKm = Infinity
    for (let j = 0; j < features.length; j++) {
      if (i === j) continue
      const km = kmBetween(i, j)
      if (km < bestKm) {
        bestKm = km
        best = j
      }
    }
    if (best >= 0 && bestKm <= ISLAND_LIFELINE_KM) link(i, best)
  }

  const adjacency: Record<string, string[]> = {}
  for (const id of ids) adjacency[id] = [...adj.get(id)!]
  return { adjacency, seaPairs }
}
